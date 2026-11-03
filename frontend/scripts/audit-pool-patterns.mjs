import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  auditPoolPatterns,
  inspectPoolPattern,
  rankPoolPatternLeads,
} from "./lib/pool-pattern-audit.mjs";
import { indexPoolObservations } from "./lib/pool-tendency-analysis.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (!args[i + 1] || flags.has(args[i]) || !["--pool", "--output"].includes(args[i]))
    throw new Error(
      "Usage: node scripts/audit-pool-patterns.mjs --pool C:W,C:W --output PATH_PREFIX"
    );
  flags.set(args[i], args[i + 1]);
}
if (!flags.has("--pool") || !flags.has("--output"))
  throw new Error("--pool and --output are required");
const inputs = new Map();
function read(path) {
  const data = readFileSync(resolve(root, path));
  inputs.set(path, createHash("sha256").update(data).digest("hex"));
  return data;
}
const sourcePath = "data/pool-recommendations/exact-trios.v1.json.gz";
const source = JSON.parse(gunzipSync(read(sourcePath)));
if (source.version !== 1 || source.columns.join(",") !== "key,games,wins,rankSum,rp")
  throw new Error("Unsupported source format");
const rows = source.rows.map(([key, games, wins, rankSum, rp]) => ({
  key,
  games,
  wins,
  rankSum,
  rp,
}));
const pairs = indexPoolObservations(rows);
const annotations = new Map();
for (const slug of ["tanks", "warriors", "assassins", "skilldealers", "rangers", "supports"]) {
  const data = JSON.parse(read(`public/data/lab/${slug}.json`));
  for (const c of data.characters) {
    const member = `${c.characterCode}:${c.weapon}`;
    if (annotations.has(member)) throw new Error(`Duplicate annotation: ${member}`);
    annotations.set(member, {
      role: data.role,
      fitRole: c.classification?.fitRole ?? "유형 미등록",
    });
  }
}
const l10n = JSON.parse(read("public/l10n/Korean.json"));
const choices = JSON.parse(read("const/characterBestWeapons.json"));
const weaponSource = read("src/lib/weaponMap.ts").toString("utf8");
const weaponBlock = weaponSource
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
if (!weaponBlock) throw new Error("Weapon map format changed");
const weaponEnums = Object.fromEntries(
  [...weaponBlock.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);
const pool = flags.get("--pool").split(",");
const audit = auditPoolPatterns({ pairs, pool, annotations });
const groupIndex = new Map(audit.groups.map((g, i) => [g.id, i]));
const candidateIndex = new Map(audit.candidates.map((c, i) => [c, i]));
const levels = ["roles", "fitRoles", "allyFitRole", "allyExact", "anchorFitRole"];
const leads = Object.fromEntries(
  levels.map((level) => [level, rankPoolPatternLeads(audit, level).slice(0, 12)])
);
const displayed = new Map(
  Object.values(leads)
    .flat()
    .map((r) => [`${r.candidate}|${r.group}`, r])
);
const leadInspections = [...displayed.values()].map((r) =>
  inspectPoolPattern({ audit, candidate: r.candidate, groupId: r.group, pairs })
);
for (const path of [
  "scripts/audit-pool-patterns.mjs",
  "scripts/lib/pool-pattern-audit.mjs",
  "scripts/lib/pool-tendency-analysis.mjs",
  "src/lib/poolPlaystylePreference.mjs",
])
  read(path);
const provenance = {
  generatedAt: new Date().toISOString(),
  source: sourcePath,
  sourceRefreshedAt: source.sourceRefreshedAt,
  sourceRows: rows.length,
  pairs: pairs.size,
  inputSha256: Object.fromEntries(inputs),
};
const report = {
  version: 1,
  status: "exploratory-observational-patterns",
  method: audit.method,
  provenance,
  pool,
  playstylePreference: audit.playstylePreference,
  candidatePlaystyleMatches: audit.candidatePlaystyleMatches,
  statusLegend: audit.statusLegend,
  groups: audit.groups,
  contexts: audit.contexts,
  candidates: audit.candidates,
  statusByCandidate: audit.statusByCandidate,
  matrixColumns: [
    "candidateIndex",
    "groupIndex",
    "A",
    "B",
    "M",
    "U",
    "X",
    "N",
    "expectedBetterAtGlobalRates",
  ],
  matrixRows: audit.matrix.map((r) => [
    candidateIndex.get(r.candidate),
    groupIndex.get(r.group),
    r.counts.A,
    r.counts.B,
    r.counts.M,
    r.counts.U,
    r.counts.X,
    r.counts.N,
    r.expectedBetterAtGlobalRates,
  ]),
  interpretation: [
    "Each exact allied pair is counted once regardless of games. All observed sample sizes, seasons and tiers remain. Small samples are not thereby reliable.",
    "A compares the candidate with every selectable existing pick on raw win rate, mean rank and mean RP. B means an existing pick dominates the candidate. U is missing observation, X an occupied character, N no selectable pick. They are not failures.",
    "Grouping uses historical role labels only as exploratory annotations. Exact-ally subdivisions are generated for every ally rather than selecting a favorable character by hand.",
    "Displayed leads prioritize candidates with an observed addition, then the dominant playstyle of the current pool. Within the same playstyle priority, extra A contexts above the candidate's own global rate determine search order, separately for the number of selectable pool picks. All raw comparisons remain unchanged; this is not a significance test or final recommendation ranking.",
    "Groups overlap and must not be added together. Same-data discovery and comparison are not out-of-sample validation. A recurring observation does not establish a skill-interaction cause.",
    "Raw RP mixes net RP through 12.3 and in-match earned RP from 12.4. No relative RP adjustment is required or applied.",
  ],
};
const output = resolve(root, flags.get("--output"));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(`${output}.json.gz`, gzipSync(JSON.stringify(report)));
writeFileSync(
  `${output}.leads.json`,
  JSON.stringify(
    {
      provenance,
      playstylePreference: audit.playstylePreference,
      candidatePlaystyleMatches: audit.candidatePlaystyleMatches,
      leads,
    },
    null,
    2
  ) + "\n"
);
writeFileSync(
  `${output}.lead-inspections.json.gz`,
  gzipSync(JSON.stringify({ provenance, results: leadInspections }))
);
function memberName(member) {
  const [c, w] = member.split(":");
  const weapon =
    choices[c]?.find((v) => v.weaponCode === Number(w))?.label ??
    l10n[`WeaponType/${weaponEnums[w]}`] ??
    w;
  return `${l10n[`Character/Name/${c}`] ?? c} ${weapon}`;
}
function groupName(group) {
  const descriptor = audit.groups[groupIndex.get(group)];
  return descriptor.anchor
    ? descriptor.label.replace(descriptor.anchor, memberName(descriptor.anchor))
    : descriptor.label;
}
const lines = [
  "# 픽풀 전체 경향 탐색",
  "",
  `- 픽풀: ${pool.map(memberName).join(" · ")}`,
  `- 우선 추천 성향: ${audit.playstylePreference.preferred.map((key) => ({ melee: "근거리 딜러(전사·암살자)", tank: "탱커", marksman: "원거리 딜러", caster: "스킬딜러", support: "지원가" })[key]).join(" · ") || "자료 부족으로 미확정"}. 보완 효과가 관찰된 후보 중 같은 성향을 먼저 표시합니다.`,
  `- 전체 기간 통합 조합 ${rows.length.toLocaleString("en-US")}개, 고정 동료쌍 ${pairs.size.toLocaleString("en-US")}개, 새 실험체 무기 후보 ${audit.candidates.length}개를 대조했습니다.`,
  `- 기존 역할·유형 주석과 모든 동료의 세부 묶음 ${audit.groups.length.toLocaleString("en-US")}개를 생성했습니다.`,
  "- 우세는 승률·평균 순위·원시 평균 RP 세 지표에서 선택 가능한 기존 픽 각각을 비교한 결과입니다. 판수를 승률처럼 세거나 실험체별 승률로 합산한 표가 아닙니다.",
  "- 아래 표는 추가 검토할 경향 후보입니다. 확정 추천이나 전술 원인의 검증을 뜻하지 않습니다.",
  "",
];
const headings = {
  roles: "동료 역할 묶음",
  fitRoles: "동료 유형 묶음",
  allyFitRole: "한 동료의 유형",
  allyExact: "한 동료의 정확한 실험체·무기",
  anchorFitRole: "정확한 동료 + 다른 동료 유형",
};
for (const level of levels) {
  lines.push(
    `## ${headings[level]}`,
    "",
    "| 후보 | 동료 묶음 | 비교 쌍 | 모두보다 우세 | 기존 픽에 밀림 | 혼재 | 미관측 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |"
  );
  for (const row of leads[level])
    lines.push(
      `| ${memberName(row.candidate)} | ${groupName(row.group)} | ${row.known} | ${row.counts.A} | ${row.counts.B} | ${row.counts.M} | ${row.counts.U} |`
    );
  lines.push("");
}
lines.push(
  "## 읽을 때 주의할 점",
  "",
  "- 현재 픽풀의 주된 성향을 먼저 맞춥니다. 근딜 위주 픽풀은 전사·암살자 후보 안에서 보완 효과가 있는 선택지를 우선 검토합니다.",
  "- 후보 전체가 강해서 나타난 결과와 특정 동료 묶음에서 더 자주 좋아지는 결과를 구분하기 위해 후보 자신의 전체 경향을 함께 비교합니다.",
  "- 동료가 기존 픽풀의 실험체를 사용하면 선택 가능한 내 픽 수가 줄어듭니다. 탐색 순서 계산에서는 이 수가 같은 경우끼리 비교합니다.",
  "- 작은 표본도 모두 남깁니다. 다음 검토에서는 우세·열세 사례의 실제 판수와 특정 동료 하나에 편중되는지를 확인합니다.",
  "- 같은 자료에서 많은 묶음을 탐색했으므로 차이가 보인다는 것만으로 확정 패턴이라고 선언하지 않습니다.",
  "- 전체 비교와 모든 예외는 JSON 압축본에 남습니다. 표는 각 단계의 상위 12개 탐색 결과만 표시합니다.",
  ""
);
writeFileSync(`${output}.md`, lines.join("\n"));
process.stdout.write(
  JSON.stringify({
    output,
    candidates: audit.candidates.length,
    groups: audit.groups.length,
    comparisons: audit.matrix.length,
    leads: Object.fromEntries(
      levels.map((level) => [
        level,
        leads[level].slice(0, 3).map((r) => ({
          candidate: memberName(r.candidate),
          group: groupName(r.group),
          known: r.known,
          better: r.counts.A,
          beaten: r.counts.B,
          mixed: r.counts.M,
        })),
      ])
    ),
  }) + "\n"
);
