import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Recompute the report's exact third-candidate contrasts from the pooled
// preaggregate. The win-rate interval describes sampling error only; these
// cases were selected after a broad scan, so it is not a discovery test.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: audit-preaggregate-context-examples.mjs YYYY-MM-DD");
}
const stem = `analysis-snapshots/composition-affinity`;
const source = `${stem}/pooled-all-trios-${date}.ndjson.gz`;
const trios = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const byKey = new Map(trios.map((row) => [row.key.split("+").sort().join("+"), row]));
const examples = [
  { group: "haze-tsubame-isol", anchor: "58:10", second: "20:4", first: "70:6", other: "9:10" },
  { group: "haze-tsubame-isol", anchor: "58:10", second: "76:3", first: "70:6", other: "9:10" },
  { group: "garnet-adriana-lenore", anchor: "76:3", second: "31:7", first: "17:5", other: "75:22" },
  { group: "garnet-adriana-lenore", anchor: "76:3", second: "72:11", first: "17:5", other: "75:22" },
  { group: "katya-barbara-adina", anchor: "72:11", second: "55:14", first: "26:9", other: "52:24" },
  { group: "katya-barbara-adina", anchor: "72:11", second: "30:13", first: "26:9", other: "52:24" },
  { group: "katya-garnet-mirka", anchor: "72:11", second: "58:10", first: "76:3", other: "85:13" },
  { group: "katya-garnet-mirka", anchor: "72:11", second: "67:14", first: "76:3", other: "85:13" },
  { group: "isol-adriana-frontline", anchor: "9:10", second: "17:5", first: "30:13", other: "20:4" },
  { group: "isol-adriana-frontline", anchor: "9:10", second: "17:5", first: "55:14", other: "20:4" },
  { group: "isol-adriana-frontline-other", anchor: "9:10", second: "17:5", first: "30:13", other: "76:3" },
  { group: "isol-adriana-frontline-other", anchor: "9:10", second: "17:5", first: "55:14", other: "76:3" },
  { group: "rosie-adriana-frontline", anchor: "21:9", second: "17:5", first: "30:13", other: "20:4" },
  { group: "rosie-adriana-frontline", anchor: "21:9", second: "17:5", first: "55:14", other: "20:4" },
  { group: "rosie-adriana-frontline-other", anchor: "21:9", second: "17:5", first: "30:13", other: "76:3" },
  { group: "rosie-adriana-frontline-other", anchor: "21:9", second: "17:5", first: "55:14", other: "76:3" },
  { group: "haze-katya-frontline-counterexample", anchor: "58:10", second: "72:11", first: "30:13", other: "20:4" },
  { group: "haze-katya-frontline-counterexample", anchor: "58:10", second: "72:11", first: "55:14", other: "20:4" },
  { group: "rio-adriana-frontline-counterexample", anchor: "31:7", second: "17:5", first: "30:13", other: "76:3" },
  { group: "rio-adriana-frontline-counterexample", anchor: "31:7", second: "17:5", first: "55:14", other: "76:3" },
  { group: "katya-shou-weapons", anchor: "72:11", second: "75:22", first: "13:19", other: "13:15" },
  { group: "katya-shou-weapons", anchor: "72:11", second: "17:5", first: "13:19", other: "13:15" },
];
function wilson(row) {
  const p = row.wins / row.games;
  const z = 1.959963984540054;
  const z2 = z * z;
  const denominator = 1 + z2 / row.games;
  const center = (p + z2 / (2 * row.games)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / row.games + z2 / (4 * row.games ** 2)) / denominator;
  return { lower: center - half, upper: center + half };
}
function metrics(row) {
  return { games: row.games, wins: row.wins, winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games, averageRP: row.rp / row.games,
    uiS: row.uiS };
}
const contrasts = examples.map((example) => {
  const lookup = (member) => byKey.get([example.anchor, example.second, member].sort().join("+"));
  const a = lookup(example.first);
  const b = lookup(example.other);
  if (!a || !b) throw new Error(`Missing trio for ${JSON.stringify(example)}`);
  const pa = a.wins / a.games;
  const pb = b.wins / b.games;
  const wa = wilson(a);
  const wb = wilson(b);
  const difference = pa - pb;
  const winRateDifferenceInterval95 = {
    lowerPercentagePoints: 100 * (difference - Math.sqrt((pa - wa.lower) ** 2 + (wb.upper - pb) ** 2)),
    upperPercentagePoints: 100 * (difference + Math.sqrt((wa.upper - pa) ** 2 + (pb - wb.lower) ** 2)),
  };
  return { ...example, firstMetrics: metrics(a), otherMetrics: metrics(b),
    winRateDifferencePercentagePoints: 100 * difference,
    averageRankDifference: a.rankSum / a.games - b.rankSum / b.games,
    averageRPDifference: a.rp / a.games - b.rp / b.games,
    winRateDifferenceInterval95 };
});
const result = { source,
  method: "Exact trio candidate contrasts from pooled preaggregated rows. RP is stored total_rp / total_games. The simple Newcombe/Wilson 95% win-rate interval treats games as independent and does not correct post-selection or multiple comparisons. RP and mean rank intervals cannot be recovered from this aggregate.",
  contrasts };
const output = `${stem}/preaggregate-context-example-audit-${date}.json`;
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${output}: ${contrasts.length} contrasts\n`);
