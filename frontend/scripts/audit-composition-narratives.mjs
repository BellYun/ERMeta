import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Run from frontend/: node scripts/audit-composition-narratives.mjs
// This checks provenance and exact-key wiring. Tactical claims still need review.
const narratives = JSON.parse(
  readFileSync("data/composition-explanations/narratives.v2.json", "utf8")
);
const displayedS = JSON.parse(
  readFileSync("analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json", "utf8")
);
const displayedSKeys = new Set(displayedS.sCompositions.map((row) => row.key));
const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const l10n = JSON.parse(readFileSync(seed.skillTextSource, "utf8"));
const types = JSON.parse(readFileSync("public/data/lab/character-composition-types.json", "utf8"));
const tendencyDirectory = "analysis-snapshots/composition-affinity";
const tendencyFile = readdirSync(tendencyDirectory)
  .filter((name) => /^pooled-type-tendencies-\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .sort()
  .at(-1);
assert(tendencyFile, "Missing pooled type tendencies");
const tendencies = JSON.parse(readFileSync(`${tendencyDirectory}/${tendencyFile}`, "utf8"));
const rowByKey = new Map(
  gunzipSync(readFileSync(seed.sourceSnapshot))
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map(JSON.parse)
    .map((row) => [row.key, row])
);
const typeByMember = new Map();
for (const group of types.groups) {
  for (const type of group.types) {
    for (const character of type.characters) {
      typeByMember.set(`${character.characterCode}:${character.weapon}`, {
        role: group.role,
        base: group.baseFitRole,
      });
    }
  }
}
const tendencyKeys = new Set(
  tendencies.tendencies.map((row) => `${row.pairRoles} | ${row.thirdType}`)
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function overlap(first, second) {
  const members = new Set(second.split("+"));
  return first.split("+").filter((member) => members.has(member)).length;
}
function sharedPair(first, second) {
  const members = new Set(second.split("+"));
  return first.split("+").filter((member) => members.has(member)).sort().join("+");
}
function aheadAllThree(target, comparison) {
  return (
    comparison.wins / comparison.games > target.wins / target.games &&
    comparison.rankSum / comparison.games < target.rankSum / target.games &&
    comparison.rp / comparison.games > target.rp / target.games
  );
}

const weaponMapSource = readFileSync("src/lib/weaponMap.ts", "utf8");
const weaponMap = weaponMapSource
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
assert(weaponMap, "Weapon map format changed");
const weaponEnumByCode = Object.fromEntries(
  [...weaponMap.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);

assert(narratives.version === 2, "Unsupported narrative version");
assert(narratives.sourceSnapshot === seed.sourceSnapshot, "Narrative source snapshot drifted");
assert(tendencies.source === seed.sourceSnapshot, "Type tendency source snapshot drifted");
assert(narratives.sourceUpdatedAtKst === seed.sourceUpdatedAtKst, "Narrative source date drifted");
const seen = new Set();
for (const narrative of narratives.narratives) {
  assert(!seen.has(narrative.key), `Duplicate narrative: ${narrative.key}`);
  seen.add(narrative.key);
  assert(rowByKey.has(narrative.key), `Missing exact trio: ${narrative.key}`);
  assert(narrative.paragraph?.length > 0, `Missing prose: ${narrative.key}`);
  assert(
    narrative.conditions?.length && narrative.breaksWhen?.length,
    `Missing interpretation boundaries: ${narrative.key}`
  );
  assert(
    ["assistant-proposed", "user-reviewed"].includes(narrative.reviewStatus),
    `Invalid narrative review status: ${narrative.key}`
  );
  if (narrative.reviewStatus === "user-reviewed") {
    assert(narrative.userReview?.summary, `Missing user review: ${narrative.key}`);
  }
  const members = narrative.key.split("+");
  for (const sourceKey of narrative.evidence.skillSourceKeys) {
    const skillId = sourceKey.match(/^Skill\/LobbyDesc\/(\d+)$/)?.[1];
    const weaponGuide = sourceKey.match(/^CharacterGuide\/(\d+)\/([A-Za-z]+)$/);
    assert(
      (skillId || weaponGuide) && l10n[sourceKey],
      `Missing skill or weapon source: ${sourceKey}`
    );
    if (skillId) {
      const characterCode = Number(skillId.slice(2, 4));
      assert(
        members.some((member) => Number(member.split(":")[0]) === characterCode),
        `Skill source belongs to another trio: ${sourceKey}`
      );
    } else {
      const [, characterCode, weaponEnum] = weaponGuide;
      assert(
        members.some((member) => {
          const [code, weapon] = member.split(":");
          return code === characterCode && weaponEnumByCode[weapon] === weaponEnum;
        }),
        `Weapon source belongs to another exact member: ${sourceKey}`
      );
    }
  }
  for (const comparisonKey of [
    ...narrative.evidence.samePairComparisons,
    ...narrative.evidence.counterexampleKeys,
  ]) {
    assert(rowByKey.has(comparisonKey), `Missing comparison: ${comparisonKey}`);
    assert(overlap(narrative.key, comparisonKey) === 2, `Not a one-member swap: ${comparisonKey}`);
  }
  const comparedPairs = new Set(
    narrative.evidence.samePairComparisons.map((key) => sharedPair(narrative.key, key))
  );
  assert(comparedPairs.size === 3, `Missing fixed-pair comparison: ${narrative.key}`);
  for (const counterexampleKey of narrative.evidence.counterexampleKeys) {
    assert(
      aheadAllThree(rowByKey.get(narrative.key), rowByKey.get(counterexampleKey)),
      `Counterexample does not lead all three metrics: ${narrative.key} -> ${counterexampleKey}`
    );
  }
  const { pairRoles, thirdType } = narrative.evidence.tendencyGroup;
  assert(
    tendencyKeys.has(`${pairRoles} | ${thirdType}`),
    `Missing type tendency: ${narrative.key}`
  );
  assert(
    members.some((third) => {
      const pair = members.filter((member) => member !== third);
      const roles = pair.map((member) => typeByMember.get(member)?.role ?? "유형 미등록");
      const type = typeByMember.get(third);
      return (
        roles.sort().join(" + ") === pairRoles &&
        (type ? `${type.role} · ${type.base}` : "유형 미등록") === thirdType
      );
    }),
    `Type tendency does not apply to exact trio: ${narrative.key}`
  );
}
process.stdout.write(
  `${JSON.stringify({ narratives: seen.size, displayedS: displayedSKeys.size, narrativesInDisplayedS: [...seen].filter((key) => displayedSKeys.has(key)).length, exactTrios: rowByKey.size, skillTextSource: seed.skillTextSource, status: "source-wiring-valid" })}\n`
);
