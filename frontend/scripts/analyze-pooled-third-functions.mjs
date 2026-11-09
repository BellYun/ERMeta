import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { runInNewContext } from "node:vm";

// Descriptive scan over every cumulative trio. Two exact character+weapon
// members are held fixed; the third member's official-skill text signals vary.
// No season split, patch gate, game-count exclusion, or role type is used.
const snapshotDate = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate ?? "")) {
  throw new Error("Usage: analyze-pooled-third-functions.mjs YYYY-MM-DD");
}
const base = `analysis-snapshots/composition-affinity/pooled-all-trios-${snapshotDate}`;
const hintSource = readFileSync("src/generated/compositionCapabilityHints.ts", "utf8");
const hintLiteral = hintSource.split("export const COMPOSITION_CAPABILITY_HINTS = ")[1]
  ?.split(" as const;")[0];
if (!hintLiteral) throw new Error("Generated capability hints format changed");
const COMPOSITION_CAPABILITY_HINTS = runInNewContext(`(${hintLiteral})`);
const lines = gunzipSync(readFileSync(`${base}.ndjson.gz`)).toString("utf8").trimEnd().split("\n");
const trios = lines.map((line) => JSON.parse(line));
const memberTotals = new Map();
const pairOptions = new Map();
for (const trio of trios) {
  const members = trio.key.split("+");
  if (members.length !== 3) throw new Error(`Bad trio key ${trio.key}`);
  for (const member of members) {
    const row = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0 };
    row.games += trio.games;
    row.wins += trio.wins;
    row.rankSum += trio.rankSum;
    memberTotals.set(member, row);
  }
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const pair = `${members[i]}+${members[j]}`;
      const third = members[3 - i - j];
      const options = pairOptions.get(pair) ?? [];
      options.push({ third, games: trio.games, wins: trio.wins, rankSum: trio.rankSum });
      pairOptions.set(pair, options);
    }
  }
}

const features = Object.keys(COMPOSITION_CAPABILITY_HINTS[1].hints);
const output = [];
const pairContrastLines = [];
for (const feature of features) {
  let pairCount = 0;
  let thirdOptions = 0;
  let games = 0;
  let totalWeight = 0;
  let rawWeightedDifference = 0;
  let memberAdjustedWeightedDifference = 0;
  let rawWeightedRankDifference = 0;
  let memberAdjustedWeightedRankDifference = 0;
  let positivePairCount = 0;
  let negativePairCount = 0;
  let alignedBetterPairCount = 0;
  let alignedWorsePairCount = 0;
  let unclassifiedOptions = 0;
  let unclassifiedGames = 0;
  const pairDifferences = [];
  for (const [pair, options] of pairOptions) {
    const groups = [{ games: 0, wins: 0, rankSum: 0, memberExpectedWins: 0, memberExpectedRankSum: 0, options: 0 },
      { games: 0, wins: 0, rankSum: 0, memberExpectedWins: 0, memberExpectedRankSum: 0, options: 0 }];
    for (const option of options) {
      const code = Number(option.third.split(":")[0]);
      const hint = COMPOSITION_CAPABILITY_HINTS[code]?.hints[feature];
      if (hint === undefined) {
        unclassifiedOptions++;
        unclassifiedGames += option.games;
        continue;
      }
      const group = groups[Number(hint > 0)];
      const memberTotal = memberTotals.get(option.third);
      group.games += option.games;
      group.wins += option.wins;
      group.rankSum += option.rankSum;
      group.memberExpectedWins += option.games * memberTotal.wins / memberTotal.games;
      group.memberExpectedRankSum += option.games * memberTotal.rankSum / memberTotal.games;
      group.options++;
    }
    if (!groups[0].games || !groups[1].games) continue;
    const raw = groups[1].wins / groups[1].games - groups[0].wins / groups[0].games;
    const adjusted = (groups[1].wins - groups[1].memberExpectedWins) / groups[1].games
      - (groups[0].wins - groups[0].memberExpectedWins) / groups[0].games;
    const rawRank = groups[1].rankSum / groups[1].games - groups[0].rankSum / groups[0].games;
    const adjustedRank = (groups[1].rankSum - groups[1].memberExpectedRankSum) / groups[1].games
      - (groups[0].rankSum - groups[0].memberExpectedRankSum) / groups[0].games;
    // Effective sample size of a two-group contrast. All observations remain.
    const weight = groups[0].games * groups[1].games / (groups[0].games + groups[1].games);
    pairCount++;
    thirdOptions += options.length;
    games += groups[0].games + groups[1].games;
    totalWeight += weight;
    rawWeightedDifference += weight * raw;
    memberAdjustedWeightedDifference += weight * adjusted;
    rawWeightedRankDifference += weight * rawRank;
    memberAdjustedWeightedRankDifference += weight * adjustedRank;
    if (adjusted > 0) positivePairCount++;
    if (adjusted < 0) negativePairCount++;
    if (adjusted > 0 && adjustedRank < 0) alignedBetterPairCount++;
    if (adjusted < 0 && adjustedRank > 0) alignedWorsePairCount++;
    pairDifferences.push({ pair, raw, memberAdjusted: adjusted, rawRank,
      memberAdjustedRank: adjustedRank, weight,
      featureGames: groups[1].games, otherGames: groups[0].games });
    pairContrastLines.push(JSON.stringify({ feature, pair,
      rawWinRateDifference: raw, memberAdjustedWinRateDifference: adjusted,
      rawAverageRankDifference: rawRank, memberAdjustedAverageRankDifference: adjustedRank,
      effectiveGameWeight: weight, featureGames: groups[1].games,
      otherGames: groups[0].games }));
  }
  const byFixedMember = new Map();
  for (const difference of pairDifferences) {
    for (const member of difference.pair.split("+")) {
      const item = byFixedMember.get(member) ?? { member, pairCount: 0, weight: 0,
        rawWeightedTotal: 0, adjustedWeightedTotal: 0,
        rawRankWeightedTotal: 0, adjustedRankWeightedTotal: 0,
        positivePairs: 0, negativePairs: 0, alignedBetterPairs: 0, alignedWorsePairs: 0,
        pairs: [] };
      item.pairCount++;
      item.weight += difference.weight;
      item.rawWeightedTotal += difference.raw * difference.weight;
      item.adjustedWeightedTotal += difference.memberAdjusted * difference.weight;
      item.rawRankWeightedTotal += difference.rawRank * difference.weight;
      item.adjustedRankWeightedTotal += difference.memberAdjustedRank * difference.weight;
      if (difference.memberAdjusted > 0) item.positivePairs++;
      if (difference.memberAdjusted < 0) item.negativePairs++;
      if (difference.memberAdjusted > 0 && difference.memberAdjustedRank < 0) item.alignedBetterPairs++;
      if (difference.memberAdjusted < 0 && difference.memberAdjustedRank > 0) item.alignedWorsePairs++;
      item.pairs.push(difference);
      byFixedMember.set(member, item);
    }
  }
  output.push({ feature, pairCount, thirdOptions, games,
    unclassifiedOptions, unclassifiedGames,
    rawWithinPairDifferencePercentagePoints: 100 * rawWeightedDifference / totalWeight,
    memberAdjustedWithinPairDifferencePercentagePoints: 100 * memberAdjustedWeightedDifference / totalWeight,
    rawWithinPairAverageRankDifference: rawWeightedRankDifference / totalWeight,
    memberAdjustedWithinPairAverageRankDifference: memberAdjustedWeightedRankDifference / totalWeight,
    positivePairCount, negativePairCount, alignedBetterPairCount, alignedWorsePairCount,
    byFixedMember: [...byFixedMember.values()].map((row) => ({
      member: row.member, pairCount: row.pairCount, effectiveGameWeight: row.weight,
      rawDifferencePercentagePoints: 100 * row.rawWeightedTotal / row.weight,
      memberAdjustedDifferencePercentagePoints: 100 * row.adjustedWeightedTotal / row.weight,
      rawAverageRankDifference: row.rawRankWeightedTotal / row.weight,
      memberAdjustedAverageRankDifference: row.adjustedRankWeightedTotal / row.weight,
      positivePairs: row.positivePairs, negativePairs: row.negativePairs,
      alignedBetterPairs: row.alignedBetterPairs, alignedWorsePairs: row.alignedWorsePairs,
      strongestSupportingPairs: [...row.pairs]
        .filter((pair) => pair.memberAdjusted > 0 && pair.memberAdjustedRank < 0)
        .sort((a, b) => b.memberAdjusted * b.weight - a.memberAdjusted * a.weight).slice(0, 3),
      strongestContradictingPairs: [...row.pairs]
        .filter((pair) => pair.memberAdjusted < 0 && pair.memberAdjustedRank > 0)
        .sort((a, b) => a.memberAdjusted * a.weight - b.memberAdjusted * b.weight).slice(0, 3),
    })).sort((a, b) => a.member.localeCompare(b.member)),
    // Repeated broad patterns need examples and counterexamples, not only a mean.
    strongestPositiveExamples: [...pairDifferences].sort((a, b) => b.memberAdjusted * b.weight - a.memberAdjusted * a.weight).slice(0, 10),
    strongestNegativeExamples: [...pairDifferences].sort((a, b) => a.memberAdjusted * a.weight - b.memberAdjusted * b.weight).slice(0, 10),
  });
}
const result = {
  source: `${base}.ndjson.gz`,
  skillHints: "frontend/src/generated/compositionCapabilityHints.ts (skill-text keyword signals are imperfect; characters absent from this generated snapshot remain unclassified for this scan but stay in the pooled trio dataset)",
  method: "For each exact two-member pair, compare all third options with versus without a skill-text signal. Weight pair contrasts by the effective game count. Member-adjusted results subtract each exact third member's pooled overall win rate or average rank before comparing within a pair. A higher win-rate difference and lower average-rank difference favor the signal group. Descriptive association, not causality.",
  counts: { trios: trios.length, exactMemberPairs: pairOptions.size, exactMembers: memberTotals.size },
  features: output,
};
const outputPath = `analysis-snapshots/composition-affinity/pooled-third-function-scan-${snapshotDate}.json`;
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
const detailPath = `analysis-snapshots/composition-affinity/pooled-third-function-pairs-${snapshotDate}.ndjson.gz`;
writeFileSync(detailPath, gzipSync(`${pairContrastLines.join("\n")}\n`));
process.stdout.write(`${JSON.stringify({ counts: result.counts,
  features: output.map(({ feature, pairCount, rawWithinPairDifferencePercentagePoints,
    memberAdjustedWithinPairDifferencePercentagePoints, memberAdjustedWithinPairAverageRankDifference,
    positivePairCount, negativePairCount, alignedBetterPairCount, alignedWorsePairCount }) =>
    ({ feature, pairCount, rawWithinPairDifferencePercentagePoints,
      memberAdjustedWithinPairDifferencePercentagePoints, memberAdjustedWithinPairAverageRankDifference,
      positivePairCount, negativePairCount, alignedBetterPairCount, alignedWorsePairCount })) }, null, 2)}\n`);
