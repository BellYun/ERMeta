import { readFileSync, writeFileSync } from "node:fs";

// Join two all-context candidate comparisons by the same third teammate.
// Keep all common contexts; the strict reversals are a descriptive subset.
const [date, anchorA, anchorB, first, second] = process.argv.slice(2);
const members = [anchorA, anchorB, first, second];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    !members.every((key) => /^\d+:\d+$/.test(key ?? "")) ||
    new Set(members).size !== members.length) {
  throw new Error("Usage: summarize-pooled-frontline-reversals.mjs YYYY-MM-DD ANCHOR_A ANCHOR_B FIRST SECOND");
}
const directory = "analysis-snapshots/composition-affinity";
const compact = (key) => key.replace(":", "-");
const inputPath = (anchor) =>
  `${directory}/pooled-candidate-contexts-${compact(anchor)}-${compact(first)}-${compact(second)}-${date}.json`;
const inputs = [anchorA, anchorB].map((anchor) => JSON.parse(readFileSync(inputPath(anchor), "utf8")));
for (let i = 0; i < inputs.length; i++) {
  if (inputs[i].anchor !== members[i] ||
      inputs[i].candidates[0] !== first || inputs[i].candidates[1] !== second) {
    throw new Error(`Unexpected input schema: ${inputPath(members[i])}`);
  }
}
const direction = (row) => row.firstBetterAll ? "first" : row.secondBetterAll ? "second" : "mixed";
const secondRows = new Map(inputs[1].contexts.filter((row) => row.difference)
  .map((row) => [row.otherAlly, row]));
const matrix = Object.fromEntries(["first", "second", "mixed"].map((a) =>
  [a, Object.fromEntries(["first", "second", "mixed"].map((b) => [b, 0]))]));
const contexts = [];
for (const a of inputs[0].contexts) {
  if (!a.difference) continue;
  const b = secondRows.get(a.otherAlly);
  if (!b) continue;
  const aDirection = direction(a);
  const bDirection = direction(b);
  matrix[aDirection][bDirection]++;
  contexts.push({ otherAlly: a.otherAlly, aDirection, bDirection,
    a: { first: a.results[first], second: a.results[second], difference: a.difference },
    b: { first: b.results[first], second: b.results[second], difference: b.difference },
    totalFourGames: a.results[first].games + a.results[second].games
      + b.results[first].games + b.results[second].games });
}
contexts.sort((a, b) => b.totalFourGames - a.totalFourGames || a.otherAlly.localeCompare(b.otherAlly));
const strictReversals = contexts.filter((row) =>
  (row.aDirection === "first" && row.bDirection === "second") ||
  (row.aDirection === "second" && row.bDirection === "first"));
const output = `${directory}/pooled-frontline-reversals-${members.map(compact).join("-")}-${date}.json`;
const result = { sources: [inputPath(anchorA), inputPath(anchorB)], anchorA, anchorB, first, second,
  method: "Join the two pooled all-context comparisons by identical other ally. First/second wins only when win rate is higher, mean rank lower, and stored raw mean RP higher; all other directions are mixed. No season/patch/tier split, game threshold, S badge or RP centering. Contexts overlap and are observational.",
  counts: { commonOtherAllies: contexts.length, matrix,
    firstToSecond: matrix.first.second, secondToFirst: matrix.second.first },
  strictReversals };
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(result.counts)}\n`);
