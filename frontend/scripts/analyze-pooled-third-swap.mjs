import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Compare two exact third members directly within every exact fixed pair
// containing the chosen anchor. Retain every pooled trio and context.
const [date, anchor, firstThird, secondThird] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![anchor, firstThird, secondThird].every((member) => /^\d+:\d+$/.test(member ?? "")) ||
    new Set([anchor, firstThird, secondThird]).size !== 3) {
  throw new Error("Usage: analyze-pooled-third-swap.mjs YYYY-MM-DD ANCHOR FIRST_THIRD SECOND_THIRD");
}

const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const memberTotals = new Map();
const bySecond = new Map();
for (const trio of trios) {
  const members = trio.key.split("+");
  for (const member of members) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    memberTotals.set(member, total);
  }
  if (!members.includes(anchor)) continue;
  if (!members.includes(firstThird) && !members.includes(secondThird)) continue;
  const third = members.includes(firstThird) ? firstThird : secondThird;
  const second = members.find((member) => member !== anchor && member !== third);
  if (second === firstThird || second === secondThird) continue;
  const context = bySecond.get(second) ?? {};
  context[third] = trio;
  bySecond.set(second, context);
}

const contexts = [];
for (const [second, options] of bySecond) {
  if (!options[firstThird] || !options[secondThird]) continue;
  const first = options[firstThird];
  const other = options[secondThird];
  const firstBase = memberTotals.get(firstThird);
  const otherBase = memberTotals.get(secondThird);
  const firstRate = first.wins / first.games;
  const otherRate = other.wins / other.games;
  const firstRank = first.rankSum / first.games;
  const otherRank = other.rankSum / other.games;
  contexts.push({
    second,
    first: { games: first.games, wins: first.wins, averageRank: firstRank, uiS: first.uiS },
    other: { games: other.games, wins: other.wins, averageRank: otherRank, uiS: other.uiS },
    effectiveGameWeight: first.games * other.games / (first.games + other.games),
    rawWinDifferencePercentagePoints: 100 * (firstRate - otherRate),
    rawAverageRankDifference: firstRank - otherRank,
    memberAdjustedWinDifferencePercentagePoints: 100 * (firstRate - firstBase.wins / firstBase.games
      - otherRate + otherBase.wins / otherBase.games),
    memberAdjustedAverageRankDifference: firstRank - firstBase.rankSum / firstBase.games
      - otherRank + otherBase.rankSum / otherBase.games,
  });
}
contexts.sort((a, b) => a.second.localeCompare(b.second));
const weightTotal = contexts.reduce((sum, row) => sum + row.effectiveGameWeight, 0);
function weighted(field) {
  return contexts.reduce((sum, row) => sum + row.effectiveGameWeight * row[field], 0) / weightTotal;
}
const result = {
  source, anchor, firstThird, secondThird,
  method: "For every exact second member where both third candidates appear with the anchor, compare their cumulative win rates and mean ranks directly. Adjusted differences subtract each exact third member's overall pooled mean. Effective-game weighting summarizes contexts; no season, tier, or minimum-game filter. Descriptive association, not causality.",
  counts: {
    matchedSecondMembers: contexts.length,
    firstBetterBoth: contexts.filter((row) => row.memberAdjustedWinDifferencePercentagePoints > 0 && row.memberAdjustedAverageRankDifference < 0).length,
    secondBetterBoth: contexts.filter((row) => row.memberAdjustedWinDifferencePercentagePoints < 0 && row.memberAdjustedAverageRankDifference > 0).length,
    mixed: contexts.filter((row) => !(row.memberAdjustedWinDifferencePercentagePoints > 0 && row.memberAdjustedAverageRankDifference < 0) &&
      !(row.memberAdjustedWinDifferencePercentagePoints < 0 && row.memberAdjustedAverageRankDifference > 0)).length,
  },
  weighted: {
    effectiveGameWeight: weightTotal,
    rawWinDifferencePercentagePoints: weighted("rawWinDifferencePercentagePoints"),
    rawAverageRankDifference: weighted("rawAverageRankDifference"),
    memberAdjustedWinDifferencePercentagePoints: weighted("memberAdjustedWinDifferencePercentagePoints"),
    memberAdjustedAverageRankDifference: weighted("memberAdjustedAverageRankDifference"),
  },
  contexts,
};
const output = `analysis-snapshots/composition-affinity/pooled-third-swap-${anchor.replace(":", "-")}-${firstThird.replace(":", "-")}-${secondThird.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ counts: result.counts, weighted: result.weighted }, null, 2)}\n`);
