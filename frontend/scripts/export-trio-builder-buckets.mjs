import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// From frontend/: node scripts/export-trio-builder-buckets.mjs [frontend-origin] [export-key]
const frontendOrigin = process.argv[2] ?? "https://erwagg.com";
// Use one cache key per export so older CDN responses do not mix with current buckets.
const exportKey = process.argv[3] ?? new Date().toISOString();
const frontendUrl = new URL("../", import.meta.url);
const weapons = JSON.parse(
  await readFile(new URL("const/characterBestWeapons.json", frontendUrl), "utf8")
);

const anchors = new Set(
  Object.entries(weapons).flatMap(([character, entries]) =>
    entries.map(({ weaponCode }) => `${character}-${weaponCode}`)
  )
);
const pending = [...anchors];
const buckets = new Map();
const trios = new Map();

async function exportBucket(anchor) {
  const [character, weapon] = anchor.split("-");
  const url = new URL("/api/stats/trios-weapon", frontendOrigin);
  url.search = new URLSearchParams({
    character1: character,
    weapon1: weapon,
    format: "tuple",
    snapshot: exportKey,
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`${anchor}: HTTP ${response.status}`);

  const { version, itemCount, items } = await response.json();
  if (version !== 1 || !Array.isArray(items) || itemCount !== items.length) {
    throw new Error(`${anchor}: invalid tuple bucket`);
  }

  for (const tuple of items) {
    if (!Array.isArray(tuple) || tuple.length !== 10 || !tuple.every(Number.isFinite)) {
      throw new Error(`${anchor}: invalid tuple`);
    }
    const members = [0, 2, 4].map((index) => [tuple[index], tuple[index + 1]]);
    const memberAnchors = members.map(([charCode, weaponCode]) => `${charCode}-${weaponCode}`);
    if (
      !memberAnchors.includes(anchor) ||
      new Set(members.map(([charCode]) => charCode)).size !== 3 ||
      !members.flat().every((id) => Number.isSafeInteger(id) && id > 0)
    ) {
      throw new Error(`${anchor}: invalid trio membership`);
    }

    const key = memberAnchors.sort().join("|");
    const metrics = tuple.slice(6);
    const trio = trios.get(key);
    if (!trio) {
      trios.set(key, { metrics, anchors: new Set([anchor]) });
    } else {
      if (trio.anchors.has(anchor) || metrics.some((value, index) => value !== trio.metrics[index])) {
        throw new Error(`${anchor}: conflicting trio ${key}`);
      }
      trio.anchors.add(anchor);
    }
    for (const member of memberAnchors) {
      if (anchors.has(member)) continue;
      anchors.add(member);
      pending.push(member);
    }
  }

  buckets.set(anchor, JSON.stringify({ version, itemCount, items }) + "\n");
}

for (let offset = 0; offset < pending.length;) {
  const batch = pending.slice(offset, offset + 4);
  await Promise.all(batch.map(exportBucket));
  offset += batch.length;
}

if (trios.size === 0) throw new Error("The source returned no trio results");
for (const [key, trio] of trios) {
  if (trio.anchors.size !== 3) {
    throw new Error(`${key}: expected three buckets, got ${trio.anchors.size}`);
  }
}

const entries = [...buckets].sort(([left], [right]) => left.localeCompare(right));
const digest = createHash("sha256");
for (const [anchor, json] of entries) digest.update(anchor).update("\0").update(json);
const version = digest.digest("hex").slice(0, 16);
const directory = new URL(`public/data/trio-builder/${version}/`, frontendUrl);
await mkdir(directory, { recursive: true });
await Promise.all(
  entries.map(([anchor, json]) => writeFile(new URL(`${anchor}.json`, directory), json))
);

const manifest = { version, bucketCount: entries.length, trioCount: trios.size };
await writeFile(
  new URL("src/data/trio-builder-snapshot.json", frontendUrl),
  JSON.stringify(manifest, null, 2) + "\n"
);
process.stdout.write(`${JSON.stringify(manifest)}\n`);
