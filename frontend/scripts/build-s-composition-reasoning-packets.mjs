import { createHash } from "node:crypto";
import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip, gunzipSync } from "node:zlib";

// Run from frontend/: node scripts/build-s-composition-reasoning-packets.mjs YYYY-MM-DD
// Produces complete evidence for every displayed S trio and smaller model inputs.
// Neither file contains an automatically approved tactical explanation.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: node scripts/build-s-composition-reasoning-packets.mjs YYYY-MM-DD");
}

const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const narrativePath = "data/composition-explanations/narratives.v2.json";
const narratives = JSON.parse(readFileSync(narrativePath, "utf8"));
if (narratives.version !== 2) throw new Error("Unsupported narrative version");
const displayedS = JSON.parse(
  readFileSync("analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json", "utf8")
);
const tendencies = JSON.parse(
  readFileSync(
    "analysis-snapshots/composition-affinity/pooled-type-tendencies-2026-10-14.json",
    "utf8"
  )
);
const l10n = JSON.parse(readFileSync(seed.skillTextSource, "utf8"));
const types = JSON.parse(readFileSync("public/data/lab/character-composition-types.json", "utf8"));
if (
  narratives.sourceSnapshot !== seed.sourceSnapshot ||
  tendencies.source !== seed.sourceSnapshot
) {
  throw new Error("Narratives or type tendencies use a different pooled snapshot");
}

const rows = gunzipSync(readFileSync(seed.sourceSnapshot))
  .toString("utf8")
  .trimEnd()
  .split("\n")
  .map(JSON.parse);
const rowByKey = new Map(rows.map((row) => [row.key, row]));
if (rowByKey.size !== rows.length) throw new Error("Duplicate exact-trio key in source");

const pairOptions = new Map();
for (const row of rows) {
  if (row.games <= 0) throw new Error(`Invalid games: ${row.key}`);
  const members = row.key.split("+");
  if (members.length !== 3) throw new Error(`Invalid member count: ${row.key}`);
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const options = pairOptions.get(pair) ?? [];
    options.push(row);
    pairOptions.set(pair, options);
  }
}

const typeByMember = new Map();
for (const group of types.groups) {
  for (const type of group.types) {
    for (const character of type.characters) {
      const member = `${character.characterCode}:${character.weapon}`;
      if (typeByMember.has(member)) throw new Error(`Duplicate historical type: ${member}`);
      typeByMember.set(member, {
        role: group.role,
        base: group.baseFitRole,
        label: type.label,
        confidence: type.confidence,
      });
    }
  }
}
const tendencyByGroup = new Map(
  tendencies.tendencies.map((item) => [`${item.pairRoles} | ${item.thirdType}`, item])
);
const narrativeByKey = new Map(narratives.narratives.map((item) => [item.key, item]));
if (narrativeByKey.size !== narratives.narratives.length) {
  throw new Error("Duplicate narrative key");
}
const seedByKey = new Map(seed.explanations.map((item) => [item.key, item]));
const weaponMap = readFileSync("src/lib/weaponMap.ts", "utf8")
  .split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]
  ?.split("};")[0];
if (!weaponMap) throw new Error("Weapon map format changed");
const weaponEnums = Object.fromEntries(
  [...weaponMap.matchAll(/(\d+):\s*"([^"]+)"/g)].map(([, code, name]) => [code, name])
);

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function metrics(row) {
  return {
    games: row.games,
    wins: row.wins,
    winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games,
    averageRP: row.rp / row.games,
  };
}
function direction(target, alternative) {
  const ahead =
    target.winRate > alternative.winRate &&
    target.averageRank < alternative.averageRank &&
    target.averageRP > alternative.averageRP;
  const behind =
    target.winRate < alternative.winRate &&
    target.averageRank > alternative.averageRank &&
    target.averageRP < alternative.averageRP;
  return ahead ? "aheadAllThree" : behind ? "behindAllThree" : "mixed";
}

const memberProfiles = new Map();
function memberProfile(member) {
  if (memberProfiles.has(member)) return memberProfiles.get(member);
  const [characterCode, weaponCode] = member.split(":").map(Number);
  const weaponEnum = weaponEnums[weaponCode];
  const skillPrefix = `10${String(characterCode).padStart(2, "0")}`;
  const skillDescriptions = Object.entries(l10n)
    .filter(([sourceKey]) => sourceKey.startsWith(`Skill/LobbyDesc/${skillPrefix}`))
    .map(([sourceKey, text]) => ({ sourceKey, text }));
  const guideKey = weaponEnum ? `CharacterGuide/${characterCode}/${weaponEnum}` : null;
  const weaponGuide =
    guideKey && l10n[guideKey] ? { sourceKey: guideKey, text: l10n[guideKey] } : null;
  const profile = {
    member,
    name: l10n[`Character/Name/${characterCode}`] ?? null,
    weapon: weaponEnum ? (l10n[`WeaponType/${weaponEnum}`] ?? null) : null,
    historicalType: typeByMember.get(member) ?? null,
    skillDescriptions,
    weaponGuide,
    skillDigest: sha256({ skillDescriptions, weaponGuide }),
  };
  if (!profile.name || !profile.weapon || skillDescriptions.length === 0) {
    throw new Error(`Incomplete source profile: ${member}`);
  }
  memberProfiles.set(member, profile);
  return profile;
}

function buildRecord(displayedRow) {
  const { key } = displayedRow;
  const row = rowByKey.get(key);
  if (!row) throw new Error(`S trio missing from pooled snapshot: ${key}`);
  const members = key.split("+");
  const profiles = members.map(memberProfile);
  const targetMetrics = metrics(row);
  const pairContexts = members.map((third, index) => {
    const pairMembers = members.filter((_, memberIndex) => memberIndex !== index);
    const pair = pairMembers.join("+");
    const options = pairOptions.get(pair);
    if (!options) throw new Error(`Missing fixed pair: ${pair}`);
    const pairRoles = pairMembers
      .map((member) => typeByMember.get(member)?.role ?? "유형 미등록")
      .sort()
      .join(" + ");
    const thirdTypeProfile = typeByMember.get(third);
    const thirdType = thirdTypeProfile
      ? `${thirdTypeProfile.role} · ${thirdTypeProfile.base}`
      : "유형 미등록";
    const group = tendencyByGroup.get(`${pairRoles} | ${thirdType}`);
    const alternatives = options
      .filter((option) => option.key !== key)
      .map((option) => {
        const optionThird = option.key.split("+").find((member) => !pairMembers.includes(member));
        const optionMetrics = metrics(option);
        return {
          key: option.key,
          third: optionThird,
          thirdName: memberProfile(optionThird).name,
          metrics: optionMetrics,
          targetDirection: direction(targetMetrics, optionMetrics),
        };
      })
      .sort(
        (first, second) =>
          second.metrics.games - first.metrics.games || first.key.localeCompare(second.key)
      );
    const directions = { aheadAllThree: 0, behindAllThree: 0, mixed: 0 };
    for (const option of alternatives) directions[option.targetDirection]++;
    const selected = new Map();
    for (const label of ["aheadAllThree", "behindAllThree", "mixed"]) {
      for (const option of alternatives
        .filter((item) => item.targetDirection === label)
        .slice(0, 2)) {
        selected.set(option.key, option);
      }
    }
    return {
      pair,
      pairRoles,
      targetThird: third,
      thirdType,
      observedAlternatives: alternatives.length,
      directions,
      historicalTypeTendency: group
        ? {
            contexts: group.contexts,
            memberAdjustedWinDifferencePercentagePoints:
              group.memberAdjustedWinDifferencePercentagePoints,
            memberAdjustedRankAdvantage: group.memberAdjustedRankAdvantage,
            memberAdjustedRPAdvantage: group.memberAdjustedRPAdvantage,
          }
        : null,
      selectedAlternatives: [...selected.values()],
      alternatives,
    };
  });
  const narrative = narrativeByKey.get(key);
  const seedExplanation = seedByKey.get(key);
  const review = narrative
    ? { status: narrative.reviewStatus, source: narrativePath }
    : seedExplanation
      ? { status: seedExplanation.reviewStatus, source: "seed.v1.json" }
      : { status: "needs-mechanics-review", source: null };
  return {
    key,
    sourceSnapshot: seed.sourceSnapshot,
    sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
    displayedSSnapshot: "analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json",
    historicalTypeSeasons: types.seasons,
    skillTextSource: seed.skillTextSource,
    skillDigest: sha256(profiles.map((profile) => profile.skillDigest)),
    metrics: targetMetrics,
    members: profiles,
    pairContexts,
    review,
  };
}

const prefix = `analysis-snapshots/composition-affinity/s-reasoning-${date}`;
const seenS = new Set();
const sFixedPairs = new Set();
const reviewStatusCounts = {};
let totalAlternativeComparisons = 0;
async function* fullLines() {
  for (const displayedRow of displayedS.sCompositions) {
    if (seenS.has(displayedRow.key)) throw new Error(`Duplicate S key: ${displayedRow.key}`);
    seenS.add(displayedRow.key);
    const record = buildRecord(displayedRow);
    reviewStatusCounts[record.review.status] = (reviewStatusCounts[record.review.status] ?? 0) + 1;
    for (const context of record.pairContexts) {
      sFixedPairs.add(context.pair);
      totalAlternativeComparisons += context.observedAlternatives;
      if (context.observedAlternatives !== context.alternatives.length) {
        throw new Error(`Incomplete alternative coverage: ${record.key}`);
      }
    }
    yield `${JSON.stringify({
      ...record,
      pairContexts: record.pairContexts.map(({ alternatives, ...context }) => ({
        ...context,
        // Exact metrics are in sourceSnapshot; keep every key and direction without
        // duplicating the same source row hundreds of times across S contexts.
        alternatives: alternatives.map((item) => [item.key, item.targetDirection]),
      })),
    })}\n`;
  }
}
async function* modelLines() {
  for (const displayedRow of displayedS.sCompositions) {
    const record = buildRecord(displayedRow);
    yield `${JSON.stringify({
      ...record,
      pairContexts: record.pairContexts.map(({ alternatives, ...context }) => context),
      interpretation:
        "Full-period pooled metrics are observations; skill text describes possible actions; actual combat mechanism is a hypothesis. Historical types are seasons 10–11 search hints. Selected alternatives are examples from every outcome direction, ranked by games; every alternative was included in the full evidence and direction counts. Do not infer causality or claim an observed skill sequence.",
    })}\n`;
  }
}
await pipeline(
  Readable.from(fullLines()),
  createGzip(),
  createWriteStream(`${prefix}-full.ndjson.gz`)
);
await pipeline(
  Readable.from(modelLines()),
  createGzip(),
  createWriteStream(`${prefix}-model.ndjson.gz`)
);

const missingTypeMembers = new Set();
for (const profile of memberProfiles.values()) {
  if (!profile.historicalType) missingTypeMembers.add(profile.member);
}
const summary = {
  sourceSnapshot: seed.sourceSnapshot,
  sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
  displayedSCount: seenS.size,
  exactTrioSourceCount: rows.length,
  exactFixedPairs: pairOptions.size,
  sFixedPairs: sFixedPairs.size,
  alternativeComparisons: totalAlternativeComparisons,
  uniqueMembers: memberProfiles.size,
  missingHistoricalTypeMembers: [...missingTypeMembers].sort(),
  reviewStatusCounts,
  fullEvidence: `${prefix}-full.ndjson.gz`,
  modelInput: `${prefix}-model.ndjson.gz`,
  interpretation:
    "Every displayed S trio has all three exact fixed-pair contexts and every observed third alternative in full evidence. Model inputs include all-outcome counts, top two played alternatives per direction, exact member skill texts, and historical-type tendencies. They are inputs for individual tactical judgment, not approved explanations.",
};
writeFileSync(`${prefix}-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);
