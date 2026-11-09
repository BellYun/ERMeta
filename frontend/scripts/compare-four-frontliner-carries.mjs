import { readFileSync, writeFileSync } from "node:fs";

// Cross-check every one of the 12 metric inequalities behind the existing
// two-frontliner-versus-two-alternative marker for two exact carry choices.
const [date, carryA, carryB] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
    ![carryA, carryB].every((key) => /^\d+:\d+$/.test(key ?? "")) || carryA === carryB) {
  throw new Error("Usage: compare-four-frontliner-carries.mjs YYYY-MM-DD CARRY_A CARRY_B");
}
const directory = "analysis-snapshots/composition-affinity";
const source = (carry) => `${directory}/four-frontliners-by-anchor-${carry.replace(":", "-")}-${date}.json`;
const inputs = [carryA, carryB].map((carry) => JSON.parse(readFileSync(source(carry), "utf8")));
if (inputs[0].anchor !== carryA || inputs[1].anchor !== carryB ||
    JSON.stringify(inputs[0].candidates) !== JSON.stringify(inputs[1].candidates) ||
    inputs[0].candidates.length !== 4) {
  throw new Error("Inputs must have the requested anchors and identical four candidates");
}
const [frontA, frontB, alternativeA, alternativeB] = inputs[0].candidates;
const frontliners = [frontA, frontB];
const alternatives = [alternativeA, alternativeB];

function evaluate(context) {
  const comparisons = [];
  for (const front of frontliners) {
    for (const alternative of alternatives) {
      const a = context.results[front];
      const b = context.results[alternative];
      comparisons.push({ front, alternative,
        games: [a.games, b.games],
        winRatePercentagePoints: 100 * (a.winRate - b.winRate),
        averageRank: a.averageRank - b.averageRank,
        averageRP: a.averageRP - b.averageRP,
        winAhead: a.winRate > b.winRate,
        rankAhead: a.averageRank < b.averageRank,
        rpAhead: a.averageRP > b.averageRP });
    }
  }
  const passCount = comparisons.reduce((sum, row) => sum + Number(row.winAhead)
    + Number(row.rankAhead) + Number(row.rpAhead), 0);
  if (context.allFrontlinersAhead !== (passCount === 12)) {
    throw new Error(`Input marker disagrees with metric values for ${context.second}`);
  }
  return { passCount, allFrontlinersAhead: passCount === 12, comparisons,
    totalGames: context.totalGames, minimumGames: context.minimumGames };
}

const bySecondB = new Map(inputs[1].contexts.filter((row) => row.complete).map((row) => [row.second, row]));
const contexts = inputs[0].contexts.filter((row) => row.complete && bySecondB.has(row.second))
  .map((row) => ({ second: row.second, a: evaluate(row), b: evaluate(bySecondB.get(row.second)) }))
  .sort((left, right) =>
    (right.a.totalGames + right.b.totalGames) - (left.a.totalGames + left.b.totalGames)
      || left.second.localeCompare(right.second));
const counts = { commonComplete: contexts.length,
  bothAllAhead: contexts.filter((row) => row.a.allFrontlinersAhead && row.b.allFrontlinersAhead).length,
  onlyAAllAhead: contexts.filter((row) => row.a.allFrontlinersAhead && !row.b.allFrontlinersAhead).length,
  onlyBAllAhead: contexts.filter((row) => !row.a.allFrontlinersAhead && row.b.allFrontlinersAhead).length,
  neitherAllAhead: contexts.filter((row) => !row.a.allFrontlinersAhead && !row.b.allFrontlinersAhead).length };
const sign = (value) => value > 0 ? 1 : value < 0 ? -1 : 0;
const pairDirectionAgreement = frontliners.flatMap((front) => alternatives.map((alternative) => {
  const metrics = Object.fromEntries([
    "winRatePercentagePoints", "averageRank", "averageRP",
  ].map((metric) => {
    const same = contexts.filter((context) => {
      const a = context.a.comparisons.find((row) => row.front === front && row.alternative === alternative);
      const b = context.b.comparisons.find((row) => row.front === front && row.alternative === alternative);
      return sign(a[metric]) === sign(b[metric]);
    }).length;
    return [metric, { same, different: contexts.length - same }];
  }));
  return { front, alternative, metrics };
}));
const output = `${directory}/four-frontliner-carry-contrast-${carryA.replace(":", "-")}-${carryB.replace(":", "-")}-${date}.json`;
writeFileSync(output, `${JSON.stringify({ sources: [source(carryA), source(carryB)],
  carryA, carryB, frontliners, alternatives,
  method: "For every identical second ally where all four exact trio candidates are observed for both carries, retain all 12 raw pooled win-rate/rank/RP inequalities. Pair-direction agreement counts positive, negative and exact zero as separate signs. No season/patch/tier split, game threshold, S badge or RP centering. The inequalities reuse the same four observations and are descriptive, not independent tests.",
  counts, pairDirectionAgreement, contexts }, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(counts)}\n`);
