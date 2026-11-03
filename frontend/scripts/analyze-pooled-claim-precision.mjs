import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Audit raw win-count precision for composition contrasts already discussed.
// No trio is removed for sample size; the selected contrasts are the claims
// being audited, not a source-data filter.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: analyze-pooled-claim-precision.mjs YYYY-MM-DD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byKey = new Map(trios.map((row) => [row.key, row]));
const memberTotals = new Map();
for (const trio of trios) {
  for (const member of trio.key.split("+")) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    memberTotals.set(member, total);
  }
}
const pairTotals = new Map();
for (const trio of trios) {
  const members = trio.key.split("+");
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const pair = [members[i], members[j]].join("+");
      const third = members[3 - i - j];
      const member = memberTotals.get(third);
      const total = pairTotals.get(pair) ?? { games: 0, wins: 0, rankSum: 0,
        expectedWins: 0, expectedRankSum: 0 };
      total.games += trio.games;
      total.wins += trio.wins;
      total.rankSum += trio.rankSum;
      total.expectedWins += trio.games * member.wins / member.games;
      total.expectedRankSum += trio.games * member.rankSum / member.games;
      pairTotals.set(pair, total);
    }
  }
}

const z95 = 1.959963984540054;
function wilson95(wins, games) {
  const rate = wins / games;
  const z2 = z95 * z95;
  const divisor = 1 + z2 / games;
  const center = (rate + z2 / (2 * games)) / divisor;
  const halfWidth = z95 * Math.sqrt(rate * (1 - rate) / games + z2 / (4 * games * games)) / divisor;
  return [center - halfWidth, center + halfWidth];
}
function numericMemberOrder(left, right) {
  const [leftCharacter, leftWeapon] = left.split(":").map(Number);
  const [rightCharacter, rightWeapon] = right.split(":").map(Number);
  return leftCharacter - rightCharacter || leftWeapon - rightWeapon;
}
function lookup(fixed, candidate) {
  const key = [...fixed, candidate].sort(numericMemberOrder).join("+");
  const trio = byKey.get(key);
  if (!trio) throw new Error(`Missing trio: ${key}`);
  return trio;
}
function winDifference95(first, second) {
  const firstRate = first.wins / first.games;
  const secondRate = second.wins / second.games;
  const [firstLow, firstHigh] = wilson95(first.wins, first.games);
  const [secondLow, secondHigh] = wilson95(second.wins, second.games);
  const difference = firstRate - secondRate;
  return { difference,
    interval: [difference - Math.hypot(firstRate - firstLow, secondHigh - secondRate),
      difference + Math.hypot(firstHigh - firstRate, secondRate - secondLow)] };
}
function versusAllOtherThirds(fixed, candidate, trio) {
  const pair = [...fixed].sort(numericMemberOrder).join("+");
  const total = pairTotals.get(pair);
  if (!total) throw new Error(`Missing pair: ${pair}`);
  const member = memberTotals.get(candidate);
  const others = { games: total.games - trio.games, wins: total.wins - trio.wins,
    rankSum: total.rankSum - trio.rankSum };
  if (!others.games) throw new Error(`No other thirds for ${pair}`);
  const { difference, interval } = winDifference95(trio, others);
  const expectedWins = trio.games * member.wins / member.games;
  const expectedRankSum = trio.games * member.rankSum / member.games;
  const adjustedDifference = (trio.wins - expectedWins) / trio.games
    - (others.wins - total.expectedWins + expectedWins) / others.games;
  const rawRankDifference = trio.rankSum / trio.games - others.rankSum / others.games;
  const adjustedRankDifference = (trio.rankSum - expectedRankSum) / trio.games
    - (others.rankSum - total.expectedRankSum + expectedRankSum) / others.games;
  const shift = adjustedDifference - difference;
  return { otherGames: others.games, otherWins: others.wins,
    rawWinDifferencePercentagePoints: 100 * difference,
    rawWinDifferenceNewcombe95PercentagePoints: interval.map((value) => 100 * value),
    memberAdjustedWinDifferencePercentagePoints: 100 * adjustedDifference,
    memberAdjustedConditional95PercentagePoints: interval.map((value) => 100 * (value + shift)),
    rawAverageRankDifference: rawRankDifference,
    memberAdjustedAverageRankDifference: adjustedRankDifference };
}

const claims = [
  { fixed: ["58:10", "72:11"], first: "76:3", second: "20:4" },
  { fixed: ["72:11", "75:22"], first: "76:3", second: "20:4" },
  { fixed: ["72:11", "87:24"], first: "76:3", second: "20:4" },
  { fixed: ["9:10", "17:5"], first: "30:13", second: "20:4" },
  { fixed: ["9:10", "17:5"], first: "55:14", second: "20:4" },
  { fixed: ["72:11", "75:22"], first: "13:19", second: "13:15" },
  { fixed: ["72:11", "17:5"], first: "13:19", second: "13:15" },
];
const comparisons = claims.map(({ fixed, first, second }) => {
  const a = lookup(fixed, first);
  const b = lookup(fixed, second);
  const firstRate = a.wins / a.games;
  const secondRate = b.wins / b.games;
  const [firstLow, firstHigh] = wilson95(a.wins, a.games);
  const [secondLow, secondHigh] = wilson95(b.wins, b.games);
  const { difference: rawDifference, interval: [rawLow, rawHigh] } = winDifference95(a, b);
  const firstBaseline = memberTotals.get(first);
  const secondBaseline = memberTotals.get(second);
  const baselineDifference = firstBaseline.wins / firstBaseline.games
    - secondBaseline.wins / secondBaseline.games;
  const rankDifference = a.rankSum / a.games - b.rankSum / b.games;
  const baselineRankDifference = firstBaseline.rankSum / firstBaseline.games
    - secondBaseline.rankSum / secondBaseline.games;
  return {
    fixed, first, second,
    firstObserved: { games: a.games, wins: a.wins, winRatePercentage: 100 * firstRate,
      averageRank: a.rankSum / a.games, averageRp: a.rp / a.games,
      winRateWilson95Percentage: [100 * firstLow, 100 * firstHigh] },
    secondObserved: { games: b.games, wins: b.wins, winRatePercentage: 100 * secondRate,
      averageRank: b.rankSum / b.games, averageRp: b.rp / b.games,
      winRateWilson95Percentage: [100 * secondLow, 100 * secondHigh] },
    rawWinDifferencePercentagePoints: 100 * rawDifference,
    rawWinDifferenceNewcombe95PercentagePoints: [100 * rawLow, 100 * rawHigh],
    memberAdjustedWinDifferencePercentagePoints: 100 * (rawDifference - baselineDifference),
    memberAdjustedConditional95PercentagePoints: [100 * (rawLow - baselineDifference),
      100 * (rawHigh - baselineDifference)],
    rawAverageRankDifference: rankDifference,
    memberAdjustedAverageRankDifference: rankDifference - baselineRankDifference,
    firstVersusAllOtherThirds: versusAllOtherThirds(fixed, first, a),
    secondVersusAllOtherThirds: versusAllOtherThirds(fixed, second, b),
  };
});
const result = { source,
  method: "Wilson 95% intervals for each observed win rate and a Newcombe 95% interval for the raw difference. Each selected candidate is also compared with the combined games of every other third option for the same fixed pair; no third is excluded. These are descriptive binomial approximations conditional on independent game outcomes. The member-adjusted interval only shifts the raw interval while treating full-pool member means as fixed. Repeated players, shared opponents, builds, time, the post-scan selection of claims, and uncertainty in member baselines are unaccounted for. Rank variance is unavailable in this aggregate source, so no rank interval is reported. Do not interpret any interval as causal synergy evidence.",
  comparisons };
const output = `analysis-snapshots/composition-affinity/pooled-claim-precision-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(comparisons.map(({ fixed, first, second,
  rawWinDifferencePercentagePoints, rawWinDifferenceNewcombe95PercentagePoints,
  memberAdjustedWinDifferencePercentagePoints,
  memberAdjustedConditional95PercentagePoints }) => ({ fixed, first, second,
  rawWinDifferencePercentagePoints, rawWinDifferenceNewcombe95PercentagePoints,
  memberAdjustedWinDifferencePercentagePoints,
  memberAdjustedConditional95PercentagePoints })), null, 2)}\n`);
