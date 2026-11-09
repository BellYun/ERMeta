import { createClient } from "@supabase/supabase-js";

// Read-only patch/tier strata for one exact character+weapon trio.
// Usage from frontend/: node --env-file=.env scripts/probe-exact-trio-strata.mjs 9:10 20:4 52:24
const args = process.argv.slice(2);
if (args.length !== 3 || args.some((arg) => !/^\d+:\d+$/.test(arg))) {
  throw new Error("Usage: CHAR:WEAPON CHAR:WEAPON CHAR:WEAPON");
}
const members = args.map((arg) => arg.split(":").map(Number))
  .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
if (new Set(members.map(([character]) => character)).size !== 3) {
  throw new Error("Choose three distinct characters.");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const rows = [];
for (let page = 0; ; page += 1) {
  let query = client.from("v2_CharacterTrioWeapon")
    .select("id,patch_version,tier,total_games,total_wins,rank_sum,total_rp,last_updated");
  for (let slot = 1; slot <= 3; slot += 1) {
    query = query.eq(`character${slot}`, members[slot - 1][0])
      .eq(`weapon_type${slot}`, members[slot - 1][1]);
  }
  const { data, error } = await query.order("id", { ascending: true })
    .range(page * 1000, (page + 1) * 1000 - 1);
  if (error) throw new Error(error.message);
  rows.push(...data);
  if (data.length < 1000) break;
}
const strata = new Map();
for (const row of rows) {
  const key = `${row.patch_version}|${row.tier}`;
  const bucket = strata.get(key) ?? { patch: row.patch_version, tier: row.tier, games: 0, wins: 0, rankSum: 0, rp: 0, sourceRows: 0 };
  bucket.games += Number(row.total_games);
  bucket.wins += Number(row.total_wins);
  bucket.rankSum += Number(row.rank_sum);
  bucket.rp += Number(row.total_rp);
  bucket.sourceRows += 1;
  strata.set(key, bucket);
}
process.stdout.write(`${JSON.stringify({
  capturedAt: new Date().toISOString(),
  source: "v2_CharacterTrioWeapon",
  members: members.map(([character, weapon]) => `${character}:${weapon}`),
  sourceRows: rows.length,
  strata: [...strata.values()].sort((left, right) => left.patch.localeCompare(right.patch, undefined, { numeric: true }) || left.tier.localeCompare(right.tier)),
  limitations: ["Rows are aggregated across core variants and games; no combat events or player identities are retained.", "Historical RP is net while 12.4+ RP is earned in-game, so do not pool RP across that boundary."],
}, null, 2)}\n`);
