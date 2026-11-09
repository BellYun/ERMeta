import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { buildActionCatalogue } from "./lib/pool-action-analysis.mjs";
import {
  analyzePoolTeamContext,
  buildContextObservationIndex,
  contrastTeamContexts,
} from "./lib/pool-team-context.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (
    !args[i + 1] ||
    flags.has(args[i]) ||
    !["--pool", "--pairs", "--output", "--markdown"].includes(args[i])
  )
    throw new Error(
      "Usage: node scripts/analyze-pool-contexts.mjs --pool C:W,C:W --pairs C:W+C:W,C:W+C:W --output FILE [--markdown FILE]"
    );
  flags.set(args[i], args[i + 1]);
}
if (!["--pool", "--pairs", "--output"].every((key) => flags.has(key)))
  throw new Error("--pool, --pairs and --output are required");
const inputs = new Map();
function read(path) {
  const data = readFileSync(resolve(root, path));
  inputs.set(path, createHash("sha256").update(data).digest("hex"));
  return data;
}
const l10n = JSON.parse(read("public/l10n/Korean.json"));
const model = JSON.parse(read("data/pool-recommendations/action-model.v1.json"));
const scenarioData = JSON.parse(read("data/pool-recommendations/action-scenarios.v1.json"));
const ruleData = JSON.parse(read("data/pool-recommendations/team-context-rules.v1.json"));
if (scenarioData.version !== 1 || ruleData.version !== 1)
  throw new Error("Unsupported input format");
const choices = JSON.parse(read("const/characterBestWeapons.json"));
const profileKeys = Object.entries(choices).flatMap(([code, weapons]) =>
  weapons.map((w) => `${code}:${w.weaponCode}`)
);
const catalogue = buildActionCatalogue({ profileKeys, l10n, model });
const sourcePath = "data/pool-recommendations/exact-trios.v1.json.gz";
const source = JSON.parse(gunzipSync(read(sourcePath)));
if (source.version !== 1 || source.columns.join(",") !== "key,games,wins,rankSum,rp")
  throw new Error("Unsupported pooled source format");
const rows = source.rows.map(([key, games, wins, rankSum, rp]) => ({
  key,
  games,
  wins,
  rankSum,
  rp,
}));
const observationIndex = buildContextObservationIndex(rows);
const pool = flags.get("--pool").split(",");
const pairs = flags
  .get("--pairs")
  .split(",")
  .map((pair) => pair.split("+"));
const contexts = pairs.map((allies) =>
  analyzePoolTeamContext({
    pool,
    allies,
    catalogue,
    scenarios: scenarioData.scenarios,
    rules: ruleData.rules,
    observationIndex,
  })
);
const contrasts = contrastTeamContexts(contexts);
for (const path of [
  "scripts/analyze-pool-contexts.mjs",
  "scripts/lib/pool-team-context.mjs",
  "scripts/lib/pool-action-analysis.mjs",
])
  read(path);
const report = {
  version: 1,
  status: "assistant-proposed",
  provenance: {
    generatedAt: new Date().toISOString(),
    inputSha256: Object.fromEntries(inputs),
    performanceSource: sourcePath,
    sourceSnapshot: source.source,
    sourceRefreshedAt: source.sourceRefreshedAt,
    observedTrios: rows.length,
    observedPairs: observationIndex.size,
    sourceAuditedProfiles: catalogue.filter((p) => p.auditedScopes.length).map((p) => p.member),
    totalProfiles: catalogue.length,
  },
  contexts,
  contrasts,
  limitations: [
    "스킬 문구에서 확인한 행동과 조건으로 가능한 교전 선택지를 제안한다. 실제 역할 배정·사용 순서·생존 시간·승리 원인은 관찰하지 않았다.",
    "두 동료의 행동 연결이 성립하더라도 그 기능이 반드시 필요하거나 기존 픽풀이 약하다는 뜻은 아니다.",
    "조건부 구도를 먼저 계산한 뒤 성적을 붙인다. 성적에 맞춰 필요 역할을 역산하지 않는다.",
    "모든 관찰 대안을 남기며 시즌·티어·판수·기존 유형으로 제외하지 않는다. 원시 평균 RP는 rp / games이다.",
    "12.3 이하 순 RP와 12.4 이상 경기 중 획득 RP가 통합되어 있어 전체 기간의 실제 순 획득량으로 해석하지 않는다.",
    "저장된 스킬 문구와 과거 통합 집계의 시점은 다를 수 있다. 이 문구로 모든 과거 경기의 스킬 상태를 재현하지 못한다.",
    "스킬 문구 변경 시 해당 행동과 부재 판단을 무효화한다. 새 스킬 원문을 수집하는 작업 자체는 이 명령에 포함하지 않는다.",
    "미검토 후보는 약하다는 뜻이 아니다. 이 결과는 전체 후보 중 최적 순위를 정하지 않으며 기존 추천 UI에 연결되지 않는다.",
  ],
};
function write(path, text) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  return target;
}
const output = write(flags.get("--output"), JSON.stringify(report, null, 2) + "\n");

function memberLabel(member) {
  const [c, w] = member.split(":");
  const weapon = choices[c]?.find((choice) => choice.weaponCode === Number(w));
  return `${l10n[`Character/Name/${c}`] ?? c} ${weapon?.label ?? w}`;
}
function metricCells(m) {
  return m
    ? `${m.wins}/${m.games} | ${(100 * m.winRate).toFixed(1)}% | ${m.averageRank.toFixed(2)} | ${m.averageRP.toFixed(2)}`
    : "미관측 | — | — | —";
}
const observationLabels = {
  "ahead-of-every-pool-pick": "선택 가능한 기존 픽 모두보다 세 지표가 좋음",
  "beaten-by-pool-pick": "세 지표가 모두 더 좋은 기존 픽이 있음",
  "mixed-or-equal": "지표의 우열이 섞이거나 동률",
  incomplete: "비교에 필요한 관측이 일부 없음",
  "no-selectable-pick": "동료와 실험체가 겹쳐 기존 픽을 선택할 수 없음",
};
const lines = [
  "# 픽풀 보완: 동료의 행동에서 교전 선택지 도출",
  "",
  `- 기존 픽풀: ${pool.map(memberLabel).join(" · ")}`,
  `- 성적: 전체 기간 통합 ${rows.length.toLocaleString("en-US")}개 조합. 집계 기준 ${source.sourceRefreshedAt}.`,
  `- 행동 자료: ${catalogue.length}개 무기 프로필 중 ${report.provenance.sourceAuditedProfiles.length}개의 지정 범위를 원문과 대조. 나머지는 미검토.`,
  "- 상태: 제안한 교전 해석. 필수 역할과 추천 순위를 확정한 결과가 아님.",
  "",
];
for (const context of contexts) {
  lines.push(`## ${context.allies.map(memberLabel).join(" + ")}`, "");
  for (const option of context.inferred) {
    lines.push(option.explanation, "");
    if (option.status !== "conditional-play-option") continue;
    lines.push("성립 조건:", "", ...option.assumptions.map((s) => `- ${s}`), "");
    for (const assignment of option.assignments) {
      for (const actor of assignment) {
        lines.push(
          `- ${memberLabel(actor.member)}: ${actor.routes.map((r) => r.label).join(" · ")} (${actor.routes.flatMap((r) => r.sources.map((s) => s.key)).join(", ")})`
        );
      }
    }
    lines.push("", option.boundary, "");
  }
  lines.push("동료의 즉시 투사체 대응:", "");
  const projectileGuard = context.allyResponses.find((a) => a.scenario === "guard-projectiles");
  const guards = projectileGuard.responses.filter((r) =>
    ["available", "conditional"].includes(r.status)
  );
  if (guards.length) {
    for (const guard of guards) {
      lines.push(
        `- ${memberLabel(guard.member)}: ${guard.routes.map((r) => r.label).join(" · ")}. 조건: ${guard.routes.flatMap((r) => r.requiredConditions.map((c) => c.explanation)).join(" / ")}.`
      );
    }
    lines.push(
      "- 세 번째 픽을 바꾸어도 동료의 이 수단은 남습니다. 실제 교전에서 사용할 수 있는 위치·형태·쿨다운은 별도 조건입니다.",
      ""
    );
  } else {
    lines.push(
      projectileGuard.responses.every((r) => r.status === "gap")
        ? "- 검토한 범위에서 두 동료 모두 이 조건의 대응 수단은 없습니다. 투사체 위협의 중요도에 따라 세 번째 픽의 해당 기능을 따로 비교해야 합니다."
        : "- 동료의 이 대응 여부를 확정하지 못했습니다.",
      ""
    );
  }
  if (!context.candidates.length)
    lines.push("원문 검토 범위에서 새 선택지 후보를 확정하지 못했습니다.", "");
  for (const candidate of context.candidates) {
    lines.push(`### ${candidate.members.map(memberLabel).join(" / ")}를 추가하면`, "");
    for (const addition of candidate.additions) lines.push(addition.explanation, "");
    for (const tradeoff of candidate.tradeoffs)
      lines.push(`- ${tradeoff.explanation} ${tradeoff.limitation}`);
    const losses = candidate.tradeoffs.flatMap((t) =>
      t.teamResponseChanges.flatMap((r) =>
        r.changes
          .filter((c) => c.delta === "lost-conditional-option")
          .map((change) => ({ existing: t.member, candidate: r.candidate, change }))
      )
    );
    if (losses.length) {
      lines.push("", "교체하면 잃는 조건부 대응:", "");
      for (const loss of losses) {
        lines.push(
          `- **${memberLabel(loss.existing)} → ${memberLabel(loss.candidate)}**: ‘${loss.change.label}’ 수단을 잃습니다. 기존 수단: ${loss.change.existingResponse.routes.map((r) => r.label).join(" · ")}.`
        );
        for (const method of loss.change.candidateRelatedMethods)
          lines.push(
            `  - ${method.label}: ${method.limitations.join(" ")} (${method.sources.map((s) => s.key).join(", ")})`
          );
      }
      lines.push(
        "",
        "그 위협이 실제로 중요한 상황에서의 비용입니다. 이 차이가 통합 성적의 원인이라는 뜻은 아닙니다.",
        ""
      );
    }
    lines.push("", "후속 제어의 조건:", "");
    for (const tradeoff of candidate.tradeoffs.slice(0, 1)) {
      for (const route of tradeoff.candidateAlternative.routes) {
        lines.push(
          ...route.requiredConditions.map((c) => `- ${c.explanation}`),
          ...route.limitations.map((s) => `- ${s}`)
        );
      }
    }
    lines.push("", "동료 제어와의 스킬 연결:", "");
    for (const link of candidate.sharedControlLinks)
      lines.push(`- ${link.explanation} 이 연결은 이 동료 조합만의 장점이 아닙니다.`);
    lines.push(
      "",
      "관찰 성적:",
      "",
      "| 세 번째 픽 | 승/판 | 승률 | 평균 순위 | 원시 평균 RP |",
      "| --- | ---: | ---: | ---: | ---: |"
    );
    for (const observation of candidate.observations) {
      lines.push(
        `| ${memberLabel(observation.candidate.member)} | ${metricCells(observation.candidate.metrics)} |`
      );
      for (const row of observation.comparisons)
        lines.push(`| ${memberLabel(row.member)} | ${metricCells(row.metrics)} |`);
      lines.push(
        "",
        `관찰 방향: **${observationLabels[observation.status]}**. 고정한 두 동료의 관측 후보 ${observation.observedThirds}개 전체는 JSON에 포함합니다.`,
        ""
      );
    }
    lines.push(
      "스킬 연결이 가능하다는 설명은 관찰 성적 차이의 원인이나 확정 추천을 뜻하지 않습니다.",
      ""
    );
  }
}
lines.push("## 비교에서 남긴 판단", "");
if (!contrasts.length)
  lines.push(
    "현재 비교에서 같은 행동 연결과 반대 성적 방향의 사례가 함께 확인되지는 않았습니다. 추천 확정을 뜻하지 않습니다.",
    ""
  );
for (const contrast of contrasts) lines.push(contrast.explanation, "");
for (const contrast of contrasts) {
  for (const context of contrast.contexts) {
    for (const loss of context.lostOptionsByExistingPick) {
      lines.push(
        `- ${context.pair.split("+").map(memberLabel).join(" + ")}: ${memberLabel(loss.existing)} 대신 ${memberLabel(context.candidate)}를 고르면 ‘${loss.label}’ 선택지가 줄어듭니다. 이 비용은 해당 위협이 있을 때 고려하며, 성적 차이의 원인은 아직 확정하지 못했습니다.`
      );
    }
  }
}
if (contrasts.length) lines.push("");
lines.push(
  "## 자동으로 반복하는 작업",
  "",
  "1. 저장된 스킬 원문과 검토 모델을 대조하고 변경된 행동을 무효화합니다.",
  "2. 다른 두 동료의 행동이 연결되는 구도를 찾고 성립 조건을 남깁니다.",
  "3. 실제로 선택할 수 있는 기존 픽을 하나씩 비교하고 새 후보의 추가 수단·제약을 서술합니다.",
  "4. 전체 기간 통합 성적과 모든 동료 대안을 붙이고, 같은 설명이 반대 성적에도 적용되면 일괄 추천을 보류합니다.",
  "",
  "## 한계",
  "",
  ...report.limitations.map((s) => `- ${s}`),
  ""
);
const markdown = flags.has("--markdown") ? write(flags.get("--markdown"), lines.join("\n")) : null;
process.stdout.write(
  JSON.stringify({
    output,
    markdown,
    contexts: contexts.map((c) => ({
      pair: c.pair,
      eligiblePool: c.eligiblePool,
      playOptions: c.options.map((o) => o.rule),
      candidates: c.candidates.flatMap((candidate) =>
        candidate.observations.map((o) => ({ member: o.candidate.member, status: o.status }))
      ),
      observedThirds: c.observedAlternatives.length,
    })),
    contrasts: contrasts.length,
  }) + "\n"
);
