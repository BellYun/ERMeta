import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";

// Find exact three-member contexts that reverse both separate anchor-third
// affinities. Keep every cumulative trio and every candidate in each pair.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: analyze-pooled-emergent-trios.mjs YYYY-MM-DD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const affinitySource = `analysis-snapshots/composition-affinity/pooled-anchor-third-affinity-${date}.json.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const affinities = JSON.parse(gunzipSync(readFileSync(affinitySource))).affinities;
const byAffinity = new Map(affinities.map((row) => [`${row.anchor}|${row.third}`, row]));

const memberTotals = new Map();
const pairOptions = new Map();
for (const trio of trios) {
  const members = trio.key.split("+");
  for (const member of members) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    memberTotals.set(member, total);
  }
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const fixed = [members[i], members[j]].sort();
      const pair = fixed.join("+");
      const third = members[3 - i - j];
      const options = pairOptions.get(pair) ?? [];
      options.push({ ...trio, third, fixed });
      pairOptions.set(pair, options);
    }
  }
}

const emergent = [];
const antagonistic = [];
let compared = 0;
for (const [pair, options] of pairOptions) {
  const total = { games: 0, wins: 0, rankSum: 0, expectedWins: 0, expectedRankSum: 0 };
  for (const option of options) {
    const member = memberTotals.get(option.third);
    total.games += option.games;
    total.wins += option.wins;
    total.rankSum += option.rankSum;
    total.expectedWins += option.games * member.wins / member.games;
    total.expectedRankSum += option.games * member.rankSum / member.games;
  }
  for (const option of options) {
    const otherGames = total.games - option.games;
    if (!otherGames) continue;
    compared++;
    const member = memberTotals.get(option.third);
    const expectedWins = option.games * member.wins / member.games;
    const expectedRankSum = option.games * member.rankSum / member.games;
    const win = 100 * ((option.wins - expectedWins) / option.games
      - (total.wins - option.wins - total.expectedWins + expectedWins) / otherGames);
    const rank = (option.rankSum - expectedRankSum) / option.games
      - (total.rankSum - option.rankSum - total.expectedRankSum + expectedRankSum) / otherGames;
    const marginal = option.fixed.map((anchor) => byAffinity.get(`${anchor}|${option.third}`));
    if (marginal.some((row) => !row)) throw new Error(`Missing affinity for ${pair}+${option.third}`);
    const bothMarginalWorse = marginal.every((row) =>
      row.memberAdjustedWinDifferencePercentagePoints < 0 && row.memberAdjustedAverageRankDifference > 0);
    const bothMarginalBetter = marginal.every((row) =>
      row.memberAdjustedWinDifferencePercentagePoints > 0 && row.memberAdjustedAverageRankDifference < 0);
    const target = win > 0 && rank < 0 && bothMarginalWorse ? emergent
      : win < 0 && rank > 0 && bothMarginalBetter ? antagonistic : null;
    if (!target) continue;
    target.push({ pair, third: option.third, games: option.games, wins: option.wins,
      averageRank: option.rankSum / option.games, uiS: option.uiS,
      fixedPairGames: total.games, fixedPairOtherGames: otherGames,
      fixedPairAdjustedWinDifferencePercentagePoints: win,
      fixedPairAdjustedAverageRankDifference: rank,
      effectiveGameWeight: option.games * otherGames / total.games,
      separateAnchors: marginal.map((row) => ({ anchor: row.anchor,
        contexts: row.contexts, games: row.games,
        memberAdjustedWinDifferencePercentagePoints: row.memberAdjustedWinDifferencePercentagePoints,
        memberAdjustedAverageRankDifference: row.memberAdjustedAverageRankDifference })),
    });
  }
}
for (const rows of [emergent, antagonistic]) {
  rows.sort((a, b) => b.effectiveGameWeight - a.effectiveGameWeight ||
    a.pair.localeCompare(b.pair) || a.third.localeCompare(b.third));
}
const result = { source, affinitySource,
  method: "For every pooled exact fixed pair, compare each third candidate against all other thirds after subtracting every third candidate's own pooled mean. Compare the resulting win-and-rank direction with both separate anchor-third affinities. Retain all seasons, tiers, game counts, and candidates. These are exploratory descriptive reversals, not causal interactions; anchor affinities include the focal trio.",
  counts: { trios: trios.length, fixedPairs: pairOptions.size, comparedFixedPairOptions: compared,
    emergent: emergent.length, antagonistic: antagonistic.length },
  emergent, antagonistic };
const output = `analysis-snapshots/composition-affinity/pooled-emergent-trios-${date}.json.gz`;
writeFileSync(output, gzipSync(`${JSON.stringify(result)}\n`));
process.stdout.write(`${JSON.stringify({ counts: result.counts,
  topEmergentByWeight: emergent.slice(0, 10),
  topAntagonisticByWeight: antagonistic.slice(0, 10) }, null, 2)}\n`);
