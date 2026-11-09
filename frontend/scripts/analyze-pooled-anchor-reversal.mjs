import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { runInNewContext } from "node:vm";

// Compare a third-member skill signal for two anchors while holding the other
// fixed member and the exact third-member candidate set identical. All pooled
// rows remain eligible; this is a descriptive contrast, not a causal estimate.
const [date, feature, anchorA, anchorB, sensitivityCodesArgument] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !feature || !/^\d+:\d+$/.test(anchorA ?? "") || !/^\d+:\d+$/.test(anchorB ?? "") || anchorA === anchorB) {
  throw new Error("Usage: analyze-pooled-anchor-reversal.mjs YYYY-MM-DD FEATURE ANCHOR_A ANCHOR_B [EXCLUDED_CHARACTER_CODES]");
}
const hintSource = readFileSync("src/generated/compositionCapabilityHints.ts", "utf8");
const hintLiteral = hintSource.split("export const COMPOSITION_CAPABILITY_HINTS = ")[1]?.split(" as const;")[0];
if (!hintLiteral) throw new Error("Generated capability hints format changed");
const hints = runInNewContext(`(${hintLiteral})`);
if (!(feature in hints[1].hints)) throw new Error(`Unknown feature: ${feature}`);

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

function contrast(options, commonThirds) {
  const groups = [{ games: 0, wins: 0, rankSum: 0, expectedWins: 0, expectedRankSum: 0, thirds: 0 },
    { games: 0, wins: 0, rankSum: 0, expectedWins: 0, expectedRankSum: 0, thirds: 0 }];
  for (const third of commonThirds) {
    const charCode = Number(third.split(":")[0]);
    const cue = hints[charCode]?.hints[feature];
    if (cue === undefined) continue;
    const group = groups[Number(cue > 0)];
    const row = options.get(third);
    const total = memberTotals.get(third);
    group.games += row.games;
    group.wins += row.wins;
    group.rankSum += row.rankSum;
    group.expectedWins += row.games * total.wins / total.games;
    group.expectedRankSum += row.games * total.rankSum / total.games;
    group.thirds++;
  }
  const [without, withCue] = groups;
  if (!without.games || !withCue.games) return null;
  return {
    withoutCueGames: without.games,
    withCueGames: withCue.games,
    withoutCueWins: without.wins,
    withCueWins: withCue.wins,
    withoutCueAverageRank: without.rankSum / without.games,
    withCueAverageRank: withCue.rankSum / withCue.games,
    withoutCueThirds: without.thirds,
    withCueThirds: withCue.thirds,
    rawWinRateDifference: withCue.wins / withCue.games - without.wins / without.games,
    memberAdjustedWinRateDifference: (withCue.wins - withCue.expectedWins) / withCue.games
      - (without.wins - without.expectedWins) / without.games,
    rawAverageRankDifference: withCue.rankSum / withCue.games - without.rankSum / without.games,
    memberAdjustedAverageRankDifference: (withCue.rankSum - withCue.expectedRankSum) / withCue.games
      - (without.rankSum - without.expectedRankSum) / without.games,
    effectiveGameWeight: without.games * withCue.games / (without.games + withCue.games),
  };
}

function summarize(rows) {
  const anchors = ["a", "b"].map((side) => {
    const weight = rows.reduce((sum, row) => sum + row[side].effectiveGameWeight, 0);
    return {
      anchor: side === "a" ? anchorA : anchorB,
      memberAdjustedWinRateDifferencePercentagePoints: 100 * rows.reduce((sum, row) => sum + row[side].effectiveGameWeight * row[side].memberAdjustedWinRateDifference, 0) / weight,
      memberAdjustedAverageRankDifference: rows.reduce((sum, row) => sum + row[side].effectiveGameWeight * row[side].memberAdjustedAverageRankDifference, 0) / weight,
      alignedBetterContexts: rows.filter((row) => row[side].memberAdjustedWinRateDifference > 0 && row[side].memberAdjustedAverageRankDifference < 0).length,
      alignedWorseContexts: rows.filter((row) => row[side].memberAdjustedWinRateDifference < 0 && row[side].memberAdjustedAverageRankDifference > 0).length,
    };
  });
  const matchedWeight = rows.reduce((sum, row) => sum + row.matchedWeight, 0);
  return {
    matchedContexts: rows.length,
    anchors,
    aHasHigherWinDifference: rows.filter((row) => row.a.memberAdjustedWinRateDifference > row.b.memberAdjustedWinRateDifference).length,
    aHasHigherWinAndBetterRankDifference: rows.filter((row) => row.a.memberAdjustedWinRateDifference > row.b.memberAdjustedWinRateDifference && row.a.memberAdjustedAverageRankDifference < row.b.memberAdjustedAverageRankDifference).length,
    bHasHigherWinAndBetterRankDifference: rows.filter((row) => row.a.memberAdjustedWinRateDifference < row.b.memberAdjustedWinRateDifference && row.a.memberAdjustedAverageRankDifference > row.b.memberAdjustedAverageRankDifference).length,
    matchedWeightedWinDifferencePercentagePoints: 100 * rows.reduce((sum, row) => sum + row.matchedWeight * (row.a.memberAdjustedWinRateDifference - row.b.memberAdjustedWinRateDifference), 0) / matchedWeight,
    matchedWeightedAverageRankDifference: rows.reduce((sum, row) => sum + row.matchedWeight * (row.a.memberAdjustedAverageRankDifference - row.b.memberAdjustedAverageRankDifference), 0) / matchedWeight,
  };
}

function analyze(excludedCharCodes = []) {
  const excluded = new Set(excludedCharCodes);
  const rows = [];
  for (const other of memberTotals.keys()) {
    if (other === anchorA || other === anchorB) continue;
    const aOptions = pairOptions.get([anchorA, other].sort().join("+"));
    const bOptions = pairOptions.get([anchorB, other].sort().join("+"));
    if (!aOptions || !bOptions) continue;
    const commonThirds = [...aOptions.keys()].filter((third) =>
      third !== anchorA && third !== anchorB && bOptions.has(third)
      && !excluded.has(Number(third.split(":")[0])));
    const a = contrast(aOptions, commonThirds);
    const b = contrast(bOptions, commonThirds);
    if (!a || !b) continue;
    rows.push({ other, commonThirdCount: commonThirds.length, a, b,
      matchedWeight: Math.min(a.effectiveGameWeight, b.effectiveGameWeight) });
  }
  rows.sort((left, right) => left.other.localeCompare(right.other));
  return { summary: summarize(rows), rows };
}

const full = analyze();
const positiveCueCharacters = Object.entries(hints)
  .filter(([, hint]) => hint.hints[feature] > 0)
  .map(([code, hint]) => ({ code: Number(code), name: hint.name }));
const leaveOneCueCharacterOut = positiveCueCharacters
  .filter(({ code }) => ![anchorA, anchorB].some((anchor) => Number(anchor.split(":")[0]) === code))
  .map(({ code, name }) => ({ excludedCharacter: { code, name }, ...analyze([code]).summary }));
const sensitivityCodes = sensitivityCodesArgument
  ? sensitivityCodesArgument.split(",").map(Number) : [];
if (sensitivityCodes.some((code) => !Number.isInteger(code) || code < 1)) {
  throw new Error("Optional fifth argument must be comma-separated character codes");
}
const manuallyExcludedCueCharacters = sensitivityCodes.length
  ? { excludedCharacters: sensitivityCodes.map((code) => ({ code, name: hints[code]?.name ?? null })),
    ...analyze(sensitivityCodes).summary } : null;
const result = {
  source, feature, anchorA, anchorB,
  method: "For each identical second member, intersect exact third-member candidate sets for the two anchors; exclude both anchors as third candidates. Compare all remaining candidates with versus without the skill-text cue. Subtract each third member's overall pooled win rate and average rank, weight each within-pair contrast by effective game count, and compare anchor contrasts using the smaller of their weights. Leave-one-cue-character-out analyses test whether one tagged character drives the pattern. Descriptive association, not causality.",
  positiveCueCharacters, summary: full.summary, leaveOneCueCharacterOut,
  manuallyExcludedCueCharacters,
  pairContexts: full.rows,
};
const output = `analysis-snapshots/composition-affinity/pooled-anchor-reversal-${feature}-${anchorA.replace(":", "-")}-${anchorB.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ source, summary: result.summary,
  leaveOneCueCharacterOut, manuallyExcludedCueCharacters }, null, 2)}\n`);
