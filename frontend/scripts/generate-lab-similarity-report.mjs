import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, "..");
const dataDirectory = path.join(frontendDirectory, "public/data/lab");
const outputPath = path.resolve(frontendDirectory, "../docs/character-statistical-similarity-report.md");
const notionPayloadPath = "/private/tmp/ermeta-character-similarity-notion.json";

const thresholds = {
  minimumGames: 100,
  minimumGameShare: 0.01,
  minimumSharedCompositions: 4,
  minimumSignAgreement: 0.55,
  maximumRelativeGap: 0.6,
};

const roleFiles = [
  ["탱커", "tanks.json"],
  ["전사", "warriors.json"],
  ["암살자", "assassins.json"],
  ["스킬딜러", "skilldealers.json"],
  ["원거리 딜러", "rangers.json"],
  ["지원가", "supports.json"],
];

// Pairs already reviewed with the user. The Notion export is an unreviewed work queue,
// so resolved matches and resolved non-matches are both omitted there.
const reviewedPairKeys = new Set(
  [
    ["가넷(방망이)", "쇼우(단검)"],
    ["레녹스(채찍)", "엘레나(레이피어)"],
    ["마커스(도끼)", "쇼우(단검)"],
    ["쇼우(단검)", "알론소(글러브)"],
    ["라우라(채찍)", "루크(방망이)"],
    ["라우라(채찍)", "이안(단검)"],
    ["루크(방망이)", "리 다이린(쌍절곤)"],
    ["루크(방망이)", "이안(단검)"],
    ["블레어(쌍검)", "에키온(VF의수)"],
    ["블레어(쌍검)", "카밀로(레이피어)"],
    ["슈린(레이피어)", "에키온(VF의수)"],
    ["슈린(레이피어)", "카밀로(레이피어)"],
    ["에키온(VF의수)", "카밀로(레이피어)"],
    ["카밀로(레이피어)", "피오라(창)"],
    ["에키온(VF의수)", "피오라(창)"],
    ["시셀라(암기)", "시셀라(투척)"],
    ["시셀라(암기)", "아야(저격총)"],
    ["시셀라(암기)", "셀린(투척)"],
    ["시셀라(투척)", "아야(저격총)"],
    ["시셀라(투척)", "셀린(투척)"],
    ["셀린(투척)", "아야(저격총)"],
  ].map((labels) => labels.sort((left, right) => left.localeCompare(right, "ko")).join("::"))
);
const reviewedProfileLabels = new Set(["실비아(권총)"]);

function reliableMetricProfile(character) {
  const minimumGames = Math.max(
    thresholds.minimumGames,
    Math.ceil(character.totalGames * thresholds.minimumGameShare)
  );

  return new Map(
    [...character.strong, ...character.weak]
      .filter((entry) => entry.games >= minimumGames)
      .map((entry) => [entry.multiset, entry.delta])
  );
}

function relativeGap(left, right) {
  const largest = Math.max(Math.abs(left), Math.abs(right));
  return largest > 0 ? Math.abs(left - right) / largest : 0;
}

function compareProfiles(left, right) {
  const leftProfile = reliableMetricProfile(left);
  const rightProfile = reliableMetricProfile(right);
  const sharedKeys = [...leftProfile.keys()].filter((key) => rightProfile.has(key));
  const signAgreement =
    sharedKeys.length > 0
      ? sharedKeys.filter(
          (key) => Math.sign(leftProfile.get(key) ?? 0) === Math.sign(rightProfile.get(key) ?? 0)
        ).length / sharedKeys.length
      : 0;
  const liftGap = relativeGap(
    left.classification?.partnerDelta ?? 0,
    right.classification?.partnerDelta ?? 0
  );
  const shareGap = relativeGap(
    left.classification?.partnerGameShare ?? 0,
    right.classification?.partnerGameShare ?? 0
  );

  return {
    sharedCompositions: sharedKeys.length,
    signAgreement,
    liftGap,
    shareGap,
    compatible:
      sharedKeys.length >= thresholds.minimumSharedCompositions &&
      signAgreement >= thresholds.minimumSignAgreement &&
      liftGap <= thresholds.maximumRelativeGap &&
      shareGap <= thresholds.maximumRelativeGap,
  };
}

function findPairs(data) {
  const groups = new Map(data.groups.map((group) => [group.id, group.label]));
  const pairs = [];

  for (let leftIndex = 0; leftIndex < data.characters.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < data.characters.length; rightIndex += 1) {
      const left = data.characters[leftIndex];
      const right = data.characters[rightIndex];
      const leftFitRole = left.classification?.fitRole;
      const rightFitRole = right.classification?.fitRole;

      if (
        left.groupId === null ||
        right.groupId === null ||
        left.groupId === right.groupId ||
        left.classification?.metricGroupKey != null ||
        right.classification?.metricGroupKey != null ||
        !leftFitRole ||
        !rightFitRole
      ) {
        continue;
      }

      const comparison = compareProfiles(left, right);
      if (!comparison.compatible) continue;

      pairs.push({
        left,
        right,
        leftGroup: groups.get(left.groupId) ?? `그룹 ${left.groupId}`,
        rightGroup: groups.get(right.groupId) ?? `그룹 ${right.groupId}`,
        fitRole: leftFitRole === rightFitRole ? leftFitRole : `${leftFitRole} ↔ ${rightFitRole}`,
        ...comparison,
      });
    }
  }

  return pairs.sort(
    (left, right) =>
      right.signAgreement - left.signAgreement ||
      right.sharedCompositions - left.sharedCompositions ||
      left.liftGap + left.shareGap - (right.liftGap + right.shareGap) ||
      `${left.left.characterName}:${left.right.characterName}`.localeCompare(
        `${right.left.characterName}:${right.right.characterName}`,
        "ko"
      )
  );
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function grade(pair) {
  if (pair.signAgreement >= 0.8) return "S · 매우 높음";
  if (pair.signAgreement >= 0.7) return "A · 높음";
  return "B · 탐색";
}

function characterLabel(character) {
  return `${character.characterName}(${character.weaponName})`;
}

function pairKey(pair) {
  return [characterLabel(pair.left), characterLabel(pair.right)].sort((left, right) =>
    left.localeCompare(right, "ko")
  ).join("::");
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

const roleReports = [];
for (const [roleName, filename] of roleFiles) {
  const data = JSON.parse(await readFile(path.join(dataDirectory, filename), "utf8"));
  roleReports.push({ roleName, data, pairs: findPairs(data) });
}

const notionRoleReports = roleReports.map((role) => ({
  ...role,
  pairs: role.pairs.filter(
    (pair) =>
      !reviewedPairKeys.has(pairKey(pair)) &&
      !reviewedProfileLabels.has(characterLabel(pair.left)) &&
      !reviewedProfileLabels.has(characterLabel(pair.right))
  ),
}));

const totalPairs = roleReports.reduce((sum, role) => sum + role.pairs.length, 0);
const gradeCounts = roleReports
  .flatMap((role) => role.pairs)
  .reduce(
    (counts, pair) => {
      if (pair.signAgreement >= 0.8) counts.s += 1;
      else if (pair.signAgreement >= 0.7) counts.a += 1;
      else counts.b += 1;
      return counts;
    },
    { s: 0, a: 0, b: 0 }
  );

const generatedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}).format(new Date());

const lines = [
  "# 시즌 10·11 캐릭터 통계 유사쌍 전체 보고서",
  "",
  `> 생성일: ${generatedAt} KST · 기준 데이터: 시즌 10·11 관측 RP · 전체 ${totalPairs}쌍`,
  "",
  "## 문서 목적",
  "",
  "서로 다른 1차 조합 그룹에 들어간 캐릭터 중 실제 조합 지표의 방향성이 비슷한 후보를 모두 모은 검증 문서다. 전투 기능 이름이 같다는 이유로 묶지 않고, 관측된 조합별 RP 증감 방향과 대표 조합의 상승폭·사용 비중을 기준으로 비교한다.",
  "",
  "> **중요:** 이 목록은 ‘두 캐릭터의 플레이 방식이 같다’거나 ‘서로 교체 가능하다’는 뜻이 아니다. 1차 분류 밖에서도 통계 반응이 비슷한 후보를 찾아 재분류·예외 처리 여부를 검토하기 위한 목록이다.",
  "",
  "## 판정 기준",
  "",
  "- 비교 범위: 같은 대분류 역할 안의 서로 다른 1차 조합 그룹",
  "- 캐릭터별 유효 조합: 해당 캐릭터 총 판수의 1%와 100판 중 더 큰 값 이상",
  "- 공통으로 비교할 수 있는 조합: 최소 4개",
  "- RP 증감 방향 일치율: 최소 55%",
  "- 대표 조합 RP 상승폭의 상대 차이: 최대 60%",
  "- 대표 조합 사용 비중의 상대 차이: 최대 60%",
  "- 확정 분리 역할군(`metricGroupKey`)에 속한 캐릭터는 교차 그룹 후보에서 제외",
  "",
  "상대 차이는 `|A-B| / max(|A|, |B|)`로 계산한다. 상승폭 차이와 비중 차이는 낮을수록 두 프로필이 가깝다.",
  "",
  "## 유사도 구간",
  "",
  "| 등급 | 방향 일치율 | 해석 |",
  "|---|---:|---|",
  "| S · 매우 높음 | 80% 이상 | 우선 검증할 강한 재분류 후보 |",
  "| A · 높음 | 70~79% | 의미 있는 유사 후보 |",
  "| B · 탐색 | 55~69% | 다른 지표와 캐릭터 기능을 함께 봐야 하는 탐색 후보 |",
  "",
  "## 전체 요약",
  "",
  `- 전체: **${totalPairs}쌍**`,
  `- S · 매우 높음: **${gradeCounts.s}쌍**`,
  `- A · 높음: **${gradeCounts.a}쌍**`,
  `- B · 탐색: **${gradeCounts.b}쌍**`,
  "",
  "| 역할 | 전체 | S | A | B |",
  "|---|---:|---:|---:|---:|",
];

for (const role of roleReports) {
  const counts = role.pairs.reduce(
    (result, pair) => {
      if (pair.signAgreement >= 0.8) result.s += 1;
      else if (pair.signAgreement >= 0.7) result.a += 1;
      else result.b += 1;
      return result;
    },
    { s: 0, a: 0, b: 0 }
  );
  lines.push(`| ${role.roleName} | ${role.pairs.length} | ${counts.s} | ${counts.a} | ${counts.b} |`);
}

lines.push(
  "",
  "## 해석할 때 주의할 점",
  "",
  "1. 방향 일치율은 공통 조합에서 RP가 오르고 내리는 방향이 같은 비율이다. 상승폭의 절대 크기까지 같다는 뜻은 아니다.",
  "2. 공통 조합 수가 4~5개면 1개 조합의 변화가 일치율을 크게 움직인다. 같은 등급이라도 공통 조합 수가 많은 쌍을 먼저 본다.",
  "3. 판수 기준은 극소표본을 제거하는 하한선이다. 원시 분산·표준편차가 없으므로 엄밀한 유의확률이나 신뢰구간으로 해석하면 안 된다.",
  "4. 서로 다른 전투 기능끼리도 표시한다. 통계가 비슷해도 실제 교전 방식이 다르면 통합 대신 ‘통계 유사 예외’로 남길 수 있다.",
  "5. 다르코·비형·이슈트반처럼 이미 별도 지표군으로 확정 분리된 캐릭터는 아래 교차 후보에서 빠진다.",
  "",
  "## 우선 검증 순서",
  "",
  "- 1순위: S 등급이면서 공통 조합 7개 이상",
  "- 2순위: A 등급이면서 상승폭·비중 차이가 모두 40% 이하",
  "- 3순위: B 등급 중 현재 분류에 대한 플레이 지식상 의문이 있는 캐릭터",
  "- 동일 캐릭터의 무기 간 쌍은 캐릭터 재분류보다 무기별 예외 필요성을 먼저 확인",
  ""
);

for (const role of roleReports) {
  lines.push(`## ${role.roleName} · ${role.pairs.length}쌍`, "");

  if (role.pairs.length === 0) {
    lines.push("조건을 만족하는 교차 그룹 유사쌍이 없다.", "");
    continue;
  }

  lines.push(
    "| # | 등급 | 캐릭터 쌍 | 1차 그룹 | 전투 기능 | 공통 조합 | 방향 일치 | 상승폭 차이 | 비중 차이 |",
    "|---:|---|---|---|---|---:|---:|---:|---:|"
  );

  role.pairs.forEach((pair, index) => {
    const cells = [
      index + 1,
      grade(pair),
      `${characterLabel(pair.left)} ↔ ${characterLabel(pair.right)}`,
      `${pair.leftGroup} ↔ ${pair.rightGroup}`,
      pair.fitRole,
      pair.sharedCompositions,
      percent(pair.signAgreement),
      percent(pair.liftGap),
      percent(pair.shareGap),
    ].map(escapeCell);
    lines.push(`| ${cells.join(" | ")} |`);
  });

  lines.push("");
}

lines.push(
  "## 현재 분류에 적용하는 방식",
  "",
  "- 이 문서는 자동 통합 목록이 아니라 검증 후보 목록으로 사용한다.",
  "- S/A 후보는 캐릭터 스킬 구조와 실제 잘 맞는 조합을 확인한 뒤 내부 역할군 통합·이동·별도 분리 중 하나를 결정한다.",
  "- B 후보는 단독 근거로 재분류하지 않는다. 판수, 무기 차이, 대표 조합의 실제 구성까지 같이 확인한다.",
  "- 확정 분리된 내부 지표군은 교차 그룹 통계에서 계속 제외해 같은 후보가 반복 노출되지 않게 한다.",
  "",
  "## 데이터 출처",
  "",
  "- `frontend/public/data/lab/*.json`의 시즌 10·11 관측 RP 데이터",
  "- 계산 로직: `frontend/src/lib/labStatisticalSimilarity.ts`와 동일한 기준",
  ""
);

await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");

function notionPairBlock(pair, index) {
  return [
    `${index + 1}. **${characterLabel(pair.left)} ↔ ${characterLabel(pair.right)}** · ${grade(pair)}`,
    `\t- 1차 그룹: ${pair.leftGroup} ↔ ${pair.rightGroup}`,
    `\t- 전투 기능: ${pair.fitRole}`,
    `\t- 지표: 공통 ${pair.sharedCompositions}조합 · 방향 ${percent(pair.signAgreement)} · 상승폭 차이 ${percent(pair.liftGap)} · 비중 차이 ${percent(pair.shareGap)}`,
  ].join("\n");
}

const notionRoles = notionRoleReports.map((role) => {
  const sections = [
    ["S · 매우 높음", role.pairs.filter((pair) => pair.signAgreement >= 0.8)],
    [
      "A · 높음",
      role.pairs.filter((pair) => pair.signAgreement >= 0.7 && pair.signAgreement < 0.8),
    ],
    ["B · 탐색", role.pairs.filter((pair) => pair.signAgreement < 0.7)],
  ];

  const content = [
    `<callout icon="📊" color="blue_bg">\n\t시즌 10·11 관측 RP 기준 **${role.pairs.length}쌍**입니다. 방향 일치율만으로 같은 역할군이라고 확정하지 말고, 공통 조합 수와 상승폭·비중 차이를 함께 확인하세요.\n</callout>`,
    "<table_of_contents/>",
    "## 판정 기준",
    "- 캐릭터별 유효 조합: 총 판수의 1%와 100판 중 큰 값 이상",
    "- 공통 조합 4개 이상 · 방향 일치 55% 이상",
    "- 대표 조합 상승폭·비중 상대 차이 각각 60% 이하",
    "- 서로 다른 1차 조합 그룹만 비교",
    "- 확정 분리 지표군은 제외",
    "",
  ];

  let roleIndex = 0;
  for (const [label, pairs] of sections) {
    content.push(`## ${label} · ${pairs.length}쌍 {toggle="true"}`);
    if (pairs.length === 0) {
      content.push("\t조건을 만족하는 쌍이 없습니다.");
      continue;
    }
    for (const pair of pairs) {
      content.push(
        notionPairBlock(pair, roleIndex)
          .split("\n")
          .map((line) => `\t${line}`)
          .join("\n")
      );
      roleIndex += 1;
    }
  }

  content.push(
    "## 판정 메모",
    "- S/A 후보는 스킬 구조와 실제 강한 조합을 확인한 뒤 통합·이동·예외 처리 여부를 결정합니다.",
    "- B 후보는 단독 재분류 근거로 쓰지 않습니다.",
    "- 동일 캐릭터의 무기 간 쌍은 무기별 예외를 먼저 검토합니다."
  );

  return {
    title: `${role.roleName} 통계 유사쌍 · ${role.pairs.length}쌍`,
    icon: "📊",
    content: content.join("\n"),
  };
});

const notionPairs = notionRoleReports.flatMap((role) => role.pairs);
const reviewedPairCount = totalPairs - notionPairs.length;
const notionGradeCounts = notionPairs.reduce(
  (counts, pair) => {
    if (pair.signAgreement >= 0.8) counts.s += 1;
    else if (pair.signAgreement >= 0.7) counts.a += 1;
    else counts.b += 1;
    return counts;
  },
  { s: 0, a: 0, b: 0 }
);

const notionMarkdownLines = [
  "# 시즌 10·11 캐릭터 통계 유사쌍 미검토 후보",
  "",
  `> 갱신일: ${generatedAt} KST · 검토 완료 ${reviewedPairCount}쌍 제거 · 남은 후보 ${notionPairs.length}쌍`,
  "",
  "## 판정 기준",
  "",
  "- 캐릭터별 유효 조합: 총 판수의 1%와 100판 중 큰 값 이상",
  "- 공통 조합 4개 이상 · 방향 일치 55% 이상",
  "- 대표 조합 상승폭·비중 상대 차이 각각 60% 이하",
  "- 서로 다른 1차 조합 그룹만 비교",
  "- 확정 분리 지표군과 이미 검토한 쌍은 제외",
  "",
  `- S · 매우 높음: **${notionGradeCounts.s}쌍**`,
  `- A · 높음: **${notionGradeCounts.a}쌍**`,
  `- B · 탐색: **${notionGradeCounts.b}쌍**`,
  "",
];

for (const role of notionRoleReports) {
  notionMarkdownLines.push(`## ${role.roleName} · ${role.pairs.length}쌍`, "");
  notionMarkdownLines.push(
    "| # | 등급 | 캐릭터 쌍 | 1차 그룹 | 전투 기능 | 공통 조합 | 방향 일치 | 상승폭 차이 | 비중 차이 |",
    "|---:|---|---|---|---|---:|---:|---:|---:|"
  );
  role.pairs.forEach((pair, index) => {
    const cells = [
      index + 1,
      grade(pair),
      `${characterLabel(pair.left)} ↔ ${characterLabel(pair.right)}`,
      `${pair.leftGroup} ↔ ${pair.rightGroup}`,
      pair.fitRole,
      pair.sharedCompositions,
      percent(pair.signAgreement),
      percent(pair.liftGap),
      percent(pair.shareGap),
    ].map(escapeCell);
    notionMarkdownLines.push(`| ${cells.join(" | ")} |`);
  });
  notionMarkdownLines.push("");
}

const notionMarkdownPath = "/private/tmp/ermeta-character-similarity-unreviewed.md";
await writeFile(notionMarkdownPath, `${notionMarkdownLines.join("\n")}\n`, "utf8");
await writeFile(
  "/private/tmp/ermeta-character-similarity-unreviewed-pairs.json",
  JSON.stringify(
    notionRoleReports.flatMap((role) =>
      role.pairs.map((pair) => ({
        role: role.roleName,
        left: characterLabel(pair.left),
        right: characterLabel(pair.right),
        leftFitRole: pair.left.classification?.fitRole ?? "",
        rightFitRole: pair.right.classification?.fitRole ?? "",
        leftGroup: pair.leftGroup,
        rightGroup: pair.rightGroup,
        sharedCompositions: pair.sharedCompositions,
        signAgreement: pair.signAgreement,
        liftGap: pair.liftGap,
        shareGap: pair.shareGap,
        grade: pair.signAgreement >= 0.8 ? "S" : pair.signAgreement >= 0.7 ? "A" : "B",
      }))
    ),
    null,
    2
  ),
  "utf8"
);

await writeFile(
  notionPayloadPath,
  JSON.stringify(
    {
      generatedAt,
      totalPairs: notionPairs.length,
      gradeCounts: notionGradeCounts,
      reviewedPairCount,
      roleCounts: notionRoleReports.map((role) => ({ role: role.roleName, count: role.pairs.length })),
      roles: notionRoles,
      markdownPath: notionMarkdownPath,
    },
    null,
    2
  ),
  "utf8"
);
console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${notionPayloadPath}`);
console.log(`Notion queue: ${notionPairs.length} pairs (${reviewedPairCount} reviewed pairs removed)`);
console.log(`Pairs: ${totalPairs} (S ${gradeCounts.s}, A ${gradeCounts.a}, B ${gradeCounts.b})`);
