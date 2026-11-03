import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip, gunzipSync } from "node:zlib";

// Run from frontend/: node scripts/audit-s-composition-reasoning-packets.mjs YYYY-MM-DD
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: node scripts/audit-s-composition-reasoning-packets.mjs YYYY-MM-DD");
}
const prefix = `analysis-snapshots/composition-affinity/s-reasoning-${date}`;
const summary = JSON.parse(readFileSync(`${prefix}-summary.json`, "utf8"));
const s = JSON.parse(
  readFileSync("analysis-snapshots/composition-affinity/all-displayed-s-2026-10-12.json", "utf8")
);
const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const rows = gunzipSync(readFileSync(seed.sourceSnapshot))
  .toString("utf8")
  .trimEnd()
  .split("\n")
  .map(JSON.parse);
const rowByKey = new Map(rows.map((row) => [row.key, row]));
const pairKeys = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  for (let index = 0; index < 3; index++) {
    const pair = members.filter((_, memberIndex) => memberIndex !== index).join("+");
    const keys = pairKeys.get(pair) ?? new Set();
    keys.add(row.key);
    pairKeys.set(pair, keys);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function close(first, second) {
  return Math.abs(first - second) < 1e-8;
}
function verifyMetrics(metrics, row, key) {
  assert(metrics.games === row.games && metrics.wins === row.wins, `Games/wins drift: ${key}`);
  assert(close(metrics.winRate, row.wins / row.games), `Win rate drift: ${key}`);
  assert(close(metrics.averageRank, row.rankSum / row.games), `Rank drift: ${key}`);
  assert(close(metrics.averageRP, row.rp / row.games), `RP drift: ${key}`);
}
function direction(target, alternative) {
  if (
    target.winRate > alternative.winRate &&
    target.averageRank < alternative.averageRank &&
    target.averageRP > alternative.averageRP
  ) {
    return "aheadAllThree";
  }
  if (
    target.winRate < alternative.winRate &&
    target.averageRank > alternative.averageRank &&
    target.averageRP < alternative.averageRP
  ) {
    return "behindAllThree";
  }
  return "mixed";
}
async function* records(path) {
  const input = createInterface({
    input: createReadStream(path).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of input) {
    if (line) yield JSON.parse(line);
  }
}

const sKeys = new Set(s.sCompositions.map((row) => row.key));
const seen = new Set();
const checks = new Map();
let comparisonCount = 0;
for await (const record of records(`${prefix}-full.ndjson.gz`)) {
  assert(
    sKeys.has(record.key) && !seen.has(record.key),
    `Missing or duplicate S key: ${record.key}`
  );
  seen.add(record.key);
  assert(record.sourceSnapshot === seed.sourceSnapshot, `Source drift: ${record.key}`);
  verifyMetrics(record.metrics, rowByKey.get(record.key), record.key);
  assert(
    record.members.length === 3 && record.pairContexts.length === 3,
    `Trio shape: ${record.key}`
  );
  const members = record.key.split("+");
  assert(
    record.members.every((profile, index) => profile.member === members[index]),
    `Member order: ${record.key}`
  );
  const contextChecks = [];
  for (const context of record.pairContexts) {
    const expected = pairKeys.get(context.pair);
    assert(expected?.has(record.key), `Bad fixed pair: ${record.key} ${context.pair}`);
    assert(context.observedAlternatives === expected.size - 1, `Alternative count: ${record.key}`);
    assert(
      context.alternatives.length === expected.size - 1,
      `Incomplete alternatives: ${record.key}`
    );
    const alternativeKeys = new Set();
    const directions = { aheadAllThree: 0, behindAllThree: 0, mixed: 0 };
    for (const [alternativeKey, targetDirection] of context.alternatives) {
      assert(
        expected.has(alternativeKey) && alternativeKey !== record.key,
        `Unrelated alternative: ${record.key}`
      );
      assert(!alternativeKeys.has(alternativeKey), `Duplicate alternative: ${record.key}`);
      alternativeKeys.add(alternativeKey);
      const row = rowByKey.get(alternativeKey);
      const alternativeMetrics = {
        winRate: row.wins / row.games,
        averageRank: row.rankSum / row.games,
        averageRP: row.rp / row.games,
      };
      assert(
        targetDirection === direction(record.metrics, alternativeMetrics),
        `Wrong direction: ${record.key} ${alternativeKey}`
      );
      directions[targetDirection]++;
    }
    assert(
      JSON.stringify(directions) === JSON.stringify(context.directions),
      `Direction counts: ${record.key}`
    );
    const selected = new Set();
    for (const label of ["aheadAllThree", "behindAllThree", "mixed"]) {
      const expectedTop = context.alternatives
        .filter(([, targetDirection]) => targetDirection === label)
        .slice(0, 2)
        .map(([key]) => key);
      for (const key of expectedTop) selected.add(key);
    }
    assert(
      JSON.stringify([...selected]) ===
        JSON.stringify(context.selectedAlternatives.map((item) => item.key)),
      `Selected alternatives drift: ${record.key}`
    );
    comparisonCount += context.alternatives.length;
    contextChecks.push({ pair: context.pair, directions, selected: [...selected] });
  }
  checks.set(record.key, { skillDigest: record.skillDigest, contextChecks });
}

const seenModel = new Set();
for await (const record of records(`${prefix}-model.ndjson.gz`)) {
  const check = checks.get(record.key);
  assert(check && !seenModel.has(record.key), `Unknown or duplicate model input: ${record.key}`);
  seenModel.add(record.key);
  assert(record.skillDigest === check.skillDigest, `Skill digest drift: ${record.key}`);
  assert(record.pairContexts.length === 3, `Missing model contexts: ${record.key}`);
  for (let index = 0; index < 3; index++) {
    const context = record.pairContexts[index];
    const expected = check.contextChecks[index];
    assert(!("alternatives" in context), `Full alternatives in compact input: ${record.key}`);
    assert(context.pair === expected.pair, `Model pair drift: ${record.key}`);
    assert(
      JSON.stringify(context.directions) === JSON.stringify(expected.directions),
      `Model direction drift: ${record.key}`
    );
    assert(
      JSON.stringify(context.selectedAlternatives.map((item) => item.key)) ===
        JSON.stringify(expected.selected),
      `Model selections drift: ${record.key}`
    );
  }
}
assert(seen.size === sKeys.size && seenModel.size === sKeys.size, "Incomplete S coverage");
assert(summary.displayedSCount === seen.size, "Summary S count drift");
assert(summary.alternativeComparisons === comparisonCount, "Summary comparison count drift");
process.stdout.write(
  `${JSON.stringify({ displayedS: seen.size, fullEvidence: seen.size, modelInputs: seenModel.size, alternativeComparisons: comparisonCount, status: "exact-source-coverage-valid" })}\n`
);
