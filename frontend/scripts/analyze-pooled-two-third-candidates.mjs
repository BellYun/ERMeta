import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Across every exact second member for an anchor, inspect two chosen exact
// third members against all other candidates in that same fixed pair.
const [date, anchor, firstThird, secondThird] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
  ![anchor, firstThird, secondThird].every((member) => /^\d+:\d+$/.test(member ?? "")) ||
  new Set([anchor, firstThird, secondThird]).size !== 3) {
  throw new Error("Usage: analyze-pooled-two-third-candidates.mjs YYYY-MM-DD ANCHOR FIRST_THIRD SECOND_THIRD");
}
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
  if (!members.includes(anchor)) continue;
  for (const other of members.filter((member) => member !== anchor)) {
    const third = members.find((member) => member !== anchor && member !== other);
    const options = pairOptions.get(other) ?? new Map();
    options.set(third, trio);
    pairOptions.set(other, options);
  }
}

function metric(option, totals, member) {
  const total = memberTotals.get(member);
  const expectedWins = option.games * total.wins / total.games;
  const expectedRankSum = option.games * total.rankSum / total.games;
  const otherGames = totals.games - option.games;
  return { games: option.games, wins: option.wins,
    averageRank: option.rankSum / option.games, uiS: option.uiS,
    memberAdjustedWinDifferencePercentagePoints: 100 * ((option.wins - expectedWins) / option.games
      - (totals.wins - option.wins - (totals.expectedWins - expectedWins)) / otherGames),
    memberAdjustedAverageRankDifference: (option.rankSum - expectedRankSum) / option.games
      - (totals.rankSum - option.rankSum - (totals.expectedRankSum - expectedRankSum)) / otherGames,
  };
}

const contexts = [];
for (const [other, options] of pairOptions) {
  if (other === firstThird || other === secondThird ||
    !options.has(firstThird) || !options.has(secondThird)) continue;
  const totals = { games: 0, wins: 0, rankSum: 0, expectedWins: 0, expectedRankSum: 0 };
  for (const [third, option] of options) {
    const member = memberTotals.get(third);
    totals.games += option.games;
    totals.wins += option.wins;
    totals.rankSum += option.rankSum;
    totals.expectedWins += option.games * member.wins / member.games;
    totals.expectedRankSum += option.games * member.rankSum / member.games;
  }
  contexts.push({ other, pairGames: totals.games, pairWins: totals.wins,
    first: metric(options.get(firstThird), totals, firstThird),
    second: metric(options.get(secondThird), totals, secondThird) });
}
contexts.sort((a, b) => a.other.localeCompare(b.other));
const better = (row) => row.memberAdjustedWinDifferencePercentagePoints > 0 && row.memberAdjustedAverageRankDifference < 0;
const worse = (row) => row.memberAdjustedWinDifferencePercentagePoints < 0 && row.memberAdjustedAverageRankDifference > 0;
const result = { source, anchor, firstThird, secondThird,
  method: "Hold the anchor and each exact second member fixed. For both chosen third members, compare their pooled wins and average rank with all other third options for that pair after subtracting each third member's overall pooled mean. All contexts and games are retained; no season, tier, or minimum-game filter. Descriptive association, not causality.",
  counts: { matchedSecondMembers: contexts.length,
    bothBetter: contexts.filter((row) => better(row.first) && better(row.second)).length,
    bothWorse: contexts.filter((row) => worse(row.first) && worse(row.second)).length },
  contexts };
const output = `analysis-snapshots/composition-affinity/pooled-two-third-candidates-${anchor.replace(":", "-")}-${firstThird.replace(":", "-")}-${secondThird.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result.counts, null, 2)}\n`);
