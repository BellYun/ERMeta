import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { createGzip, gunzipSync } from "node:zlib";

// Full pooled scan of the existing member buckets. Use the stored team-mean
// RP sum directly: no patch/tier centering and no extra division by three.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: analyze-preaggregate-raw-rp.mjs YYYY-MM-DD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const rows = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const summarySource = JSON.parse(readFileSync(
  `analysis-snapshots/composition-affinity/pooled-all-trios-${date}-summary.json`, "utf8"));
const outputStem = `analysis-snapshots/composition-affinity/preaggregate-raw-rp-${date}`;
const members = new Map();
const pairs = new Map();

function empty() { return { games: 0, wins: 0, rankSum: 0, rp: 0 }; }
function add(into, row) {
  into.games += row.games;
  into.wins += row.wins;
  into.rankSum += row.rankSum;
  into.rp += row.rp;
}
function options(trio) {
  const keys = trio.key.split("+");
  if (keys.length !== 3) throw new Error(`Invalid trio: ${trio.key}`);
  return [[`${keys[0]}+${keys[1]}`, keys[2]],
    [`${keys[0]}+${keys[2]}`, keys[1]],
    [`${keys[1]}+${keys[2]}`, keys[0]]];
}
for (const trio of rows) {
  if (!(trio.games > 0) || trio.wins < 0 || trio.wins > trio.games ||
      !Number.isFinite(trio.rp) || !Number.isFinite(trio.rankSum)) {
    throw new Error(`Invalid trio metrics: ${trio.key}`);
  }
  for (const member of trio.key.split("+")) {
    const total = members.get(member) ?? empty();
    add(total, trio);
    members.set(member, total);
  }
  for (const [pair] of options(trio)) {
    const total = pairs.get(pair) ?? { ...empty(), candidates: 0,
      expectedWins: 0, expectedRankSum: 0, expectedRp: 0 };
    add(total, trio);
    total.candidates++;
    pairs.set(pair, total);
  }
}
for (const trio of rows) {
  for (const [pair, third] of options(trio)) {
    const total = pairs.get(pair);
    const member = members.get(third);
    total.expectedWins += trio.games * member.wins / member.games;
    total.expectedRankSum += trio.games * member.rankSum / member.games;
    total.expectedRp += trio.games * member.rp / member.games;
  }
}

function directionBucket() { return { allBetter: 0, allWorse: 0,
  winRankBetterRpWorse: 0, winRankWorseRpBetter: 0, other: 0 }; }
const directions = { raw: directionBucket(), candidateAdjusted: directionBucket() };
function tally(bucket, win, rank, rp) {
  if (win > 0 && rank < 0 && rp > 0) bucket.allBetter++;
  else if (win < 0 && rank > 0 && rp < 0) bucket.allWorse++;
  else if (win > 0 && rank < 0 && rp < 0) bucket.winRankBetterRpWorse++;
  else if (win < 0 && rank > 0 && rp > 0) bucket.winRankWorseRpBetter++;
  else bucket.other++;
}
let compared = 0;
let noOthers = 0;
let sReferences = 0;
async function* comparisons() {
  for (const trio of rows) {
    for (const [pair, third] of options(trio)) {
      const total = pairs.get(pair);
      const otherGames = total.games - trio.games;
      if (!otherGames) { noOthers++; continue; }
      const member = members.get(third);
      const otherWins = total.wins - trio.wins;
      const otherRankSum = total.rankSum - trio.rankSum;
      const otherRp = total.rp - trio.rp;
      const win = 100 * (trio.wins / trio.games - otherWins / otherGames);
      const rank = trio.rankSum / trio.games - otherRankSum / otherGames;
      const rp = trio.rp / trio.games - otherRp / otherGames;
      const expectedWins = trio.games * member.wins / member.games;
      const expectedRankSum = trio.games * member.rankSum / member.games;
      const expectedRp = trio.games * member.rp / member.games;
      const adjustedWin = 100 * ((trio.wins - expectedWins) / trio.games
        - (otherWins - total.expectedWins + expectedWins) / otherGames);
      const adjustedRank = (trio.rankSum - expectedRankSum) / trio.games
        - (otherRankSum - total.expectedRankSum + expectedRankSum) / otherGames;
      const adjustedRp = (trio.rp - expectedRp) / trio.games
        - (otherRp - total.expectedRp + expectedRp) / otherGames;
      tally(directions.raw, win, rank, rp);
      tally(directions.candidateAdjusted, adjustedWin, adjustedRank, adjustedRp);
      compared++;
      if (trio.uiS) sReferences++;
      yield { pair, third, games: trio.games, wins: trio.wins,
        averageRank: trio.rankSum / trio.games, averageRP: trio.rp / trio.games,
        uiS: trio.uiS,
        otherGames, otherWins, otherAverageRank: otherRankSum / otherGames,
        otherAverageRP: otherRp / otherGames,
        winDifferencePercentagePoints: win, averageRankDifference: rank,
        averageRPDifference: rp,
        candidateAdjustedWinDifferencePercentagePoints: adjustedWin,
        candidateAdjustedAverageRankDifference: adjustedRank,
        candidateAdjustedAverageRPDifference: adjustedRp };
    }
  }
}
const file = createWriteStream(`${outputStem}-pair-thirds.ndjson.gz`);
const gzip = createGzip();
gzip.pipe(file);
for await (const comparison of comparisons()) {
  if (!gzip.write(`${JSON.stringify(comparison)}\n`)) await once(gzip, "drain");
}
gzip.end();
await finished(file);
const result = { source, sourceRefreshedAt: summarySource.sourceRefreshedAt,
  method: "Every pooled exact character+weapon trio from the pre-aggregated member buckets. Average RP = stored team-mean total_rp / total_games, without patch/tier centering or division by three. Each exact fixed pair compares every third candidate with all remaining candidates. Candidate-adjusted values subtract each third's all-pair average as a secondary descriptive control. No game threshold or tier label selects candidates.",
  trios: rows.length, members: members.size, fixedPairs: pairs.size,
  pairThirdReferences: rows.length * 3, compared, noOthers, sReferences,
  directions,
  caveats: ["Stored RP combines net RP through patch 12.3 with earned in-game RP from 12.4 onward.",
    "Game periods, players, teammates, opponents and builds are mixed in the aggregate; no causal skill effect follows.",
    "The existing UI S badge is only a label because its score divides team-mean RP by three again."],
};
writeFileSync(`${outputStem}-summary.json`, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
