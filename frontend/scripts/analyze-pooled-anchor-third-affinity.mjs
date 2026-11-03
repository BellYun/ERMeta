import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

// For every exact anchor and exact third candidate, compare that candidate
// with all other thirds while the second member stays fixed. The data is the
// full cumulative trio snapshot; no season, tier, or game-count filter.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: analyze-pooled-anchor-third-affinity.mjs YYYY-MM-DD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
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
      const pair = [members[i], members[j]].sort().join("+");
      const third = members[3 - i - j];
      const options = pairOptions.get(pair) ?? [];
      options.push({ third, games: trio.games, wins: trio.wins, rankSum: trio.rankSum });
      pairOptions.set(pair, options);
    }
  }
}

const affinity = new Map();
let comparedFixedPairOptions = 0;
for (const [pair, options] of pairOptions) {
  const members = pair.split("+");
  let totalGames = 0; let totalWins = 0; let totalRankSum = 0;
  let totalExpectedWins = 0; let totalExpectedRankSum = 0;
  for (const option of options) {
    const member = memberTotals.get(option.third);
    totalGames += option.games;
    totalWins += option.wins;
    totalRankSum += option.rankSum;
    totalExpectedWins += option.games * member.wins / member.games;
    totalExpectedRankSum += option.games * member.rankSum / member.games;
  }
  for (const option of options) {
    const otherGames = totalGames - option.games;
    if (!otherGames) continue;
    const member = memberTotals.get(option.third);
    const expectedWins = option.games * member.wins / member.games;
    const expectedRankSum = option.games * member.rankSum / member.games;
    const candidateWinResidual = (option.wins - expectedWins) / option.games;
    const candidateRankResidual = (option.rankSum - expectedRankSum) / option.games;
    const otherWinResidual = (totalWins - option.wins - (totalExpectedWins - expectedWins)) / otherGames;
    const otherRankResidual = (totalRankSum - option.rankSum - (totalExpectedRankSum - expectedRankSum)) / otherGames;
    const winDifference = candidateWinResidual - otherWinResidual;
    const rankDifference = candidateRankResidual - otherRankResidual;
    const weight = option.games * otherGames / totalGames;
    comparedFixedPairOptions++;
    for (const anchor of members) {
      const key = `${anchor}|${option.third}`;
      const item = affinity.get(key) ?? { anchor, third: option.third,
        contexts: 0, games: 0, wins: 0, rankSum: 0, weight: 0,
        weightedWin: 0, weightedRank: 0, betterWinContexts: 0,
        betterWinAndRankContexts: 0, worseWinAndRankContexts: 0,
        strongestPositiveContexts: [], strongestNegativeContexts: [] };
      item.contexts++;
      item.games += option.games;
      item.wins += option.wins;
      item.rankSum += option.rankSum;
      item.weight += weight;
      item.weightedWin += weight * winDifference;
      item.weightedRank += weight * rankDifference;
      if (winDifference > 0) item.betterWinContexts++;
      if (winDifference > 0 && rankDifference < 0) item.betterWinAndRankContexts++;
      if (winDifference < 0 && rankDifference > 0) item.worseWinAndRankContexts++;
      const context = { other: members.find((memberKey) => memberKey !== anchor),
        games: option.games, wins: option.wins, averageRank: option.rankSum / option.games,
        otherGames, winDifferencePercentagePoints: 100 * winDifference,
        averageRankDifference: rankDifference, effectiveGameWeight: weight };
      if (winDifference > 0 && rankDifference < 0) {
        item.strongestPositiveContexts.push(context);
        item.strongestPositiveContexts.sort((a, b) =>
          b.winDifferencePercentagePoints * b.effectiveGameWeight
          - a.winDifferencePercentagePoints * a.effectiveGameWeight);
        item.strongestPositiveContexts.length = Math.min(item.strongestPositiveContexts.length, 3);
      }
      if (winDifference < 0 && rankDifference > 0) {
        item.strongestNegativeContexts.push(context);
        item.strongestNegativeContexts.sort((a, b) =>
          a.winDifferencePercentagePoints * a.effectiveGameWeight
          - b.winDifferencePercentagePoints * b.effectiveGameWeight);
        item.strongestNegativeContexts.length = Math.min(item.strongestNegativeContexts.length, 3);
      }
      affinity.set(key, item);
    }
  }
}
const rows = [...affinity.values()].map(({ rankSum, weightedWin, weightedRank, weight,
  ...item }) => ({ ...item,
  observedAverageRank: rankSum / item.games,
  memberAdjustedWinDifferencePercentagePoints: 100 * weightedWin / weight,
  memberAdjustedAverageRankDifference: weightedRank / weight,
  effectiveGameWeight: weight,
})).sort((a, b) => a.anchor.localeCompare(b.anchor) || a.third.localeCompare(b.third));
const result = {
  source,
  method: "For each exact two-member pair, compare every exact third with all other third candidates. Subtract each third member's pooled overall win rate and average rank before the within-pair comparison. Aggregate that candidate's contrast separately for each of the two anchors, weighting by effective games. All rows are retained. This is a descriptive affinity, not causality or an independent sample.",
  counts: { trios: trios.length, exactMembers: memberTotals.size,
    fixedPairs: pairOptions.size, comparedFixedPairOptions,
    directedAnchorThirdAffinities: rows.length },
  affinities: rows,
};
const output = `analysis-snapshots/composition-affinity/pooled-anchor-third-affinity-${date}.json.gz`;
writeFileSync(output, gzipSync(`${JSON.stringify(result)}\n`));
process.stdout.write(`${JSON.stringify(result.counts, null, 2)}\n`);
