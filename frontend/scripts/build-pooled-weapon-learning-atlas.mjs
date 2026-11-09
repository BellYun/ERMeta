import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Review examples from every multiweapon character without filtering the
// underlying all-season exact-trio comparisons by badge, tier, or game count.
const [date, requestedCountText] = process.argv.slice(2);
const requestedCount = Number(requestedCountText);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !Number.isInteger(requestedCount) || requestedCount < 1) {
  throw new Error("Usage: build-pooled-weapon-learning-atlas.mjs YYYY-MM-DD EXAMPLE_COUNT");
}
const source = `analysis-snapshots/composition-affinity/pooled-all-trios-${date}.ndjson.gz`;
const rows = gunzipSync(readFileSync(source)).toString("utf8").trimEnd().split("\n").map(JSON.parse);
const l10n = JSON.parse(readFileSync("public/l10n/Korean.json", "utf8"));
const weaponSource = readFileSync("src/lib/weaponMap.ts", "utf8");
const enumBlock = weaponSource.split("export const WEAPON_ENUM_BY_CODE: Record<number, string> = {")[1]?.split("};")[0];
if (!enumBlock) throw new Error("Weapon enum map format changed");
const weaponEnums = Object.fromEntries([...enumBlock.matchAll(/(\d+):\s*"([^"]+)"/g)]
  .map(([, code, name]) => [code, name]));

const weaponsByCharacter = new Map();
for (const row of rows) {
  for (const member of row.key.split("+")) {
    const [character, weapon] = member.split(":");
    const weapons = weaponsByCharacter.get(character) ?? new Set();
    weapons.add(weapon);
    weaponsByCharacter.set(character, weapons);
  }
}
const multiweaponCharacters = new Set([...weaponsByCharacter]
  .filter(([, weapons]) => weapons.size > 1).map(([character]) => character));
const byCharacterAndAllies = new Map();
for (const row of rows) {
  const members = row.key.split("+");
  for (let i = 0; i < members.length; i++) {
    const [character, weapon] = members[i].split(":");
    if (!multiweaponCharacters.has(character)) continue;
    const allies = members.filter((_, index) => index !== i).sort().join("+");
    const contexts = byCharacterAndAllies.get(character) ?? new Map();
    const options = contexts.get(allies) ?? new Map();
    options.set(weapon, row);
    contexts.set(allies, options);
    byCharacterAndAllies.set(character, contexts);
  }
}

function metrics(row) {
  return { key: row.key, games: row.games, wins: row.wins,
    winRate: row.wins / row.games, averageRank: row.rankSum / row.games,
    averageRP: row.rp / row.games };
}
function compare(a, b) {
  const first = metrics(a);
  const second = metrics(b);
  const difference = { winRatePercentagePoints: 100 * (first.winRate - second.winRate),
    averageRank: first.averageRank - second.averageRank,
    averageRP: first.averageRP - second.averageRP };
  const winner = difference.winRatePercentagePoints > 0 && difference.averageRank < 0 && difference.averageRP > 0
    ? "first" : difference.winRatePercentagePoints < 0 && difference.averageRank > 0 && difference.averageRP < 0
      ? "second" : "mixed";
  return { first, second, difference, winner,
    minimumGames: Math.min(a.games, b.games), totalGames: a.games + b.games };
}
function supportOrder(a, b) {
  return b.minimumGames - a.minimumGames || b.totalGames - a.totalGames ||
    a.allies.localeCompare(b.allies);
}
function quantiles(contexts) {
  const values = contexts.map((row) => row.minimumGames).sort((a, b) => a - b);
  const at = (q) => values[Math.round((values.length - 1) * q)];
  return { firstQuartile: at(0.25), median: at(0.5), thirdQuartile: at(0.75), maximum: at(1) };
}
function guide(character, weapon) {
  const weaponEnum = weaponEnums[weapon];
  return weaponEnum ? {
    key: `CharacterGuide/${character}/${weaponEnum}`,
    text: l10n[`CharacterGuide/${character}/${weaponEnum}`] ?? null,
  } : { key: null, text: null };
}

const byWeaponPair = new Map();
for (const [character, allyContexts] of byCharacterAndAllies) {
  for (const [allies, options] of allyContexts) {
    const weaponOptions = [...options.keys()].sort((a, b) => Number(a) - Number(b));
    for (let i = 0; i < weaponOptions.length; i++) {
      for (let j = i + 1; j < weaponOptions.length; j++) {
        const [firstWeapon, secondWeapon] = [weaponOptions[i], weaponOptions[j]];
        const pairKey = `${character}:${firstWeapon}/${secondWeapon}`;
        const pair = byWeaponPair.get(pairKey) ?? {
          pairKey, characterCode: Number(character),
          characterName: l10n[`Character/Name/${character}`] ?? `Character ${character}`,
          firstWeaponCode: Number(firstWeapon), secondWeaponCode: Number(secondWeapon),
          firstWeaponName: l10n[`WeaponType/${weaponEnums[firstWeapon]}`] ?? `Weapon ${firstWeapon}`,
          secondWeaponName: l10n[`WeaponType/${weaponEnums[secondWeapon]}`] ?? `Weapon ${secondWeapon}`,
          firstGuide: guide(character, firstWeapon), secondGuide: guide(character, secondWeapon),
          contexts: [],
        };
        pair.contexts.push({ allies, ...compare(options.get(firstWeapon), options.get(secondWeapon)) });
        byWeaponPair.set(pairKey, pair);
      }
    }
  }
}

const pairs = [...byWeaponPair.values()].sort((a, b) =>
  a.characterCode - b.characterCode || a.firstWeaponCode - b.firstWeaponCode ||
  a.secondWeaponCode - b.secondWeaponCode);
const allContexts = pairs.flatMap((pair) => pair.contexts);
const metricAlignment = { winAndRankAligned: 0, winAndRankAlignedButRPOpposite: 0,
  winAndRankOpposite: 0 };
for (const row of allContexts) {
  const winDirection = Math.sign(row.difference.winRatePercentagePoints);
  const rankDirection = -Math.sign(row.difference.averageRank);
  const rpDirection = Math.sign(row.difference.averageRP);
  if (winDirection && rankDirection && winDirection === rankDirection) {
    metricAlignment.winAndRankAligned++;
    if (rpDirection === -winDirection) metricAlignment.winAndRankAlignedButRPOpposite++;
  } else if (winDirection && rankDirection && winDirection !== rankDirection) {
    metricAlignment.winAndRankOpposite++;
  }
}
for (const pair of pairs) {
  pair.contexts.sort(supportOrder);
  pair.summary = { comparedAllyPairs: pair.contexts.length,
    firstAhead: pair.contexts.filter((row) => row.winner === "first").length,
    secondAhead: pair.contexts.filter((row) => row.winner === "second").length,
    mixed: pair.contexts.filter((row) => row.winner === "mixed").length,
    minimumGames: quantiles(pair.contexts) };
}
if (requestedCount < pairs.length) {
  throw new Error(`Requested ${requestedCount} examples cannot cover all ${pairs.length} weapon pairs`);
}
const selected = [];
const usedAllyPairs = new Set();
const pairsByMaximumSupport = [...pairs].sort((a, b) =>
  supportOrder(a.contexts[0], b.contexts[0]) || a.pairKey.localeCompare(b.pairKey));
for (const pair of pairsByMaximumSupport) {
  const row = pair.contexts.find((context) => !usedAllyPairs.has(context.allies));
  if (!row) throw new Error(`No distinct ally pair available for ${pair.pairKey}`);
  selected.push({ pairKey: pair.pairKey, reason: "pair-coverage", ...row });
  usedAllyPairs.add(row.allies);
}
const selectedByPair = new Map(selected.map((row) => [row.pairKey, row]));
const alternativeOutcomes = pairs.map((pair) => {
  const firstOutcome = selectedByPair.get(pair.pairKey).winner;
  const row = pair.contexts.find((context) =>
    context.winner !== firstOutcome && !usedAllyPairs.has(context.allies));
  return row ? { pairKey: pair.pairKey, reason: "alternate-outcome", ...row } : null;
}).filter(Boolean).sort((a, b) => supportOrder(a, b) || a.pairKey.localeCompare(b.pairKey));
for (const row of alternativeOutcomes) {
  if (selected.length >= requestedCount) break;
  if (usedAllyPairs.has(row.allies)) continue;
  selected.push(row);
  usedAllyPairs.add(row.allies);
}
if (selected.length < requestedCount) {
  const remaining = pairs.flatMap((pair) => pair.contexts
    .filter((row) => !usedAllyPairs.has(row.allies))
    .map((row) => ({ pairKey: pair.pairKey, reason: "next-most-supported", ...row })))
    .sort((a, b) => supportOrder(a, b) || a.pairKey.localeCompare(b.pairKey));
  for (const row of remaining) {
    if (selected.length >= requestedCount) break;
    if (usedAllyPairs.has(row.allies)) continue;
    selected.push(row);
    usedAllyPairs.add(row.allies);
  }
}
selected.sort((a, b) => a.pairKey.localeCompare(b.pairKey) ||
  (a.reason === "pair-coverage" ? -1 : b.reason === "pair-coverage" ? 1 : supportOrder(a, b)));
const output = `analysis-snapshots/composition-affinity/pooled-weapon-learning-atlas-${requestedCount}-${date}.json`;
const result = { source, requestedCount,
  method: "Compare all exact same-character weapon pairs within each exact two-ally context using pooled win rate, lower mean rank and stored raw team-mean RP. Every context contributes to pair summaries without season, patch, tier, S-badge, or game-count filtering. For broad manual review, choose one highest-support available distinct ally pair per weapon pair, then different-outcome examples with distinct ally pairs until the requested count. Selection is for inspection, not a statistical conclusion. Player and opponent choices are uncontrolled.",
  summary: { multiweaponCharacters: multiweaponCharacters.size, weaponPairs: pairs.length,
    comparedContexts: pairs.reduce((sum, pair) => sum + pair.contexts.length, 0),
    selectedContexts: selected.length,
    distinctSelectedAllyPairs: usedAllyPairs.size,
    allContextMinimumGames: quantiles(allContexts), metricAlignment,
    pairsWithBothCharacterGuides: pairs.filter((pair) =>
      pair.firstGuide.text && pair.secondGuide.text).length,
    selectedReasons: { pairCoverage: selected.filter((row) => row.reason === "pair-coverage").length,
      alternateOutcome: selected.filter((row) => row.reason === "alternate-outcome").length,
      nextMostSupported: selected.filter((row) => row.reason === "next-most-supported").length } },
  weaponPairs: pairs.map(({ contexts, ...rest }) => rest), selected };
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${output} ${JSON.stringify(result.summary)}\n`);
