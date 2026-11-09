import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Exploratory inventory only. Keep every exact second ally and every game count.
// The four candidate names revisit the player's first-contact question;
// no outcome here is promoted into a recommendation rule.
const date = process.argv[2];
const anchor = process.argv[3] ?? "17:5";
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d+:\d+$/.test(anchor)) {
  throw new Error("Usage: explore-adriana-frontline-contexts.mjs YYYY-MM-DD [ANCHOR]");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const rows = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const candidates = ["30:13", "55:14", "20:4", "76:3"];
if (candidates.includes(anchor)) throw new Error("Anchor cannot be one of the four candidates");
const bySecond = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  if (!members.includes(anchor)) continue;
  const candidate = candidates.find((key) => members.includes(key));
  if (!candidate) continue;
  const second = members.find((key) => key !== anchor && key !== candidate);
  if (!second || candidates.includes(second)) continue;
  const context = bySecond.get(second) ?? {};
  context[candidate] = { games: row.games, wins: row.wins,
    winRate: row.wins / row.games, averageRank: row.rankSum / row.games,
    averageRP: row.rp / row.games, uiS: row.uiS };
  bySecond.set(second, context);
}
function better(a, b) {
  return a.winRate > b.winRate && a.averageRank < b.averageRank && a.averageRP > b.averageRP;
}
const contexts = [...bySecond].map(([second, results]) => {
  const complete = candidates.every((key) => results[key]);
  const allFrontlinersAhead = complete && ["30:13", "55:14"].every((first) =>
    ["20:4", "76:3"].every((other) => better(results[first], results[other])));
  const allAlternativesAhead = complete && ["20:4", "76:3"].every((first) =>
    ["30:13", "55:14"].every((other) => better(results[first], results[other])));
  return { second, results, complete, allFrontlinersAhead, allAlternativesAhead,
    minimumGames: complete ? Math.min(...candidates.map((key) => results[key].games)) : null,
    totalGames: candidates.reduce((sum, key) => sum + (results[key]?.games ?? 0), 0) };
}).sort((a, b) => b.totalGames - a.totalGames || a.second.localeCompare(b.second));
const result = { source, anchor, candidates,
  method: "For every exact second ally of the chosen anchor, retain raw pooled outcomes for Eleven hammer, Estelle axe, Lennox whip and Garnet bat. No game threshold, patch/tier split or S filter. Strict all-metric ordering is an exploratory pattern, not a significance or skill-synergy test.",
  counts: { secondAllies: contexts.length,
    complete: contexts.filter((x) => x.complete).length,
    allFrontlinersAhead: contexts.filter((x) => x.allFrontlinersAhead).length,
    allAlternativesAhead: contexts.filter((x) => x.allAlternativesAhead).length },
  contexts };
const output = anchor === "17:5"
  ? `analysis-snapshots/composition-affinity/adriana-four-frontliners-all-contexts-${date}.json`
  : `analysis-snapshots/composition-affinity/four-frontliners-by-anchor-${anchor.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result.counts)}\n`);
