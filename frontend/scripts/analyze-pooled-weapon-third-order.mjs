import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Hold one exact ally fixed, change one character's weapon, and compare the
// ordering of every two exact third-member candidates in both weapon contexts.
const [date, firstWeapon, secondWeapon, firstCandidate, secondCandidate] = process.argv.slice(2);
const member = /^\d+:\d+$/;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![firstWeapon, secondWeapon, firstCandidate, secondCandidate].every((value) => member.test(value ?? "")) ||
    firstWeapon === secondWeapon || firstCandidate === secondCandidate ||
    firstWeapon.split(":")[0] !== secondWeapon.split(":")[0] ||
    new Set([firstWeapon.split(":")[0], firstCandidate.split(":")[0], secondCandidate.split(":")[0]]).size !== 3) {
  throw new Error("Usage: analyze-pooled-weapon-third-order.mjs YYYY-MM-DD CHARACTER:WEAPON_A CHARACTER:WEAPON_B CANDIDATE_A CANDIDATE_B");
}

const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byWeaponAndFixedAlly = new Map([[firstWeapon, new Map()], [secondWeapon, new Map()]]);
for (const row of trios) {
  const members = row.key.split("+");
  const selected = [firstWeapon, secondWeapon].filter((weapon) => members.includes(weapon));
  if (selected.length !== 1) continue;
  const weapon = selected[0];
  const allies = members.filter((memberKey) => memberKey !== weapon);
  if (allies.length !== 2) throw new Error(`Invalid trio ${row.key}`);
  for (const [fixed, third] of [allies, [...allies].reverse()]) {
    const options = byWeaponAndFixedAlly.get(weapon).get(fixed) ?? new Map();
    options.set(third, row);
    byWeaponAndFixedAlly.get(weapon).set(fixed, options);
  }
}

function metrics(row) {
  return { games: row.games, wins: row.wins, winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games, averageRP: row.rp / row.games };
}
function direction(first, second) {
  const difference = {
    winRatePercentagePoints: 100 * (first.winRate - second.winRate),
    averageRank: first.averageRank - second.averageRank,
    averageRP: first.averageRP - second.averageRP,
  };
  const firstBetter = difference.winRatePercentagePoints > 0 &&
    difference.averageRank < 0 && difference.averageRP > 0;
  const secondBetter = difference.winRatePercentagePoints < 0 &&
    difference.averageRank > 0 && difference.averageRP < 0;
  return { winner: firstBetter ? "first" : secondBetter ? "second" : "mixed", difference };
}
function compare(fixed, a, b, firstOptions, secondOptions) {
  const cells = {
    firstWeapon: { firstCandidate: metrics(firstOptions.get(a)), secondCandidate: metrics(firstOptions.get(b)) },
    secondWeapon: { firstCandidate: metrics(secondOptions.get(a)), secondCandidate: metrics(secondOptions.get(b)) },
  };
  const first = direction(cells.firstWeapon.firstCandidate, cells.firstWeapon.secondCandidate);
  const second = direction(cells.secondWeapon.firstCandidate, cells.secondWeapon.secondCandidate);
  const all = [cells.firstWeapon.firstCandidate, cells.firstWeapon.secondCandidate,
    cells.secondWeapon.firstCandidate, cells.secondWeapon.secondCandidate];
  return { fixed, firstCandidate: a, secondCandidate: b, cells,
    firstWeaponResult: first, secondWeaponResult: second,
    minimumGames: Math.min(...all.map((cell) => cell.games)),
    totalGames: all.reduce((sum, cell) => sum + cell.games, 0) };
}
function category(row) {
  const a = row.firstWeaponResult.winner;
  const b = row.secondWeaponResult.winner;
  if (a === "mixed" || b === "mixed") return "mixed";
  return a === b ? "same" : "reversed";
}
function bySupport(a, b) {
  return b.minimumGames - a.minimumGames || b.totalGames - a.totalGames ||
    a.fixed.localeCompare(b.fixed) || a.firstCandidate.localeCompare(b.firstCandidate) ||
    a.secondCandidate.localeCompare(b.secondCandidate);
}
function offerTop(rows, row) {
  if (rows.length < 20) rows.push(row);
  else if (bySupport(row, rows[rows.length - 1]) < 0) rows[rows.length - 1] = row;
  else return;
  rows.sort(bySupport);
}

const summary = { comparisons: 0, fixedAllies: 0, strictSame: 0, strictReversed: 0, mixed: 0 };
const minimumGames = [];
const topSame = [];
const topReversed = [];
const targetRows = [];
for (const [fixed, firstOptions] of byWeaponAndFixedAlly.get(firstWeapon)) {
  const secondOptions = byWeaponAndFixedAlly.get(secondWeapon).get(fixed);
  if (!secondOptions) continue;
  const common = [...firstOptions.keys()].filter((key) => secondOptions.has(key)).sort();
  if (common.length < 2) continue;
  summary.fixedAllies++;
  for (let i = 0; i < common.length; i++) {
    for (let j = i + 1; j < common.length; j++) {
      const row = compare(fixed, common[i], common[j], firstOptions, secondOptions);
      summary.comparisons++;
      minimumGames.push(row.minimumGames);
      const result = category(row);
      if (result === "same") {
        summary.strictSame++;
        offerTop(topSame, row);
      } else if (result === "reversed") {
        summary.strictReversed++;
        offerTop(topReversed, row);
      } else summary.mixed++;
    }
  }
  if ([firstCandidate, secondCandidate].every((key) => firstOptions.has(key) && secondOptions.has(key))) {
    targetRows.push(compare(fixed, firstCandidate, secondCandidate, firstOptions, secondOptions));
  }
}
minimumGames.sort((a, b) => a - b);
const quantile = (q) => minimumGames[Math.round((minimumGames.length - 1) * q)];
summary.minimumFourCellGames = { firstQuartile: quantile(0.25), median: quantile(0.5),
  thirdQuartile: quantile(0.75), maximum: quantile(1) };
targetRows.sort(bySupport);
const targetCounts = { fixedAllies: targetRows.length, strictSame: 0, strictReversed: 0, mixed: 0 };
for (const row of targetRows) {
  if (category(row) === "same") targetCounts.strictSame++;
  else if (category(row) === "reversed") targetCounts.strictReversed++;
  else targetCounts.mixed++;
}

const result = {
  source, firstWeapon, secondWeapon, firstCandidate, secondCandidate,
  method: "For every exact fixed ally, compare all pairs of exact third candidates observed with both weapons. A strict ordering needs win rate, lower mean rank, and stored raw team-mean RP to agree. Keep all pooled rows; no season, patch, tier, S badge, or minimum-game filter. Candidate comparisons overlap and are post-hoc descriptive, not independent tests or causal effects.",
  allCandidatePairs: { summary, topSame, topReversed },
  chosenCandidates: { counts: targetCounts, contexts: targetRows },
};
const output = `analysis-snapshots/composition-affinity/pooled-weapon-third-order-${firstWeapon.replace(":", "-")}-${secondWeapon.replace(":", "-")}-${firstCandidate.replace(":", "-")}-${secondCandidate.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify({ all: summary, chosen: targetCounts })}\n`);
