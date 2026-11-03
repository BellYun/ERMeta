import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createGunzip, gunzipSync } from "node:zlib";
import { createInterface } from "node:readline";

// Re-audit previously discussed exact-third contrasts against the rebuilt
// all-season source. These cases are a post-selection audit, not discovery.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: audit-pooled-rp-restart.mjs YYYY-MM-DD");
}
const stem = `analysis-snapshots/composition-affinity/pooled-rp-restart-${date}`;
const trios = gunzipSync(readFileSync(`${stem}-trios.ndjson.gz`)).toString("utf8")
  .trimEnd().split("\n").map(JSON.parse);
const byKey = new Map(trios.map((row) => [row.key, row]));
const memberTotals = new Map();
for (const trio of trios) {
  for (const member of trio.key.split("+")) {
    const total = memberTotals.get(member) ?? { games: 0, wins: 0,
      rankSum: 0, centeredRpSum: 0 };
    total.games += trio.games;
    total.wins += trio.wins;
    total.rankSum += trio.rankSum;
    total.centeredRpSum += trio.centeredRpSum;
    memberTotals.set(member, total);
  }
}
const claims = [
  { fixed: ["58:10", "72:11"], first: "76:3", second: "20:4" },
  { fixed: ["72:11", "75:22"], first: "76:3", second: "20:4" },
  { fixed: ["72:11", "87:24"], first: "76:3", second: "20:4" },
  { fixed: ["9:10", "17:5"], first: "30:13", second: "20:4" },
  { fixed: ["9:10", "17:5"], first: "55:14", second: "20:4" },
  { fixed: ["72:11", "75:22"], first: "13:19", second: "13:15" },
  { fixed: ["72:11", "17:5"], first: "13:19", second: "13:15" },
];
function numericMemberOrder(left, right) {
  const [aChar, aWeapon] = left.split(":").map(Number);
  const [bChar, bWeapon] = right.split(":").map(Number);
  return aChar - bChar || aWeapon - bWeapon;
}
function getTrio(fixed, third) {
  const key = [...fixed, third].sort(numericMemberOrder).join("+");
  const row = byKey.get(key);
  if (!row) throw new Error(`Missing trio: ${key}`);
  return row;
}
const z = 1.959963984540054;
function wilson(wins, games) {
  const p = wins / games;
  const z2 = z * z;
  const divisor = 1 + z2 / games;
  const center = (p + z2 / (2 * games)) / divisor;
  const half = z * Math.sqrt(p * (1 - p) / games + z2 / (4 * games * games)) / divisor;
  return [center - half, center + half];
}
function observe(row) {
  return { games: row.games, wins: row.wins, winRatePercentage: 100 * row.wins / row.games,
    averageRank: row.rankSum / row.games,
    centeredRpPerGame: row.centeredRpSum / row.games,
    legacyGames: row.legacyGames, earnedGames: row.earnedGames };
}
const comparisons = claims.map(({ fixed, first, second }) => {
  const a = getTrio(fixed, first);
  const b = getTrio(fixed, second);
  const pa = a.wins / a.games;
  const pb = b.wins / b.games;
  const [al, ah] = wilson(a.wins, a.games);
  const [bl, bh] = wilson(b.wins, b.games);
  const winDiff = pa - pb;
  const memberA = memberTotals.get(first);
  const memberB = memberTotals.get(second);
  const memberWinDiff = memberA.wins / memberA.games - memberB.wins / memberB.games;
  const memberRankDiff = memberA.rankSum / memberA.games - memberB.rankSum / memberB.games;
  const memberRpDiff = memberA.centeredRpSum / memberA.games
    - memberB.centeredRpSum / memberB.games;
  const rankDiff = a.rankSum / a.games - b.rankSum / b.games;
  const rpDiff = a.centeredRpSum / a.games - b.centeredRpSum / b.games;
  return { fixed, first, second, firstObserved: observe(a), secondObserved: observe(b),
    winDifferencePercentagePoints: 100 * winDiff,
    winDifferenceNewcombe95PercentagePoints: [
      100 * (winDiff - Math.hypot(pa - al, bh - pb)),
      100 * (winDiff + Math.hypot(ah - pa, pb - bl)),
    ],
    averageRankDifference: rankDiff,
    centeredRpDifferencePerGame: rpDiff,
    memberAdjustedWinDifferencePercentagePoints: 100 * (winDiff - memberWinDiff),
    memberAdjustedAverageRankDifference: rankDiff - memberRankDiff,
    memberAdjustedCenteredRpDifferencePerGame: rpDiff - memberRpDiff };
});
const wanted = new Set(claims.flatMap(({ fixed, first, second }) => {
  const pair = [...fixed].sort(numericMemberOrder).join("+");
  return [`${pair}|${first}`, `${pair}|${second}`];
}));
const allOtherContrasts = {};
const lines = createInterface({ input: createReadStream(`${stem}-pair-thirds.ndjson.gz`)
  .pipe(createGunzip()), crlfDelay: Infinity });
for await (const line of lines) {
  const row = JSON.parse(line);
  const key = `${row.pair}|${row.third}`;
  if (wanted.has(key)) allOtherContrasts[key] = row;
}
for (const comparison of comparisons) {
  const pair = [...comparison.fixed].sort(numericMemberOrder).join("+");
  comparison.firstVersusAllOthers = allOtherContrasts[`${pair}|${comparison.first}`];
  comparison.secondVersusAllOthers = allOtherContrasts[`${pair}|${comparison.second}`];
}
const result = {
  source: `${stem}-trios.ndjson.gz`,
  method: "Post-selection re-audit of seven prior contrasts. Win differences use a simple Newcombe 95% interval based on independent binomial games. Centered RP is patch/tier baseline-relative performance, not actual net RP gain. No within-trio RP variance is stored, so no RP interval or significance claim is made.",
  comparisons,
};
writeFileSync(`${stem}-claim-audit.json`, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(comparisons.map(({ fixed, first, second,
  winDifferencePercentagePoints, winDifferenceNewcombe95PercentagePoints,
  averageRankDifference, centeredRpDifferencePerGame }) => ({ fixed, first, second,
  winDifferencePercentagePoints, winDifferenceNewcombe95PercentagePoints,
  averageRankDifference, centeredRpDifferencePerGame })), null, 2)}\n`);
