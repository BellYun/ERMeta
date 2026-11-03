import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Inspect every exact third option for one exact fixed pair in the cumulative
// snapshot. No season, tier, or game-count filter is applied.
const [date, first, second] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d+:\d+$/.test(first ?? "") || !/^\d+:\d+$/.test(second ?? "") || first === second) {
  throw new Error("Usage: analyze-pooled-fixed-pair-thirds.mjs YYYY-MM-DD FIRST SECOND");
}
const pair = [first, second].sort().join("+");
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const memberTotals = new Map();
const options = [];
for (const trio of trios) {
  const members = trio.key.split("+");
  for (const member of members) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0, rankSum: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    memberTotals.set(member, total);
  }
  if (members.includes(first) && members.includes(second)) {
    options.push({ ...trio, third: members.find((member) => member !== first && member !== second) });
  }
}
if (!options.length) throw new Error(`No trio options for ${pair}`);
const totals = options.reduce((sum, option) => ({
  games: sum.games + option.games,
  wins: sum.wins + option.wins,
  rankSum: sum.rankSum + option.rankSum,
  expectedWins: sum.expectedWins + option.games * memberTotals.get(option.third).wins / memberTotals.get(option.third).games,
  expectedRankSum: sum.expectedRankSum + option.games * memberTotals.get(option.third).rankSum / memberTotals.get(option.third).games,
}), { games: 0, wins: 0, rankSum: 0, expectedWins: 0, expectedRankSum: 0 });
const rows = options.map((option) => {
  const member = memberTotals.get(option.third);
  const otherGames = totals.games - option.games;
  const otherWins = totals.wins - option.wins;
  const otherRankSum = totals.rankSum - option.rankSum;
  const expectedWins = option.games * member.wins / member.games;
  const expectedRankSum = option.games * member.rankSum / member.games;
  return { third: option.third, games: option.games, wins: option.wins,
    averageRank: option.rankSum / option.games, uiS: option.uiS,
    otherGames, otherWins, otherAverageRank: otherRankSum / otherGames,
    rawWinDifferencePercentagePoints: 100 * (option.wins / option.games - otherWins / otherGames),
    rawAverageRankDifference: option.rankSum / option.games - otherRankSum / otherGames,
    memberAdjustedWinDifferencePercentagePoints: 100 * ((option.wins - expectedWins) / option.games
      - (otherWins - (totals.expectedWins - expectedWins)) / otherGames),
    memberAdjustedAverageRankDifference: (option.rankSum - expectedRankSum) / option.games
      - (otherRankSum - (totals.expectedRankSum - expectedRankSum)) / otherGames,
  };
}).sort((a, b) => a.third.localeCompare(b.third));
const result = { source, pair, total: { options: rows.length,
  games: totals.games, wins: totals.wins, averageRank: totals.rankSum / totals.games },
  method: "Compare each exact third candidate against every other third candidate for this fixed pair; all pooled trios remain. Member-adjusted differences subtract each exact third member's overall pooled win rate and average rank. UI S is retained only as an existing display label. Descriptive association, not causality.",
  options: rows };
const output = `analysis-snapshots/composition-affinity/pooled-fixed-pair-thirds-${first.replace(":", "-")}-${second.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ pair, total: result.total }, null, 2)}\n`);
