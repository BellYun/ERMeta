import { createReadStream, createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { createGunzip, createGzip } from "node:zlib";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { finished } from "node:stream/promises";

// Rebuild all exact character+weapon trios from the patch/tier source, with
// one observation per disjoint tier. Patch/tier is used only to center RP; the
// published comparisons pool every season and patch.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: analyze-pooled-trios-with-rp.mjs YYYY-MM-DD");
}
const sourceRoot = `analysis-snapshots/composition-affinity/pooled-rp-source-${date}`;
const sourceManifest = JSON.parse(readFileSync(`${sourceRoot}/manifest.json`, "utf8"));
const outputRoot = `analysis-snapshots/composition-affinity/pooled-rp-restart-${date}`;
const validTiers = new Set(["DIAMOND", "METEORITE", "MITHRIL"]);
const stratumTotals = new Map();
const trios = new Map();
const trioStrata = new Map();

function numericMemberOrder(left, right) {
  const [aChar, aWeapon] = left.split(":").map(Number);
  const [bChar, bWeapon] = right.split(":").map(Number);
  return aChar - bChar || aWeapon - bWeapon;
}
function atLeast124(patch) {
  const match = /^(\d+)\.(\d+)$/.exec(patch);
  if (!match) throw new Error(`Unknown patch version: ${JSON.stringify(patch)}`);
  const [, major, minor] = match.map(Number);
  return major > 12 || (major === 12 && minor >= 4);
}
function add(total, values) {
  total.games += values.games;
  total.wins += values.wins;
  total.rp += values.rp;
  total.rankSum += values.rankSum;
}
function fresh() { return { games: 0, wins: 0, rp: 0, rankSum: 0 }; }

let sourceRows = 0;
let patchWhitespaceRows = 0;
for (let i = 0; i < sourceManifest.shards; i++) {
  const start = i * sourceManifest.shardWidth + 1;
  const end = Math.min((i + 1) * sourceManifest.shardWidth, sourceManifest.maxId);
  const path = `${sourceRoot}/${start}-${end}.ndjson.gz`;
  const expected = JSON.parse(readFileSync(`${sourceRoot}/${start}-${end}.json`, "utf8"));
  let shardRows = 0;
  const lines = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    const [patch, tier, c1, w1, c2, w2, c3, w3, games, wins, rp, rankSum] = JSON.parse(line);
    const normalizedPatch = String(patch).trim();
    if (normalizedPatch !== patch) patchWhitespaceRows++;
    if (!validTiers.has(tier) || !(games > 0) || wins < 0 || wins > games || !Number.isFinite(rp)) {
      throw new Error(`Invalid source row in ${path}`);
    }
    const members = [`${c1}:${w1}`, `${c2}:${w2}`, `${c3}:${w3}`].sort(numericMemberOrder);
    if (new Set(members.map((member) => member.split(":")[0])).size !== 3) {
      throw new Error(`Duplicate character in ${path}`);
    }
    const trioKey = members.join("+");
    const stratumKey = `${normalizedPatch}|${tier}`;
    const values = { games, wins, rp, rankSum };
    const stratum = stratumTotals.get(stratumKey) ?? fresh();
    add(stratum, values);
    stratumTotals.set(stratumKey, stratum);
    const trio = trios.get(trioKey) ?? { key: trioKey, ...fresh(), centeredRpSum: 0,
      legacyGames: 0, earnedGames: 0 };
    add(trio, values);
    if (atLeast124(normalizedPatch)) trio.earnedGames += games;
    else trio.legacyGames += games;
    trios.set(trioKey, trio);
    const combinedKey = `${stratumKey}|${trioKey}`;
    const withinStratum = trioStrata.get(combinedKey) ?? { games: 0, rp: 0 };
    withinStratum.games += games;
    withinStratum.rp += rp;
    trioStrata.set(combinedKey, withinStratum);
    shardRows++;
  }
  if (shardRows !== expected.eligibleRows) throw new Error(`Shard mismatch: ${path}`);
  sourceRows += shardRows;
  if ((i + 1) % 10 === 0 || i + 1 === sourceManifest.shards) {
    process.stdout.write(`${JSON.stringify({ processedShards: i + 1, sourceRows,
      trios: trios.size, trioStrata: trioStrata.size })}\n`);
  }
}

for (const [key, values] of trioStrata) {
  const separator = key.indexOf("|", key.indexOf("|") + 1);
  const stratumKey = key.slice(0, separator);
  const trioKey = key.slice(separator + 1);
  const stratum = stratumTotals.get(stratumKey);
  trios.get(trioKey).centeredRpSum += values.rp - values.games * stratum.rp / stratum.games;
}
trioStrata.clear();

async function writeGzip(path, rows) {
  const file = createWriteStream(path);
  const gzip = createGzip();
  gzip.pipe(file);
  for await (const row of rows) {
    if (!gzip.write(`${JSON.stringify(row)}\n`)) await once(gzip, "drain");
  }
  gzip.end();
  await finished(file);
}

const trioRows = [...trios.values()].sort((a, b) => a.key.localeCompare(b.key));
await writeGzip(`${outputRoot}-trios.ndjson.gz`, trioRows);
const pairTotals = new Map();
const memberTotals = new Map();
let totalGames = 0;
let totalWins = 0;
let totalRankSum = 0;
let totalCenteredRp = 0;
for (const trio of trioRows) {
  totalGames += trio.games;
  totalWins += trio.wins;
  totalRankSum += trio.rankSum;
  totalCenteredRp += trio.centeredRpSum;
  const members = trio.key.split("+");
  for (const member of members) {
    const memberTotal = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0, centeredRpSum: 0 };
    memberTotal.games += trio.games;
    memberTotal.wins += trio.wins;
    memberTotal.rankSum += trio.rankSum;
    memberTotal.centeredRpSum += trio.centeredRpSum;
    memberTotals.set(member, memberTotal);
  }
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const pair = `${members[i]}+${members[j]}`;
      const pairTotal = pairTotals.get(pair) ?? { games: 0, wins: 0, rankSum: 0,
        centeredRpSum: 0, expectedWins: 0, expectedRankSum: 0,
        expectedCenteredRpSum: 0, candidates: 0 };
      pairTotal.games += trio.games;
      pairTotal.wins += trio.wins;
      pairTotal.rankSum += trio.rankSum;
      pairTotal.centeredRpSum += trio.centeredRpSum;
      pairTotal.candidates++;
      pairTotals.set(pair, pairTotal);
    }
  }
}

for (const trio of trioRows) {
  const members = trio.key.split("+");
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const pair = `${members[i]}+${members[j]}`;
      const third = members[3 - i - j];
      const member = memberTotals.get(third);
      const pairTotal = pairTotals.get(pair);
      pairTotal.expectedWins += trio.games * member.wins / member.games;
      pairTotal.expectedRankSum += trio.games * member.rankSum / member.games;
      pairTotal.expectedCenteredRpSum += trio.games * member.centeredRpSum / member.games;
    }
  }
}

let comparisonRows = 0;
function emptyDirections() { return { allThreeBetter: 0, allThreeWorse: 0,
  winRankBetterRpWorse: 0, winRankWorseRpBetter: 0, other: 0 }; }
const directions = { raw: emptyDirections(), memberAdjusted: emptyDirections() };
function countDirection(bucket, win, rank, rp) {
  if (win > 0 && rank < 0 && rp > 0) bucket.allThreeBetter++;
  else if (win < 0 && rank > 0 && rp < 0) bucket.allThreeWorse++;
  else if (win > 0 && rank < 0 && rp < 0) bucket.winRankBetterRpWorse++;
  else if (win < 0 && rank > 0 && rp > 0) bucket.winRankWorseRpBetter++;
  else bucket.other++;
}
async function* comparisons() {
  for (const trio of trioRows) {
    const members = trio.key.split("+");
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const pair = `${members[i]}+${members[j]}`;
        const third = members[3 - i - j];
        const pairTotal = pairTotals.get(pair);
        const othersGames = pairTotal.games - trio.games;
        if (!othersGames) continue;
        const winDiff = trio.wins / trio.games - (pairTotal.wins - trio.wins) / othersGames;
        const rankDiff = trio.rankSum / trio.games - (pairTotal.rankSum - trio.rankSum) / othersGames;
        const rpDiff = trio.centeredRpSum / trio.games
          - (pairTotal.centeredRpSum - trio.centeredRpSum) / othersGames;
        const member = memberTotals.get(third);
        const expectedWins = trio.games * member.wins / member.games;
        const expectedRankSum = trio.games * member.rankSum / member.games;
        const expectedRpSum = trio.games * member.centeredRpSum / member.games;
        const adjustedWinDiff = (trio.wins - expectedWins) / trio.games
          - (pairTotal.wins - trio.wins - pairTotal.expectedWins + expectedWins) / othersGames;
        const adjustedRankDiff = (trio.rankSum - expectedRankSum) / trio.games
          - (pairTotal.rankSum - trio.rankSum - pairTotal.expectedRankSum + expectedRankSum) / othersGames;
        const adjustedRpDiff = (trio.centeredRpSum - expectedRpSum) / trio.games
          - (pairTotal.centeredRpSum - trio.centeredRpSum
            - pairTotal.expectedCenteredRpSum + expectedRpSum) / othersGames;
        countDirection(directions.raw, winDiff, rankDiff, rpDiff);
        countDirection(directions.memberAdjusted, adjustedWinDiff, adjustedRankDiff, adjustedRpDiff);
        comparisonRows++;
        yield { pair, third, games: trio.games, wins: trio.wins, rankSum: trio.rankSum,
          centeredRpSum: trio.centeredRpSum, othersGames,
          winDifferencePercentagePoints: winDiff * 100,
          averageRankDifference: rankDiff,
          centeredRpDifferencePerGame: rpDiff,
          memberAdjustedWinDifferencePercentagePoints: adjustedWinDiff * 100,
          memberAdjustedAverageRankDifference: adjustedRankDiff,
          memberAdjustedCenteredRpDifferencePerGame: adjustedRpDiff };
      }
    }
  }
}
await writeGzip(`${outputRoot}-pair-thirds.ndjson.gz`, comparisons());
const summary = {
  source: "v2_CharacterTrioWeapon",
  sourceManifest: `${sourceRoot}/manifest.json`,
  method: "All seasons pooled by exact character+weapon trio, with three disjoint Diamond+ tier buckets. 12.3- source RP is net; 12.4+ is earned before fee/Gambit. For a comparable descriptive RP direction, subtract the average of the same patch and disjoint tier from each source row, then pool centered RP by total games. Patch/tier are normalization inputs, not selection or reporting groups. Centered RP is not the user's actual net RP gain.",
  sourceRows, patchWhitespaceRows, exactTrios: trios.size, exactPairs: pairTotals.size,
  memberOptions: memberTotals.size,
  totalGames, totalWins, winRatePercentage: 100 * totalWins / totalGames,
  averageRank: totalRankSum / totalGames, totalCenteredRp,
  pairThirdComparisons: comparisonRows, directions,
  strata: [...stratumTotals].map(([patchTier, row]) => ({ patchTier, games: row.games,
    averageSourceRP: row.rp / row.games })),
  limitations: ["Aggregated rows omit within-trio RP variance, player identities, opponents and combat events.",
    "Patch/tier centering removes a mean shift, not differences in RP variance or scoring rules.",
    "Candidate-versus-other comparisons mix player and character strength; they are descriptive, not causal."],
};
writeFileSync(`${outputRoot}-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ exactTrios: summary.exactTrios, exactPairs: summary.exactPairs,
  totalGames, pairThirdComparisons: comparisonRows, directions })}\n`);
