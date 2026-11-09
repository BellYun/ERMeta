import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Run from frontend/: node scripts/inspect-pooled-composition-evidence.mjs
//   CHARACTER:WEAPON+CHARACTER:WEAPON+CHARACTER:WEAPON [--output path]
const [inputKey, ...args] = process.argv.slice(2);
if (!/^\d+:\d+\+\d+:\d+\+\d+:\d+$/.test(inputKey ?? "")) {
  throw new Error(
    "Usage: node scripts/inspect-pooled-composition-evidence.mjs MEMBER+MEMBER+MEMBER [--output path]"
  );
}
if (args.length && (args.length !== 2 || args[0] !== "--output")) {
  throw new Error("Optional argument: --output path");
}
const key = inputKey
  .split("+")
  .sort((first, second) => {
    const [firstCharacter, firstWeapon] = first.split(":").map(Number);
    const [secondCharacter, secondWeapon] = second.split(":").map(Number);
    return firstCharacter - secondCharacter || firstWeapon - secondWeapon;
  })
  .join("+");
const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const l10n = JSON.parse(readFileSync(seed.skillTextSource, "utf8"));
const types = JSON.parse(readFileSync("public/data/lab/character-composition-types.json", "utf8"));
const typeByMember = new Map();
for (const group of types.groups) {
  for (const type of group.types) {
    for (const character of type.characters) {
      typeByMember.set(`${character.characterCode}:${character.weapon}`, {
        role: group.role,
        base: group.baseFitRole,
        label: type.label,
        confidence: type.confidence,
      });
    }
  }
}
const weaponMap = readFileSync("src/lib/weaponMap.ts", "utf8")
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
if (!weaponMap) throw new Error("Weapon map format changed");
const weaponEnums = Object.fromEntries(
  [...weaponMap.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);

const rows = gunzipSync(readFileSync(seed.sourceSnapshot))
  .toString("utf8")
  .trimEnd()
  .split("\n")
  .map(JSON.parse);
const rowByKey = new Map(rows.map((row) => [row.key, row]));
const row = rowByKey.get(key);
if (!row) throw new Error(`Exact trio absent from pooled snapshot: ${key}`);
const memberTotals = new Map();
const pairOptions = new Map();
for (const option of rows) {
  const members = option.key.split("+");
  for (const member of members) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0, rp: 0 };
    total.games += option.games;
    total.wins += option.wins;
    total.rankSum += option.rankSum;
    total.rp += option.rp;
    memberTotals.set(member, total);
  }
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const options = pairOptions.get(pair) ?? [];
    options.push(option);
    pairOptions.set(pair, options);
  }
}

function metrics(item) {
  return {
    games: item.games,
    wins: item.wins,
    winRate: item.wins / item.games,
    averageRank: item.rankSum / item.games,
    averageRP: item.rp / item.games,
  };
}
function difference(first, second) {
  return {
    winRatePercentagePoints: 100 * (first.winRate - second.winRate),
    rankAdvantage: second.averageRank - first.averageRank,
    rpAdvantage: first.averageRP - second.averageRP,
    aheadAllThree:
      first.winRate > second.winRate &&
      first.averageRank < second.averageRank &&
      first.averageRP > second.averageRP,
    behindAllThree:
      first.winRate < second.winRate &&
      first.averageRank > second.averageRank &&
      first.averageRP < second.averageRP,
  };
}
function memberInfo(member) {
  const [characterCode, weaponCode] = member.split(":").map(Number);
  const weaponEnum = weaponEnums[weaponCode];
  const skillPrefix = `10${String(characterCode).padStart(2, "0")}`;
  const skillDescriptions = Object.entries(l10n)
    .filter(([skillKey]) => skillKey.startsWith(`Skill/LobbyDesc/${skillPrefix}`))
    .map(([sourceKey, text]) => ({ sourceKey, text }));
  const guideKey = weaponEnum ? `CharacterGuide/${characterCode}/${weaponEnum}` : null;
  return {
    member,
    name: l10n[`Character/Name/${characterCode}`] ?? null,
    weapon: weaponEnum ? (l10n[`WeaponType/${weaponEnum}`] ?? null) : null,
    historicalType: typeByMember.get(member) ?? null,
    overallPooledMetrics: metrics(memberTotals.get(member)),
    skillDescriptions,
    weaponGuide: guideKey && l10n[guideKey] ? { sourceKey: guideKey, text: l10n[guideKey] } : null,
  };
}

const members = key.split("+");
const sourceMetrics = metrics(row);
const tendencyDirectory = "analysis-snapshots/composition-affinity";
const tendencyFile = readdirSync(tendencyDirectory)
  .filter((name) => /^pooled-type-tendencies-\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .sort()
  .at(-1);
if (!tendencyFile) throw new Error("Build pooled type tendencies before inspecting a trio");
const tendencyPath = `${tendencyDirectory}/${tendencyFile}`;
const tendencies = JSON.parse(readFileSync(tendencyPath, "utf8"));
if (tendencies.source !== seed.sourceSnapshot) {
  throw new Error("Type tendency source snapshot differs from the exact-trio source");
}
const tendencyByGroup = new Map(
  tendencies.tendencies.map((item) => [`${item.pairRoles} | ${item.thirdType}`, item])
);
const fixedPairContexts = members.map((third, index) => {
  const pairMembers = members.filter((_, memberIndex) => memberIndex !== index);
  const pair = pairMembers.join("+");
  const options = pairOptions.get(pair);
  const pairRoles = pairMembers
    .map((member) => typeByMember.get(member)?.role ?? "유형 미등록")
    .sort()
    .join(" + ");
  const thirdProfile = typeByMember.get(third);
  const thirdType = thirdProfile ? `${thirdProfile.role} · ${thirdProfile.base}` : "유형 미등록";
  const alternatives = options
    .filter((option) => option.key !== key)
    .map((option) => {
      const optionThird = option.key.split("+").find((member) => !pairMembers.includes(member));
      const optionMetrics = metrics(option);
      return {
        key: option.key,
        third: optionThird,
        thirdName: l10n[`Character/Name/${optionThird.split(":")[0]}`] ?? null,
        thirdType: typeByMember.get(optionThird) ?? null,
        metrics: optionMetrics,
        targetMinusAlternative: difference(sourceMetrics, optionMetrics),
      };
    })
    .sort((first, second) => second.metrics.games - first.metrics.games);
  return {
    fixedPair: pair,
    pairRoles,
    targetThird: third,
    targetThirdType: thirdType,
    observedAlternatives: alternatives.length,
    targetAheadAllThreeCount: alternatives.filter(
      (option) => option.targetMinusAlternative.aheadAllThree
    ).length,
    targetBehindAllThreeCount: alternatives.filter(
      (option) => option.targetMinusAlternative.behindAllThree
    ).length,
    historicalTypeTendency: tendencyByGroup.get(`${pairRoles} | ${thirdType}`) ?? null,
    alternatives,
  };
});

const output = {
  key,
  sourceSnapshot: seed.sourceSnapshot,
  sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
  skillTextSource: seed.skillTextSource,
  historicalTypeSource: tendencies.typeSource,
  historicalTypeSeasons: types.seasons,
  interpretation:
    "Exact trio metrics and all one-member replacements are full-period pooled observations. Historical types from seasons 10 and 11 are soft interpretation labels. Neither their aggregate tendency nor an exact-trio comparison proves what happened in a fight. Raw RP definitions changed across seasons.",
  sourceMetrics,
  members: members.map(memberInfo),
  fixedPairContexts,
  existingExplanation: seed.explanations.find((explanation) => explanation.key === key) ?? null,
};
if (args.length) {
  writeFileSync(args[1], `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ path: args[1], key, alternatives: fixedPairContexts.map((item) => item.observedAlternatives) })}\n`
  );
} else {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
