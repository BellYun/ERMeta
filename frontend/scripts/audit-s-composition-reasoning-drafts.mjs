import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

// Run from frontend/: node scripts/audit-s-composition-reasoning-drafts.mjs
//   YYYY-MM-DD candidate-drafts.ndjson [--require-all]
// A passing result means source wiring is valid, not that tactical prose is correct.
const [date, draftPath, ...options] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !draftPath) {
  throw new Error(
    "Usage: node scripts/audit-s-composition-reasoning-drafts.mjs YYYY-MM-DD candidate-drafts.ndjson [--require-all]"
  );
}
if (options.length > 1 || (options.length === 1 && options[0] !== "--require-all")) {
  throw new Error("Only --require-all is supported");
}
const requireAll = options.includes("--require-all");
const prefix = `analysis-snapshots/composition-affinity/s-reasoning-${date}`;
const summary = JSON.parse(readFileSync(`${prefix}-summary.json`, "utf8"));
const seed = JSON.parse(readFileSync("data/composition-explanations/seed.v1.json", "utf8"));
const l10n = JSON.parse(readFileSync(seed.skillTextSource, "utf8"));
const packets = new Map();
const input = createInterface({
  input: createReadStream(`${prefix}-model.ndjson.gz`).pipe(createGunzip()),
  crlfDelay: Infinity,
});
for await (const line of input) {
  if (!line) continue;
  const packet = JSON.parse(line);
  if (packets.has(packet.key)) throw new Error(`Duplicate model packet: ${packet.key}`);
  packets.set(packet.key, packet);
}
if (packets.size !== summary.displayedSCount) throw new Error("Model input coverage drifted");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function nonemptyList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim())
  );
}
const seen = new Set();
const counts = { proposed: 0, held: 0 };
const drafts = createInterface({ input: createReadStream(draftPath), crlfDelay: Infinity });
for await (const line of drafts) {
  if (!line) continue;
  const draft = JSON.parse(line);
  const packet = packets.get(draft.key);
  assert(packet && !seen.has(draft.key), `Unknown or duplicate S draft: ${draft.key}`);
  seen.add(draft.key);
  assert(draft.sourceSnapshot === packet.sourceSnapshot, `Source snapshot drift: ${draft.key}`);
  assert(draft.skillDigest === packet.skillDigest, `Skill source drift: ${draft.key}`);
  assert(["proposed", "held"].includes(draft.decision), `Invalid decision: ${draft.key}`);
  counts[draft.decision]++;
  assert(nonemptyList(draft.uncertainty), `Missing unknowns: ${draft.key}`);

  const sourceKeys = new Set(
    packet.members.flatMap((member) => [
      ...member.skillDescriptions.map((skill) => skill.sourceKey),
      ...(member.weaponGuide ? [member.weaponGuide.sourceKey] : []),
    ])
  );
  const comparisonKeys = new Set(
    packet.pairContexts.flatMap((context) =>
      context.selectedAlternatives.map((alternative) => alternative.key)
    )
  );
  const sourceEvidence = draft.evidence;
  assert(sourceEvidence && typeof sourceEvidence === "object", `Missing evidence: ${draft.key}`);
  assert(nonemptyList(sourceEvidence.skillSourceKeys), `Missing skill sources: ${draft.key}`);
  for (const key of sourceEvidence.skillSourceKeys) {
    assert(
      sourceKeys.has(key) && l10n[key],
      `Unrelated or missing skill source: ${draft.key} ${key}`
    );
  }
  assert(
    nonemptyList(sourceEvidence.samePairComparisons),
    `Missing fixed-pair comparisons: ${draft.key}`
  );
  for (const key of [
    ...sourceEvidence.samePairComparisons,
    ...(sourceEvidence.counterexampleKeys ?? []),
  ]) {
    assert(comparisonKeys.has(key), `Comparison missing from selected packet: ${draft.key} ${key}`);
  }

  if (draft.decision === "proposed") {
    assert(typeof draft.thesis === "string" && draft.thesis.trim(), `Missing thesis: ${draft.key}`);
    assert(
      typeof draft.paragraph === "string" && draft.paragraph.trim(),
      `Missing prose: ${draft.key}`
    );
    assert(nonemptyList(draft.conditions), `Missing conditions: ${draft.key}`);
    assert(nonemptyList(draft.breaksWhen), `Missing failure conditions: ${draft.key}`);
    for (const member of packet.members) {
      assert(draft.paragraph.includes(member.name), `Prose omits ${member.name}: ${draft.key}`);
    }
  } else {
    assert(
      typeof draft.holdReason === "string" && draft.holdReason.trim(),
      `Missing hold reason: ${draft.key}`
    );
    assert(!draft.paragraph, `Held draft has displayable prose: ${draft.key}`);
  }
}
if (requireAll && seen.size !== packets.size) {
  throw new Error(`Incomplete generation: ${seen.size}/${packets.size}`);
}
process.stdout.write(
  `${JSON.stringify({ drafts: seen.size, displayedS: packets.size, ...counts, missing: packets.size - seen.size, status: "source-wiring-valid-only" })}\n`
);
