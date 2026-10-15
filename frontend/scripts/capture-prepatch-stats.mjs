import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const [sourcePatch, targetPatch] = process.argv.slice(2);
if (!/^\d+\.\d+$/.test(sourcePatch ?? "") || !/^\d+\.\d+$/.test(targetPatch ?? "")) {
  throw new Error("Usage: node --env-file=.env scripts/capture-prepatch-stats.mjs SOURCE_PATCH TARGET_PATCH");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required");

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const columns =
  "characterNum,bestWeapon,totalGames,totalWins,totalTop3,totalRP,averageRank,tier,patchVersion";
const tiers = ["DIAMOND", "METEORITE", "MITHRIL"];
const rows = [];

for (let offset = 0; ; offset += 1000) {
  const { data, error } = await client
    .from("v2_CharacterStats")
    .select(columns)
    .eq("patchVersion", sourcePatch)
    .in("tier", tiers)
    .order("characterNum")
    .order("bestWeapon")
    .order("tier")
    .range(offset, offset + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

if (rows.length === 0) throw new Error(`No ${sourcePatch} stats found`);
if (rows.some((row) => row.patchVersion !== sourcePatch || !tiers.includes(row.tier))) {
  throw new Error("Snapshot contains rows outside the requested patch and tier scope");
}

const snapshot = {
  capturedAt: new Date().toISOString(),
  patch: sourcePatch,
  scope: "DIAMOND_PLUS",
  rows,
};
const path = new URL(`../src/data/${targetPatch}-prepatch-stats.json`, import.meta.url);
writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
console.log(`${targetPatch} baseline: ${rows.length} rows, ${rows.reduce((sum, row) => sum + Number(row.totalGames ?? 0), 0)} games`);
