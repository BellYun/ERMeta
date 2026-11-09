import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

// Exact third-member scan. For each third, hold the other member and the
// available comparison candidates equal across two anchors. This uses the
// entire cumulative dataset without a season, tier, or minimum-game filter.
const [date, anchorA, anchorB] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d+:\d+$/.test(anchorA ?? "") || !/^\d+:\d+$/.test(anchorB ?? "") || anchorA === anchorB) {
  throw new Error("Usage: analyze-pooled-exact-third-reversals.mjs YYYY-MM-DD ANCHOR_A ANCHOR_B");
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
      const options = pairOptions.get(pair) ?? new Map();
      options.set(third, trio);
      pairOptions.set(pair, options);
    }
  }
}

function adjustedResidual(row, member) {
  const total = memberTotals.get(member);
  return {
    win: row.wins / row.games - total.wins / total.games,
    rank: row.rankSum / row.games - total.rankSum / total.games,
  };
}

function otherResidual(options, commonThirds) {
  let games = 0;
  let wins = 0;
  let rankSum = 0;
  let expectedWins = 0;
  let expectedRankSum = 0;
  for (const third of commonThirds) {
    const row = options.get(third);
    const total = memberTotals.get(third);
    games += row.games;
    wins += row.wins;
    rankSum += row.rankSum;
    expectedWins += row.games * total.wins / total.games;
    expectedRankSum += row.games * total.rankSum / total.games;
  }
  return { games, win: (wins - expectedWins) / games,
    rank: (rankSum - expectedRankSum) / games };
}

const exactThirdResults = [];
for (const third of memberTotals.keys()) {
  if (third === anchorA || third === anchorB) continue;
  const contexts = [];
  let aWins = 0; let aGames = 0; let aRankSum = 0;
  let bWins = 0; let bGames = 0; let bRankSum = 0;
  for (const other of memberTotals.keys()) {
    if (other === anchorA || other === anchorB || other === third) continue;
    const aOptions = pairOptions.get([anchorA, other].sort().join("+"));
    const bOptions = pairOptions.get([anchorB, other].sort().join("+"));
    if (!aOptions || !bOptions || !aOptions.has(third) || !bOptions.has(third)) continue;
    const commonOthers = [...aOptions.keys()].filter((candidate) =>
      candidate !== third && candidate !== anchorA && candidate !== anchorB
      && bOptions.has(candidate));
    if (!commonOthers.length) continue;
    const a = aOptions.get(third);
    const b = bOptions.get(third);
    const aRest = otherResidual(aOptions, commonOthers);
    const bRest = otherResidual(bOptions, commonOthers);
    if (!aRest.games || !bRest.games) continue;
    const aResidual = adjustedResidual(a, third);
    const bResidual = adjustedResidual(b, third);
    const aWin = aResidual.win - aRest.win;
    const bWin = bResidual.win - bRest.win;
    const aRank = aResidual.rank - aRest.rank;
    const bRank = bResidual.rank - bRest.rank;
    const aWeight = a.games * aRest.games / (a.games + aRest.games);
    const bWeight = b.games * bRest.games / (b.games + bRest.games);
    const weight = Math.min(aWeight, bWeight);
    contexts.push({ other, aGames: a.games, bGames: b.games,
      aWins: a.wins, bWins: b.wins, aAverageRank: a.rankSum / a.games,
      bAverageRank: b.rankSum / b.games, aOtherGames: aRest.games,
      bOtherGames: bRest.games, aWin, bWin, aRank, bRank,
      winDifference: aWin - bWin, rankDifference: aRank - bRank, weight });
    aWins += a.wins; aGames += a.games; aRankSum += a.rankSum;
    bWins += b.wins; bGames += b.games; bRankSum += b.rankSum;
  }
  if (!contexts.length) continue;
  const totalWeight = contexts.reduce((sum, row) => sum + row.weight, 0);
  const weightedWinTotal = contexts.reduce((sum, row) => sum + row.weight * row.winDifference, 0);
  const weightedRankTotal = contexts.reduce((sum, row) => sum + row.weight * row.rankDifference, 0);
  const winDifference = weightedWinTotal / totalWeight;
  const rankDifference = weightedRankTotal / totalWeight;
  const leaveOneOut = contexts.filter((row) => row.weight < totalWeight).map((row) => ({
    win: 100 * (weightedWinTotal - row.weight * row.winDifference) / (totalWeight - row.weight),
    rank: (weightedRankTotal - row.weight * row.rankDifference) / (totalWeight - row.weight),
  }));
  const summary = {
    third, matchedContexts: contexts.length,
    anchorAObserved: { games: aGames, wins: aWins, averageRank: aRankSum / aGames },
    anchorBObserved: { games: bGames, wins: bWins, averageRank: bRankSum / bGames },
    effectiveGameWeight: totalWeight,
    largestContextWeightShare: Math.max(...contexts.map((row) => row.weight)) / totalWeight,
    memberAdjustedWinDifferencePercentagePoints: 100 * winDifference,
    memberAdjustedAverageRankDifference: rankDifference,
    leaveOneContextOutWinDifferencePercentagePointRange: leaveOneOut.length ? {
      min: Math.min(...leaveOneOut.map((row) => row.win)),
      max: Math.max(...leaveOneOut.map((row) => row.win)),
    } : null,
    leaveOneContextOutAverageRankDifferenceRange: leaveOneOut.length ? {
      min: Math.min(...leaveOneOut.map((row) => row.rank)),
      max: Math.max(...leaveOneOut.map((row) => row.rank)),
    } : null,
    aBetterWinContexts: contexts.filter((row) => row.winDifference > 0).length,
    aBetterWinAndRankContexts: contexts.filter((row) => row.winDifference > 0 && row.rankDifference < 0).length,
    bBetterWinAndRankContexts: contexts.filter((row) => row.winDifference < 0 && row.rankDifference > 0).length,
    strongestAContexts: [...contexts].filter((row) => row.winDifference > 0 && row.rankDifference < 0)
      .sort((left, right) => right.winDifference * right.weight - left.winDifference * left.weight).slice(0, 3),
    strongestBContexts: [...contexts].filter((row) => row.winDifference < 0 && row.rankDifference > 0)
      .sort((left, right) => left.winDifference * left.weight - right.winDifference * right.weight).slice(0, 3),
  };
  exactThirdResults.push({ ...summary, contexts });
}
exactThirdResults.sort((left, right) => left.third.localeCompare(right.third));
const result = {
  source, anchorA, anchorB,
  method: "For each exact third member and identical second member, use only third-candidate options present for both anchors. Compare that third's win rate and average rank with all other common options in each anchor's fixed pair. Subtract every third member's overall pooled mean, then compare anchor contrasts; weight by the smaller effective game count. All candidates and contexts are retained. This is a descriptive interaction scan, not an independent sample or causal effect.",
  counts: { exactThirdMembers: exactThirdResults.length,
    matchedContexts: exactThirdResults.reduce((sum, row) => sum + row.matchedContexts, 0) },
  exactThirdResults,
};
const output = `analysis-snapshots/composition-affinity/pooled-exact-third-reversals-${anchorA.replace(":", "-")}-${anchorB.replace(":", "-")}-${date}.json.gz`;
writeFileSync(output, gzipSync(`${JSON.stringify(result)}\n`));
const byMagnitude = [...exactThirdResults].sort((a, b) =>
  Math.abs(b.memberAdjustedWinDifferencePercentagePoints) * Math.sqrt(b.effectiveGameWeight)
  - Math.abs(a.memberAdjustedWinDifferencePercentagePoints) * Math.sqrt(a.effectiveGameWeight));
process.stdout.write(`${JSON.stringify({ counts: result.counts,
  topByDescriptiveMagnitude: byMagnitude.slice(0, 20).map(({ third, matchedContexts,
    anchorAObserved, anchorBObserved, effectiveGameWeight,
    memberAdjustedWinDifferencePercentagePoints, memberAdjustedAverageRankDifference,
    aBetterWinAndRankContexts, bBetterWinAndRankContexts }) => ({ third, matchedContexts,
    anchorAObserved, anchorBObserved, effectiveGameWeight,
    memberAdjustedWinDifferencePercentagePoints, memberAdjustedAverageRankDifference,
    aBetterWinAndRankContexts, bBetterWinAndRankContexts })) }, null, 2)}\n`);
