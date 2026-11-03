import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// For each anchor A and exact candidate pair C/D, compare A+B+C with A+B+D
// for every available second ally B. Track contexts where all three raw
// directions reverse. Keep every candidate and every game count.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: scan-preaggregate-triple-metric-reversals.mjs YYYY-MM-DD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byPair = new Map();
function options(trio) {
  const members = trio.key.split("+");
  return [[`${members[0]}+${members[1]}`, members[2]],
    [`${members[0]}+${members[2]}`, members[1]],
    [`${members[1]}+${members[2]}`, members[0]]];
}
for (const trio of trios) {
  for (const [pair, third] of options(trio)) {
    const candidates = byPair.get(pair) ?? [];
    candidates.push({ third, games: trio.games, wins: trio.wins,
      averageRank: trio.rankSum / trio.games, averageRP: trio.rp / trio.games });
    byPair.set(pair, candidates);
  }
}
const summaries = new Map();
let directComparisons = 0;
function update(anchor, second, first, other, win, rank, rp, weight) {
  const key = `${anchor}|${first.third}|${other.third}`;
  const state = summaries.get(key) ?? { anchor, first: first.third, other: other.third,
    contexts: 0, firstBetterAll: 0, otherBetterAll: 0, mixed: 0,
    effectiveGameWeight: 0, weightedWin: 0, weightedRank: 0, weightedRP: 0,
    bestFirstContext: null, bestOtherContext: null,
    strongestFirstWinContext: null, strongestOtherWinContext: null };
  state.contexts++;
  state.effectiveGameWeight += weight;
  state.weightedWin += weight * win;
  state.weightedRank += weight * rank;
  state.weightedRP += weight * rp;
  const firstSmoothed = (first.wins + 1) / (first.games + 2);
  const otherSmoothed = (other.wins + 1) / (other.games + 2);
  const winStandardError = 100 * Math.sqrt(firstSmoothed * (1 - firstSmoothed) / (first.games + 2)
    + otherSmoothed * (1 - otherSmoothed) / (other.games + 2));
  const winZ = Math.abs(win) / winStandardError;
  const context = { second, firstGames: first.games, firstWins: first.wins,
    firstAverageRank: first.averageRank, firstAverageRP: first.averageRP,
    otherGames: other.games, otherWins: other.wins,
    otherAverageRank: other.averageRank, otherAverageRP: other.averageRP,
    winDifferencePercentagePoints: win, averageRankDifference: rank,
    averageRPDifference: rp, effectiveGameWeight: weight, winZ };
  if (win > 0 && rank < 0 && rp > 0) {
    state.firstBetterAll++;
    if (!state.bestFirstContext || state.bestFirstContext.effectiveGameWeight < weight) {
      state.bestFirstContext = context;
    }
    if (!state.strongestFirstWinContext || state.strongestFirstWinContext.winZ < winZ) {
      state.strongestFirstWinContext = context;
    }
  } else if (win < 0 && rank > 0 && rp < 0) {
    state.otherBetterAll++;
    if (!state.bestOtherContext || state.bestOtherContext.effectiveGameWeight < weight) {
      state.bestOtherContext = context;
    }
    if (!state.strongestOtherWinContext || state.strongestOtherWinContext.winZ < winZ) {
      state.strongestOtherWinContext = context;
    }
  } else state.mixed++;
  summaries.set(key, state);
}
for (const [pair, candidates] of byPair) {
  const [a, b] = pair.split("+");
  candidates.sort((x, y) => x.third.localeCompare(y.third));
  for (let i = 0; i < candidates.length; i++) {
    const first = candidates[i];
    for (let j = i + 1; j < candidates.length; j++) {
      const other = candidates[j];
      const win = 100 * (first.wins / first.games - other.wins / other.games);
      const rank = first.averageRank - other.averageRank;
      const rp = first.averageRP - other.averageRP;
      const weight = first.games * other.games / (first.games + other.games);
      update(a, b, first, other, win, rank, rp, weight);
      update(b, a, first, other, win, rank, rp, weight);
      directComparisons += 2;
    }
  }
}
const reversals = [];
let withBothDirections = 0;
for (const state of summaries.values()) {
  if (!state.firstBetterAll || !state.otherBetterAll) continue;
  withBothDirections++;
  const weight = state.effectiveGameWeight;
  reversals.push({ anchor: state.anchor, first: state.first, other: state.other,
    contexts: state.contexts, firstBetterAll: state.firstBetterAll,
    otherBetterAll: state.otherBetterAll, mixed: state.mixed,
    effectiveGameWeight: weight,
    weightedWinDifferencePercentagePoints: state.weightedWin / weight,
    weightedAverageRankDifference: state.weightedRank / weight,
    weightedAverageRPDifference: state.weightedRP / weight,
    reversalEvidenceWeight: Math.min(state.bestFirstContext.effectiveGameWeight,
      state.bestOtherContext.effectiveGameWeight),
    reversalWinZ: Math.min(state.strongestFirstWinContext.winZ,
      state.strongestOtherWinContext.winZ),
    bestFirstContext: state.bestFirstContext, bestOtherContext: state.bestOtherContext,
    strongestFirstWinContext: state.strongestFirstWinContext,
    strongestOtherWinContext: state.strongestOtherWinContext });
}
reversals.sort((x, y) => y.reversalEvidenceWeight - x.reversalEvidenceWeight ||
  y.contexts - x.contexts || x.anchor.localeCompare(y.anchor));
const result = { source,
  method: "Within every exact fixed pair, compare every unordered pair of exact third candidates on raw win rate, average rank and stored average RP. For each anchor and candidate pair, retain all second-ally contexts and the most game-supported and largest smoothed win-Z context in each all-three direction. No sample threshold, tier split, score or RP centering. Harmonic sample weight and a two-proportion smoothed standard-error Z are presentation ranks only; neither controls multiple comparisons or establishes a skill effect.",
  counts: { exactPairs: byPair.size, directComparisons,
    anchorCandidateComparisons: summaries.size, withBothDirections },
  topReversals: reversals.slice(0, 300),
  topReversalsByWinZ: [...reversals].sort((x, y) => y.reversalWinZ - x.reversalWinZ ||
    y.reversalEvidenceWeight - x.reversalEvidenceWeight).slice(0, 300) };
const output = `analysis-snapshots/composition-affinity/preaggregate-triple-metric-reversals-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ counts: result.counts,
  topReversalsByWinZ: result.topReversalsByWinZ.slice(0, 10) }, null, 2)}\n`);
