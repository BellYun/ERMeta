import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Read every exact B in A+B+C/A+B+D from the pooled preaggregate. The two
// alternative candidates are kept beside C/D so their broader context is
// visible. Direction counts are exploratory and do not select a winner.
const [date, anchor, first, second, other1, other2] = process.argv.slice(2);
const candidates = [first, second, other1, other2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![anchor, ...candidates].every((key) => /^\d+:\d+$/.test(key ?? "")) ||
    new Set([anchor, ...candidates]).size !== 5) {
  throw new Error("Usage: explore-pooled-candidate-contexts.mjs YYYY-MM-DD ANCHOR FIRST SECOND OTHER1 OTHER2");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const rows = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byOtherAlly = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  if (!members.includes(anchor)) continue;
  const present = candidates.filter((key) => members.includes(key));
  for (const candidate of present) {
    const otherAlly = members.find((key) => key !== anchor && key !== candidate);
    if (!otherAlly) throw new Error(`Invalid trio ${row.key}`);
    const context = byOtherAlly.get(otherAlly) ?? {};
    context[candidate] = { games: row.games, wins: row.wins,
      winRate: row.wins / row.games,
      averageRank: row.rankSum / row.games, averageRP: row.rp / row.games,
      uiS: row.uiS };
    byOtherAlly.set(otherAlly, context);
  }
}
const contexts = [...byOtherAlly].map(([otherAlly, results]) => {
  const a = results[first];
  const b = results[second];
  const difference = a && b ? {
    winRatePercentagePoints: 100 * (a.winRate - b.winRate),
    averageRank: a.averageRank - b.averageRank,
    averageRP: a.averageRP - b.averageRP,
    effectiveGameWeight: a.games * b.games / (a.games + b.games),
  } : null;
  const firstBetterAll = difference !== null &&
    difference.winRatePercentagePoints > 0 && difference.averageRank < 0 && difference.averageRP > 0;
  const secondBetterAll = difference !== null &&
    difference.winRatePercentagePoints < 0 && difference.averageRank > 0 && difference.averageRP < 0;
  return { otherAlly, results,
    allFour: candidates.every((key) => results[key]),
    firstBetterAll, secondBetterAll, difference,
    totalGames: candidates.reduce((sum, key) => sum + (results[key]?.games ?? 0), 0) };
}).sort((a, b) => b.totalGames - a.totalGames || a.otherAlly.localeCompare(b.otherAlly));
const comparable = contexts.filter((row) => row.difference);
const firstBetterAll = comparable.filter((row) => row.firstBetterAll).length;
const secondBetterAll = comparable.filter((row) => row.secondBetterAll).length;
const result = { source, anchor, candidates,
  method: "All pooled exact character+weapon trios for the anchor and four candidate thirds. Primary C/D differences use raw win rate, mean rank and stored team-mean RP. No game threshold, patch/tier split, S selection or RP centering. Direction counts are exploratory, not causal or significance tests.",
  counts: { otherAllies: contexts.length,
    withFirstSecond: comparable.length,
    withAllFour: contexts.filter((row) => row.allFour).length,
    firstBetterAll, secondBetterAll,
    mixed: comparable.length - firstBetterAll - secondBetterAll },
  contexts };
const output = `analysis-snapshots/composition-affinity/pooled-candidate-contexts-${[anchor, first, second].join("-").replaceAll(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(result.counts)}\n`);
