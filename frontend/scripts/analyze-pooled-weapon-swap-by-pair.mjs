import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Hold the two exact allies fixed and change only one character's weapon.
const [date, first, second] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![first, second].every((key) => /^\d+:\d+$/.test(key ?? "")) ||
    first === second || first.split(":")[0] !== second.split(":")[0]) {
  throw new Error("Usage: analyze-pooled-weapon-swap-by-pair.mjs YYYY-MM-DD CHARACTER:WEAPON_A CHARACTER:WEAPON_B");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const rows = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byAllies = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  const selected = [first, second].filter((key) => members.includes(key));
  if (selected.length !== 1) continue;
  const allies = members.filter((key) => key !== selected[0]).sort();
  if (allies.length !== 2) throw new Error(`Invalid trio ${row.key}`);
  const key = allies.join("+");
  const state = byAllies.get(key) ?? {};
  state[selected[0]] = row;
  byAllies.set(key, state);
}
function metrics(row) {
  return { games: row.games, wins: row.wins, winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games, averageRP: row.rp / row.games,
    uiS: row.uiS };
}
const contexts = [];
for (const [allies, state] of byAllies) {
  const a = state[first];
  const b = state[second];
  if (!a || !b) continue;
  const firstMetrics = metrics(a);
  const secondMetrics = metrics(b);
  const difference = {
    winRatePercentagePoints: 100 * (firstMetrics.winRate - secondMetrics.winRate),
    averageRank: firstMetrics.averageRank - secondMetrics.averageRank,
    averageRP: firstMetrics.averageRP - secondMetrics.averageRP,
  };
  contexts.push({ allies, first: firstMetrics, second: secondMetrics, difference,
    firstBetterAll: difference.winRatePercentagePoints > 0 &&
      difference.averageRank < 0 && difference.averageRP > 0,
    secondBetterAll: difference.winRatePercentagePoints < 0 &&
      difference.averageRank > 0 && difference.averageRP < 0,
    totalGames: a.games + b.games });
}
contexts.sort((a, b) => b.totalGames - a.totalGames || a.allies.localeCompare(b.allies));
const counts = { withEitherWeapon: byAllies.size, matchedAllyPairs: contexts.length,
  firstBetterAll: contexts.filter((row) => row.firstBetterAll).length,
  secondBetterAll: contexts.filter((row) => row.secondBetterAll).length,
  mixed: contexts.filter((row) => !row.firstBetterAll && !row.secondBetterAll).length };
const output = `analysis-snapshots/composition-affinity/pooled-weapon-swap-${first.replace(":", "-")}-${second.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify({ source, first, second,
  method: "Compare each pair of exact allies with the same character using either weapon. Keep every pooled exact trio and raw win rate, mean rank and stored team-mean RP. No season/patch/tier split, game threshold, S badge or RP centering. Weapon choice, players and opponents are not controlled; descriptive only.",
  counts, contexts }, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(counts)}\n`);
