import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(
  FRONTEND_DIR,
  "public/data/lab/entry-sample-confidence"
);
const SNAPSHOT_ID = "season10-11-exact-two-partner-affinity-v1";
const SNAPSHOT_DIR = path.join(
  FRONTEND_DIR,
  "analysis-snapshots/composition-affinity",
  SNAPSHOT_ID
);
const SOURCES = {
  groups: path.join(SOURCE_DIR, "composition-affinity-character-groups.json"),
  contexts: path.join(
    SOURCE_DIR,
    "exact-two-partner-character-contexts.ndjson"
  ),
};

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function formatMember(member) {
  return `${member.characterName}(${member.weaponName})`;
}

if (fs.existsSync(SNAPSHOT_DIR)) {
  throw new Error(
    `고정 스냅샷이 이미 존재합니다: ${SNAPSHOT_DIR}\n` +
      "기존 결과를 덮어쓰지 않습니다. 새 버전 ID를 만들어 주세요."
  );
}

for (const sourcePath of Object.values(SOURCES)) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`스냅샷 원본이 없습니다: ${sourcePath}`);
  }
}

const data = JSON.parse(fs.readFileSync(SOURCES.groups, "utf8"));
if (data.contextUnit !== "exact-two-partner-first-order-types") {
  throw new Error(`예상하지 않은 검증 단위입니다: ${data.contextUnit}`);
}
if (!data.roles.every((role) => role.converged)) {
  throw new Error("수렴하지 않은 역할군이 있어 고정하지 않습니다.");
}

fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
const groupsTarget = path.join(SNAPSHOT_DIR, "groups.json");
const contextsTarget = path.join(SNAPSHOT_DIR, "exact-two-partner-contexts.ndjson");
fs.copyFileSync(SOURCES.groups, groupsTarget, fs.constants.COPYFILE_EXCL);
fs.copyFileSync(SOURCES.contexts, contextsTarget, fs.constants.COPYFILE_EXCL);

const manifest = {
  snapshotId: SNAPSHOT_ID,
  frozenAt: new Date().toISOString(),
  mutableSourceFiles: {
    groups: path.relative(FRONTEND_DIR, SOURCES.groups),
    contexts: path.relative(FRONTEND_DIR, SOURCES.contexts),
  },
  frozenFiles: {
    groups: {
      path: "groups.json",
      bytes: fs.statSync(groupsTarget).size,
      sha256: sha256(groupsTarget),
    },
    contexts: {
      path: "exact-two-partner-contexts.ndjson",
      bytes: fs.statSync(contextsTarget).size,
      sha256: sha256(contextsTarget),
    },
  },
  method: data.method,
  sourceMetric: data.sourceMetric,
  seasons: data.seasons,
  contextUnit: data.contextUnit,
  contextMinGames: data.contextMinGames,
  similarity: data.similarity,
  roles: data.roles,
};
fs.writeFileSync(
  path.join(SNAPSHOT_DIR, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" }
);

const sections = data.roles.map((roleSummary) => {
  const groups = data.groups.filter(
    (group) => group.role === roleSummary.role && group.kind === "core"
  );
  const lines = groups.length
    ? groups.map(
        (group) =>
          `- **${group.label}** — ${group.primaryMembers
            .map(formatMember)
            .join(", ")} · 평균 ${Math.round((group.cohesion ?? 0) * 1000) / 10}% · 최저 ${Math.round((group.minimumSimilarity ?? 0) * 1000) / 10}% · ${group.seasonConsistency}`
      )
    : ["- 핵심군 없음 — 모든 프로필 독립형 유지"];
  return `## ${roleSummary.role}\n\n- 프로필 ${roleSummary.profiles}개\n- 유사도 경계 ${Math.round(roleSummary.threshold * 1000) / 10}%\n- 최소 공통 정확 조합 ${roleSummary.minimumSharedContexts}개\n- 핵심군 ${roleSummary.coreGroups}개 · 독립형 ${roleSummary.independentProfiles}개\n- 반복 ${roleSummary.iterations}회 · 격리 ${roleSummary.isolatedProfiles} · 이동 ${roleSummary.relocatedProfiles} · ${roleSummary.converged ? "수렴" : "미수렴"}\n\n${lines.join("\n")}`;
});

const readme = `# 시즌 10·11 정확한 동료 2인 조합 성향군 — 고정본 v1

이 디렉터리는 사용자 화면용 데이터와 분리한 **불변 분석 스냅샷**입니다. 일반 데이터 생성 스크립트는 이 파일을 덮어쓰지 않습니다.

## 검증 단위

각 대상 캐릭터에 대해 아래 전체 키를 하나의 문맥으로 사용했습니다.

\`역할 조합 / 대상 직업 관점 / 동료 내부 역할군 A × 동료 내부 역할군 B\`

- 한 동료만 같은 경우는 동일 문맥으로 처리하지 않음
- 캐릭터별 정확한 2인 문맥 ${data.contextMinGames}판 이상
- 입장료 보정과 판수 신뢰 보정 적용
- 유사도: 방향 ${data.similarity.directionWeight * 100}% + 상승폭 크기 ${data.similarity.magnitudeWeight * 100}% + 정확 문맥 중첩 ${data.similarity.overlapWeight * 100}%
- 직업별 유사도 분포 상위 ${Math.round((1 - data.similarity.rolePercentile) * 1000) / 10}% 경계
- 다른 그룹 이동은 현재 그룹 대비 ${(data.similarity.relocationMargin * 100).toFixed(1)}%p 이상 개선될 때만 허용
- 소속이 연속 2회 동일할 때 수렴

## 파일

- \`groups.json\`: 최종 역할군, 주·보조 소속, 대표 정확 조합, 시즌 근거
- \`exact-two-partner-contexts.ndjson\`: 114개 캐릭터·무기 프로필별 정확한 동료 2인 문맥 원본
- \`manifest.json\`: 생성 방식, 파일 해시, 직업별 경계와 수렴 결과

## 고정 정책

이 스냅샷은 시즌 10·11 분석의 v1 결론으로 고정합니다. 기준이나 데이터가 바뀌면 이 디렉터리를 수정하지 않고 \`v2\` 스냅샷을 새로 생성합니다.

${sections.join("\n\n")}
`;
fs.writeFileSync(path.join(SNAPSHOT_DIR, "README.md"), readme, { flag: "wx" });

console.log(`Frozen ${SNAPSHOT_ID}`);
console.log(`  ${SNAPSHOT_DIR}`);
console.log(`  profiles=${data.groups.flatMap((group) => group.primaryMembers).length}`);
console.log(`  groups=${data.groups.length}`);
