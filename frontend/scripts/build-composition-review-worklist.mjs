import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip, gzipSync } from "node:zlib";

// Run from frontend/: node scripts/build-composition-review-worklist.mjs YYYY-MM-DD
// This screens every observed exact trio. Statistical comparisons are review inputs,
// not a verdict about which combat mechanism caused the observed result.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: node scripts/build-composition-review-worklist.mjs YYYY-MM-DD");
}

const root = process.cwd();
const seed = JSON.parse(readFileSync(join(root, "data/composition-explanations/seed.v1.json")));
const displayedS = JSON.parse(
  readFileSync(
    join(root, "analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json")
  )
);
const sKeys = new Set(displayedS.sCompositions.map((row) => row.key));
const explanations = new Map(seed.explanations.map((item) => [item.key, item]));

const rows = [];
const rowByKey = new Map();
const pairContexts = new Map();
const input = createInterface({
  input: createReadStream(join(root, seed.sourceSnapshot)).pipe(createGunzip()),
  crlfDelay: Infinity,
});
for await (const line of input) {
  if (!line) continue;
  const row = JSON.parse(line);
  if (rowByKey.has(row.key)) throw new Error(`Duplicate exact trio: ${row.key}`);
  rows.push(row);
  rowByKey.set(row.key, row);
  const members = row.key.split("+");
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const siblings = pairContexts.get(pair) ?? [];
    siblings.push(row);
    pairContexts.set(pair, siblings);
  }
}

for (const key of sKeys) {
  if (!rowByKey.has(key)) throw new Error(`Displayed S key missing from source: ${key}`);
}
for (const key of explanations.keys()) {
  if (!rowByKey.has(key)) throw new Error(`Explanation key missing from source: ${key}`);
}

function metrics(row) {
  return {
    games: row.games,
    wins: row.wins,
    winRate: row.wins / row.games,
    averageRank: row.rankSum / row.games,
    averageRP: row.rp / row.games,
  };
}

function compare(first, second) {
  const win = first.wins / first.games - second.wins / second.games;
  const rank = second.rankSum / second.games - first.rankSum / first.games;
  const rp = first.rp / first.games - second.rp / second.games;
  return win > 0 && rank > 0 && rp > 0
    ? "aheadAllThree"
    : win < 0 && rank < 0 && rp < 0
      ? "behindAllThree"
      : "mixed";
}

const statusCounts = {};
const sStatusCounts = {};
const manifest = [];
for (const row of rows) {
  const explanation = explanations.get(row.key);
  const status = explanation?.reviewStatus ?? "pending-mechanics-review";
  statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  const isDisplayedS = sKeys.has(row.key);
  if (isDisplayedS) sStatusCounts[status] = (sStatusCounts[status] ?? 0) + 1;
  const members = row.key.split("+");
  const pairComparisons = [];
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const siblings = pairContexts.get(pair);
    const outcomes = { aheadAllThree: 0, behindAllThree: 0, mixed: 0 };
    for (const sibling of siblings) {
      if (sibling.key !== row.key) outcomes[compare(row, sibling)]++;
    }
    pairComparisons.push({ pair, comparedWith: siblings.length - 1, ...outcomes });
  }
  manifest.push(
    JSON.stringify({
      key: row.key,
      metrics: metrics(row),
      reviewStatus: status,
      isDisplayedS,
      pairComparisons,
    })
  );
}

const prefix = join(root, `analysis-snapshots/composition-affinity/review-worklist-${date}`);
writeFileSync(`${prefix}.ndjson.gz`, gzipSync(`${manifest.join("\n")}\n`));
const summary = {
  sourceSnapshot: seed.sourceSnapshot,
  sourceUpdatedAtKst: seed.sourceUpdatedAtKst,
  sourceCount: rows.length,
  exactPairContexts: pairContexts.size,
  displayedSSnapshot: "analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json",
  displayedSCount: sKeys.size,
  reviewStatusCounts: statusCounts,
  displayedSReviewStatusCounts: sStatusCounts,
  manifest: `analysis-snapshots/composition-affinity/review-worklist-${date}.ndjson.gz`,
  interpretation:
    "Every exact trio was statistically screened against all observed third-member alternatives for each of its three fixed pairs, with no season, patch, tier, or game-count exclusions. This is not a mechanics review or a causal verdict. Displayed S is a work-order marker from the earlier UI snapshot, not a quality label.",
};
writeFileSync(`${prefix}.json`, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);
