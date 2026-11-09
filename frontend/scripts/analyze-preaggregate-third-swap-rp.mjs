import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Direct C-versus-D comparison within every exact A+B pair, varying B.
// Raw stored team-mean RP is used, with no patch/tier transformation.
const [date, anchor, firstThird, secondThird] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![anchor, firstThird, secondThird].every((value) => /^\d+:\d+$/.test(value ?? "")) ||
    new Set([anchor, firstThird, secondThird]).size !== 3) {
  throw new Error("Usage: analyze-preaggregate-third-swap-rp.mjs YYYY-MM-DD ANCHOR FIRST_THIRD SECOND_THIRD");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const members = new Map();
const bySecond = new Map();
for (const trio of trios) {
  const keys = trio.key.split("+");
  for (const key of keys) {
    const total = members.get(key) ?? { games: 0, wins: 0, rankSum: 0, rp: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    total.rp += trio.rp;
    members.set(key, total);
  }
  if (!keys.includes(anchor)) continue;
  for (const third of [firstThird, secondThird]) {
    if (!keys.includes(third)) continue;
    const second = keys.find((key) => key !== anchor && key !== third);
    if (second === firstThird || second === secondThird) continue;
    const state = bySecond.get(second) ?? {};
    state[third] = trio;
    bySecond.set(second, state);
  }
}
const firstBase = members.get(firstThird);
const secondBase = members.get(secondThird);
const contexts = [];
for (const [second, state] of bySecond) {
  const a = state[firstThird];
  const b = state[secondThird];
  if (!a || !b) continue;
  const win = 100 * (a.wins / a.games - b.wins / b.games);
  const rank = a.rankSum / a.games - b.rankSum / b.games;
  const rp = a.rp / a.games - b.rp / b.games;
  contexts.push({ second,
    first: { games: a.games, wins: a.wins, averageRank: a.rankSum / a.games,
      averageRP: a.rp / a.games, uiS: a.uiS },
    other: { games: b.games, wins: b.wins, averageRank: b.rankSum / b.games,
      averageRP: b.rp / b.games, uiS: b.uiS },
    effectiveGameWeight: a.games * b.games / (a.games + b.games),
    winDifferencePercentagePoints: win, averageRankDifference: rank,
    averageRPDifference: rp,
    candidateAdjustedWinDifferencePercentagePoints: win
      - 100 * (firstBase.wins / firstBase.games - secondBase.wins / secondBase.games),
    candidateAdjustedAverageRankDifference: rank
      - (firstBase.rankSum / firstBase.games - secondBase.rankSum / secondBase.games),
    candidateAdjustedAverageRPDifference: rp
      - (firstBase.rp / firstBase.games - secondBase.rp / secondBase.games),
  });
}
contexts.sort((a, b) => a.second.localeCompare(b.second));
const weight = contexts.reduce((sum, row) => sum + row.effectiveGameWeight, 0);
function weighted(field) {
  return contexts.reduce((sum, row) => sum + row.effectiveGameWeight * row[field], 0) / weight;
}
const counts = { matchedSeconds: contexts.length,
  firstBetterAll: contexts.filter((x) => x.winDifferencePercentagePoints > 0 &&
    x.averageRankDifference < 0 && x.averageRPDifference > 0).length,
  otherBetterAll: contexts.filter((x) => x.winDifferencePercentagePoints < 0 &&
    x.averageRankDifference > 0 && x.averageRPDifference < 0).length,
  candidateAdjustedFirstBetterAll: contexts.filter((x) =>
    x.candidateAdjustedWinDifferencePercentagePoints > 0 &&
    x.candidateAdjustedAverageRankDifference < 0 &&
    x.candidateAdjustedAverageRPDifference > 0).length,
  candidateAdjustedOtherBetterAll: contexts.filter((x) =>
    x.candidateAdjustedWinDifferencePercentagePoints < 0 &&
    x.candidateAdjustedAverageRankDifference > 0 &&
    x.candidateAdjustedAverageRPDifference < 0).length };
const result = { source, anchor, firstThird, secondThird,
  method: "Compare the two exact third candidates with every common exact second ally, using raw pooled win rate, mean rank and stored team-mean RP. All contexts and game counts are retained. Candidate-adjusted differences remove each third option's overall pooled mean as a secondary check. Effective-game weighting summarizes, without excluding any context. Observational, not causal.",
  counts, weighted: { effectiveGameWeight: weight,
    winDifferencePercentagePoints: weighted("winDifferencePercentagePoints"),
    averageRankDifference: weighted("averageRankDifference"),
    averageRPDifference: weighted("averageRPDifference"),
    candidateAdjustedWinDifferencePercentagePoints: weighted("candidateAdjustedWinDifferencePercentagePoints"),
    candidateAdjustedAverageRankDifference: weighted("candidateAdjustedAverageRankDifference"),
    candidateAdjustedAverageRPDifference: weighted("candidateAdjustedAverageRPDifference") },
  contexts };
const output = `analysis-snapshots/composition-affinity/preaggregate-third-swap-rp-${anchor.replace(":", "-")}-${firstThird.replace(":", "-")}-${secondThird.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ anchor, firstThird, secondThird, counts,
  weighted: result.weighted }, null, 2)}\n`);
