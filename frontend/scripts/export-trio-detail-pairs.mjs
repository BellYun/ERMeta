import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// From frontend/: node scripts/export-trio-detail-pairs.mjs [frontend-origin] [export-key]
const origin = process.argv[2] ?? "https://erwagg.com";
const snapshot = process.argv[3] ?? new Date().toISOString();
const frontend = new URL("../", import.meta.url);
const weaponData = JSON.parse(
  await readFile(new URL("const/characterBestWeapons.json", frontend), "utf8")
);
const characters = Object.entries(weaponData)
  .filter(([, weapons]) => weapons.filter(({ weaponCode }) => weaponCode > 0).length !== 1)
  .map(([character]) => Number(character))
  .sort((left, right) => left - right);

// The home preview passes a pair with both weapons unset. Other pairs come from URL selection.
const pairs = ["6-33", ...characters.flatMap((first, index) =>
  characters.slice(index + 1).map((second) => [first, second].join("-"))
)].sort();

async function readPair(pair) {
  const [character1, character2] = pair.split("-");
  const url = new URL("/api/stats/trios-weapon", origin);
  url.search = new URLSearchParams({
    sortBy: "totalGames",
    limit: "5000",
    character1,
    character2,
    snapshot,
  });
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (response.ok) {
      const { results } = await response.json();
      if (!Array.isArray(results) || results.some((row) => {
        const members = [row.character1, row.character2, row.character3];
        return (
          !members.includes(Number(character1)) ||
          !members.includes(Number(character2)) ||
          ![row.totalGames, row.winRate, row.averageRP, row.averageRank].every(Number.isFinite)
        );
      })) {
        throw new Error(pair + ": invalid trio search response");
      }
      return JSON.stringify({ results }) + "\n";
    }
    if (attempt === 3 || (response.status < 500 && response.status !== 429)) {
      throw new Error(pair + ": HTTP " + response.status);
    }
    await delay(attempt * 1000);
  }
}

const files = [];
for (let offset = 0; offset < pairs.length; offset += 4) {
  files.push(...await Promise.all(pairs.slice(offset, offset + 4).map(readPair)));
}
const digest = createHash("sha256");
files.forEach((json, index) => digest.update(pairs[index]).update("\0").update(json));
const version = digest.digest("hex").slice(0, 16);
const directory = new URL("public/data/trio-detail-pairs/" + version + "/", frontend);
await mkdir(directory, { recursive: true });
await Promise.all(files.map((json, index) =>
  writeFile(new URL(pairs[index] + ".json", directory), json)
));
await writeFile(
  new URL("src/data/trio-detail-pairs-snapshot.json", frontend),
  JSON.stringify({ version, pairs }, null, 2) + "\n"
);
process.stdout.write(JSON.stringify({ version, pairCount: files.length }) + "\n");
