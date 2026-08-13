import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "public/data/synergy-matrix");
const outputPath = path.join(sourceDir, "_character_matrix.json");

function weightedAverage(sum, games) {
  return games > 0 ? Math.round((sum / games) * 100) / 100 : 0;
}

function addWeighted(target, cell) {
  const games = Number(cell.games) || 0;
  if (games <= 0) return;

  target.games += games;
  target.winRateSum += (Number(cell.winRate) || 0) * games;
  target.avgRPSum += (Number(cell.avgRP) || 0) * games;
  target.avgRankSum += (Number(cell.avgRank) || 0) * games;
  target.rpLiftSum += (Number(cell.rpLift) || 0) * games;
  target.winRateLiftSum += (Number(cell.winRateLift) || 0) * games;
}

function addBaseline(target, baseline) {
  const games = Number(baseline?.games) || 0;
  if (games <= 0) return;

  target.games += games;
  target.winRateSum += (Number(baseline.winRate) || 0) * games;
  target.avgRPSum += (Number(baseline.avgRP) || 0) * games;
  target.avgRankSum += (Number(baseline.avgRank) || 0) * games;
}

async function main() {
  const files = (await readdir(sourceDir))
    .filter((file) => /^\d{3}\.json$/.test(file))
    .sort();

  const characterMap = new Map();
  const aggregateMap = new Map();
  let builtAt = "";
  let patchScope = "";
  let tierScope = "";
  let minSampleGames = 0;

  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(sourceDir, file), "utf8"));
    builtAt = builtAt || raw.builtAt || "";
    patchScope = patchScope || raw.patchScope || "";
    tierScope = tierScope || raw.tierScope || "";
    minSampleGames = minSampleGames || raw.minSampleGames || 0;

    const character = characterMap.get(raw.characterCode) ?? {
      code: raw.characterCode,
      name: raw.characterName,
      games: 0,
      winRateSum: 0,
      avgRPSum: 0,
      avgRankSum: 0,
      weaponCount: 0,
    };

    for (const weapon of raw.weapons ?? []) {
      character.weaponCount += 1;
      addBaseline(character, weapon.soloBaseline);

      for (const cell of weapon.partnerCells ?? []) {
        if (!Number.isFinite(cell.partnerCode) || cell.partnerCode === raw.characterCode) continue;
        const key = `${raw.characterCode}:${cell.partnerCode}`;
        const aggregate = aggregateMap.get(key) ?? {
          rowCode: raw.characterCode,
          rowName: raw.characterName,
          colCode: cell.partnerCode,
          colName: cell.partnerName,
          games: 0,
          winRateSum: 0,
          avgRPSum: 0,
          avgRankSum: 0,
          rpLiftSum: 0,
          winRateLiftSum: 0,
        };
        addWeighted(aggregate, cell);
        aggregateMap.set(key, aggregate);
      }
    }

    characterMap.set(raw.characterCode, character);
  }

  const characters = Array.from(characterMap.values())
    .sort((a, b) => a.code - b.code)
    .map((character) => ({
      code: character.code,
      name: character.name,
      games: character.games,
      weaponCount: character.weaponCount,
      winRate: weightedAverage(character.winRateSum, character.games),
      avgRP: weightedAverage(character.avgRPSum, character.games),
      avgRank: weightedAverage(character.avgRankSum, character.games),
    }));

  const cells = Array.from(aggregateMap.values())
    .sort((a, b) => a.rowCode - b.rowCode || a.colCode - b.colCode)
    .map((cell) => ({
      rowCode: cell.rowCode,
      rowName: cell.rowName,
      colCode: cell.colCode,
      colName: cell.colName,
      games: cell.games,
      winRate: weightedAverage(cell.winRateSum, cell.games),
      avgRP: weightedAverage(cell.avgRPSum, cell.games),
      avgRank: weightedAverage(cell.avgRankSum, cell.games),
      rpLift: weightedAverage(cell.rpLiftSum, cell.games),
      winRateLift: weightedAverage(cell.winRateLiftSum, cell.games),
    }));

  const output = {
    schemaVersion: 1,
    builtAt,
    generatedAt: new Date().toISOString(),
    patchScope,
    tierScope,
    minSampleGames,
    characterCount: characters.length,
    cellCount: cells.length,
    characters,
    cells,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output)}\n`);
  console.warn(
    `Built ${path.relative(rootDir, outputPath)}: ${characters.length} characters, ${cells.length} cells`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
