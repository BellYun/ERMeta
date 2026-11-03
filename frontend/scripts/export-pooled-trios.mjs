import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

// Read the cumulative member buckets once, deduplicate their three references
// to each exact character+weapon trio, and keep every observed combination.
// Run from frontend/: node --env-file=.env scripts/export-pooled-trios.mjs 2026-10-13
const snapshotDate = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate ?? "")) {
  throw new Error("Usage: export-pooled-trios.mjs YYYY-MM-DD");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: metadata, error: metadataError, count } = await client
  .from("v2_CharacterTrioWeaponMemberBucket")
  .select("character_code,weapon_code,item_count,refreshed_at", { count: "exact" })
  .order("character_code")
  .order("weapon_code")
  .range(0, 999);
if (metadataError) throw metadataError;
if (metadata.length !== count) throw new Error(`Metadata truncated: ${metadata.length}/${count}`);

const buckets = new Array(metadata.length);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < metadata.length) {
    const index = next++;
    const { character_code: character, weapon_code: weapon, item_count: expected } = metadata[index];
    const { data, error } = await client.from("v2_CharacterTrioWeaponMemberBucket")
      .select("items,item_count,refreshed_at")
      .eq("character_code", character)
      .eq("weapon_code", weapon)
      .single();
    if (error) throw new Error(`${character}:${weapon}: ${error.message}`);
    if (data.item_count !== expected || data.items.length !== expected) {
      throw new Error(`${character}:${weapon}: item count changed during export`);
    }
    if (data.refreshed_at !== metadata[index].refreshed_at) {
      throw new Error(`${character}:${weapon}: refresh date changed during export`);
    }
    buckets[index] = data.items;
  }
}));

const trios = new Map();
let references = 0;
for (const items of buckets) {
  for (const row of items) {
    references++;
    if (row.length < 10) throw new Error("Unexpected trio tuple length");
    const members = [
      [Number(row[0]), Number(row[1])],
      [Number(row[2]), Number(row[3])],
      [Number(row[4]), Number(row[5])],
    ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (new Set(members.map(([character]) => character)).size !== 3) {
      throw new Error("Duplicate character within trio");
    }
    const key = members.map(([character, weapon]) => `${character}:${weapon}`).join("+");
    const current = { key, members, games: Number(row[6]), wins: Number(row[7]),
      rp: Number(row[8]), rankSum: Number(row[9]) };
    const previous = trios.get(key);
    if (previous) {
      for (const metric of ["games", "wins", "rp", "rankSum"]) {
        if (Math.abs(previous[metric] - current[metric]) > 1e-6) {
          throw new Error(`Member buckets disagree for ${key}: ${metric}`);
        }
      }
      previous.references++;
    } else {
      trios.set(key, { ...current, references: 1 });
    }
  }
}
for (const row of trios.values()) {
  if (row.references !== 3) throw new Error(`${row.key}: ${row.references} references, expected three`);
}

const pairContexts = new Map();
let totalGames = 0;
let eligible10 = 0;
let uiS = 0;
for (const row of trios.values()) {
  totalGames += row.games;
  if (row.games >= 10) eligible10++;
  const score = 0.2 * ((100 * row.wins / row.games - 12.5) / 3.5)
    + 0.3 * ((4.5 - row.rankSum / row.games) / 1.5)
    + 0.5 * ((row.rp / row.games / 3) / 15);
  row.uiS = row.games >= 10 && score >= 1;
  if (row.uiS) uiS++;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const pairKey = `${row.members[i].join(":")}+${row.members[j].join(":")}`;
      const context = pairContexts.get(pairKey) ?? { thirdOptions: 0, s: 0, nonS10: 0, under10: 0 };
      context.thirdOptions++;
      if (row.uiS) context.s++;
      else if (row.games >= 10) context.nonS10++;
      else context.under10++;
      pairContexts.set(pairKey, context);
    }
  }
}
const rows = [...trios.values()].sort((a, b) => a.key.localeCompare(b.key));
const fileBase = `analysis-snapshots/composition-affinity/pooled-all-trios-${snapshotDate}`;
const raw = rows.map(({ key, games, wins, rp, rankSum, uiS }) =>
  JSON.stringify({ key, games, wins, rp, rankSum, uiS })).join("\n") + "\n";
writeFileSync(`${fileBase}.ndjson.gz`, gzipSync(raw));
const summary = {
  capturedAt: new Date().toISOString(),
  source: "v2_CharacterTrioWeaponMemberBucket",
  sourceRefreshedAt: [...new Set(metadata.map((row) => row.refreshed_at))],
  method: "All cumulative exact character+weapon trios, deduplicated from three member buckets; no season/patch/tier split or additional game threshold.",
  counts: {
    buckets: metadata.length,
    references,
    uniqueTrios: trios.size,
    totalGames,
    existingUiBadgeEligible10: eligible10,
    existingUiS: uiS,
    exactMemberPairs: pairContexts.size,
    pairsWithS: [...pairContexts.values()].filter((row) => row.s > 0).length,
    pairsWithSAndNonS10: [...pairContexts.values()].filter((row) => row.s > 0 && row.nonS10 > 0).length,
  },
  limitations: [
    "Cumulative buckets mix seasons, patches, tiers, players, opponents, and builds; no combat sequence is retained.",
    "The existing UI S formula divides collector team-mean RP by three again; S is only a search label.",
    "No candidate was removed for low game count; under-10-game candidates have no UI badge.",
  ],
};
writeFileSync(`${fileBase}-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
