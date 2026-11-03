import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Compare the same two weapon options on two different characters while
// holding the exact other two allies fixed. Descriptive pooled values only.
const [date, firstPistol, firstRifle, secondPistol, secondRifle] = process.argv.slice(2);
const keys = [firstPistol, firstRifle, secondPistol, secondRifle];
const validKey = /^\d+:\d+$/;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !keys.every((key) => validKey.test(key ?? "")) ||
    new Set(keys).size !== 4 || firstPistol.split(":")[0] !== firstRifle.split(":")[0] ||
    secondPistol.split(":")[0] !== secondRifle.split(":")[0] ||
    firstPistol.split(":")[0] === secondPistol.split(":")[0] ||
    firstPistol.split(":")[1] !== secondPistol.split(":")[1] ||
    firstRifle.split(":")[1] !== secondRifle.split(":")[1]) {
  throw new Error("Usage: compare-pooled-weapon-swaps-across-characters.mjs YYYY-MM-DD CHARACTER_A:WEAPON_1 CHARACTER_A:WEAPON_2 CHARACTER_B:WEAPON_1 CHARACTER_B:WEAPON_2");
}

const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byAllies = new Map();
for (const row of trios) {
  const members = row.key.split("+");
  const selected = keys.filter((key) => members.includes(key));
  if (selected.length !== 1) continue;
  const allies = members.filter((key) => key !== selected[0]).sort();
  if (allies.length !== 2) throw new Error(`Invalid trio ${row.key}`);
  const allyPair = allies.join("+");
  const state = byAllies.get(allyPair) ?? {};
  state[selected[0]] = row;
  byAllies.set(allyPair, state);
}

function metrics(row) {
  return { games: row.games, wins: row.wins, winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games, averageRP: row.rp / row.games };
}
function compare(first, second) {
  const difference = {
    winRatePercentagePoints: 100 * (first.winRate - second.winRate),
    averageRank: first.averageRank - second.averageRank,
    averageRP: first.averageRP - second.averageRP,
  };
  const winner = difference.winRatePercentagePoints > 0 && difference.averageRank < 0 && difference.averageRP > 0
    ? "weapon1" : difference.winRatePercentagePoints < 0 && difference.averageRank > 0 && difference.averageRP < 0
      ? "weapon2" : "mixed";
  return { weapon1: first, weapon2: second, difference, winner };
}

const counts = { withAnyVariant: byAllies.size, matchedAllyPairs: 0,
  combinations: Object.fromEntries(["weapon1", "weapon2", "mixed"].flatMap((a) =>
    ["weapon1", "weapon2", "mixed"].map((b) => [`${a}/${b}`, 0]))) };
const contexts = [];
for (const [allies, state] of byAllies) {
  if (!keys.every((key) => state[key])) continue;
  const firstCharacter = compare(metrics(state[firstPistol]), metrics(state[firstRifle]));
  const secondCharacter = compare(metrics(state[secondPistol]), metrics(state[secondRifle]));
  counts.matchedAllyPairs++;
  counts.combinations[`${firstCharacter.winner}/${secondCharacter.winner}`]++;
  const cells = keys.map((key) => state[key]);
  contexts.push({ allies, firstCharacter, secondCharacter,
    minimumGames: Math.min(...cells.map((cell) => cell.games)),
    totalGames: cells.reduce((sum, cell) => sum + cell.games, 0) });
}
contexts.sort((a, b) => b.minimumGames - a.minimumGames || b.totalGames - a.totalGames || a.allies.localeCompare(b.allies));
const sortedMinimums = contexts.map((row) => row.minimumGames).sort((a, b) => a - b);
const quantile = (q) => sortedMinimums[Math.round((sortedMinimums.length - 1) * q)];
counts.minimumFourCellGames = { firstQuartile: quantile(0.25), median: quantile(0.5),
  thirdQuartile: quantile(0.75), maximum: quantile(1) };

const output = `analysis-snapshots/composition-affinity/pooled-weapon-swap-cross-character-${keys.map((key) => key.replace(":", "-")).join("-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify({ source, keys,
  method: "For every exact pair of allies, compare weapon 1 versus weapon 2 for each character using pooled win rate, lower mean rank and stored raw team-mean RP. Keep all rows regardless of season, patch, tier, S badge or game count. Characters, weapon choices, players and opponents are not randomized; exact trios are reused across overlapping ally contexts.",
  counts, contexts }, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(counts)}\n`);
