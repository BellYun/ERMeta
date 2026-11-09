import { createClient } from "@supabase/supabase-js";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { createGzip } from "node:zlib";

// Read-only, resumable export of the original patch/tier aggregates. The three
// disjoint rank buckets cover Diamond+ once; historical IN1000 can overlap them.
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  throw new Error("Usage: export-pooled-trio-rp-source.mjs YYYY-MM-DD");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const root = `analysis-snapshots/composition-affinity/pooled-rp-source-${date}`;
mkdirSync(root, { recursive: true });
const tiers = ["DIAMOND", "METEORITE", "MITHRIL"];
const columns = "id,patch_version,tier,character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,total_games,total_wins,total_rp,rank_sum";
const shardWidth = 100000;
const pageSize = 1000;

async function queryWithRetry(makeQuery) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await makeQuery();
    if (!result.error) return result;
    if (attempt === 4 || (result.status >= 400 && result.status < 500 && result.status !== 429)) {
      throw new Error(result.error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error("Unreachable retry state");
}
const { data: latest } = await queryWithRetry(() => client.from("v2_CharacterTrioWeapon")
  .select("id").order("id", { ascending: false }).limit(1));
if (!latest?.length) throw new Error("The source table is empty");
const maxId = latest[0].id;
const shards = Array.from({ length: Math.ceil(maxId / shardWidth) }, (_, i) => ({
  start: i * shardWidth + 1,
  end: Math.min((i + 1) * shardWidth, maxId),
}));

async function exportShard({ start, end }) {
  const stem = `${root}/${start}-${end}`;
  const output = `${stem}.ndjson.gz`;
  const manifest = `${stem}.json`;
  if (existsSync(output) && existsSync(manifest)) return { skipped: true, start, end };
  const temp = `${output}.tmp`;
  rmSync(temp, { force: true });
  const file = createWriteStream(temp);
  const gzip = createGzip();
  gzip.pipe(file);
  let lastId = start - 1;
  let sourceRows = 0;
  let eligibleRows = 0;
  let totalGames = 0;
  try {
    while (lastId < end) {
      const { data } = await queryWithRetry(() => client.from("v2_CharacterTrioWeapon")
        .select(columns)
        .in("tier", tiers)
        .gt("id", lastId)
        .lte("id", end)
        .order("id", { ascending: true })
        .limit(pageSize));
      if (!data?.length) break;
      sourceRows += data.length;
      for (const row of data) {
        const members = [
          [Number(row.character1), Number(row.weapon_type1)],
          [Number(row.character2), Number(row.weapon_type2)],
          [Number(row.character3), Number(row.weapon_type3)],
        ];
        if (members.some(([character, weapon]) => character === 9998 || character === 9999 || weapon <= 0)) continue;
        const games = Number(row.total_games);
        if (!(games > 0)) continue;
        const tuple = [row.patch_version, row.tier, ...members.flat(), games,
          Number(row.total_wins), Number(row.total_rp), Number(row.rank_sum)];
        if (!gzip.write(`${JSON.stringify(tuple)}\n`)) await once(gzip, "drain");
        eligibleRows++;
        totalGames += games;
      }
      lastId = data.at(-1).id;
      if (data.length < pageSize) break;
    }
    gzip.end();
    await finished(file);
    renameSync(temp, output);
    writeFileSync(manifest, `${JSON.stringify({ start, end, lastId, sourceRows, eligibleRows, totalGames }, null, 2)}\n`);
    return { start, end, sourceRows, eligibleRows, totalGames };
  } catch (error) {
    gzip.destroy();
    file.destroy();
    rmSync(temp, { force: true });
    throw error;
  }
}

let next = 0;
let completed = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < shards.length) {
    const shard = shards[next++];
    const result = await exportShard(shard);
    completed++;
    if (completed % 5 === 0 || completed === shards.length) {
      process.stdout.write(`${JSON.stringify({ completed, shards: shards.length, latest: result })}\n`);
    }
  }
}));
writeFileSync(`${root}/manifest.json`, `${JSON.stringify({ capturedAt: new Date().toISOString(), source: "v2_CharacterTrioWeapon",
  maxId, shardWidth, pageSize, tiers, shards: shards.length,
  note: "Historical IN1000 is excluded because it can overlap the three disjoint base tiers; IN1000-only records, if any, are outside this scope." }, null, 2)}\n`);
