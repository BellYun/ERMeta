import { createClient } from "@supabase/supabase-js";

// Read every third option for one exact character+weapon pair from its member bucket.
// Run from frontend/: node --env-file=.env scripts/probe-all-third-options.mjs 72:11 75:22
const pair = process.argv.slice(2);
if (pair.length !== 2 || pair.some((value) => !/^\d+:\d+$/.test(value)) || pair[0] === pair[1]) {
  throw new Error("Usage: CHAR:WEAPON CHAR:WEAPON");
}
const [anchor, partner] = pair;
const [character, weapon] = anchor.split(":").map(Number);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: bucket, error } = await client.from("v2_CharacterTrioWeaponMemberBucket")
  .select("character_code,weapon_code,item_count,items,refreshed_at")
  .eq("character_code", character).eq("weapon_code", weapon).single();
if (error) throw error;
if (bucket.items.length !== bucket.item_count) throw new Error("Bucket item count mismatch");

const candidates = [];
for (const row of bucket.items) {
  const members = [`${row[0]}:${row[1]}`, `${row[2]}:${row[3]}`, `${row[4]}:${row[5]}`];
  if (!members.includes(anchor) || !members.includes(partner)) continue;
  const third = members.find((member) => member !== anchor && member !== partner);
  if (!third) continue;
  const games = Number(row[6]);
  const wins = Number(row[7]);
  const rp = Number(row[8]);
  const rankSum = Number(row[9]);
  const uiScore = games > 0 ? 0.2 * ((100 * wins / games - 12.5) / 3.5)
    + 0.3 * ((4.5 - rankSum / games) / 1.5)
    + 0.5 * ((rp / games / 3) / 15) : null;
  candidates.push({
    members, third, games, wins, rp, rankSum,
    winRate: games ? 100 * wins / games : null,
    averageRank: games ? rankSum / games : null,
    uiScore,
    uiS: games >= 10 && uiScore >= 1,
  });
}
candidates.sort((left, right) => right.games - left.games || left.third.localeCompare(right.third));
process.stdout.write(`${JSON.stringify({
  capturedAt: new Date().toISOString(),
  source: "v2_CharacterTrioWeaponMemberBucket",
  sourceRefreshedAt: bucket.refreshed_at,
  pair,
  method: "All exact third options in one member bucket; UI S uses the existing 10-game and score>=1 rule. No extra exclusion.",
  limitations: [
    "Cumulative bucket mixes seasons, patches, tiers, players, opponents, and core variants.",
    "UI score divides collector team-mean RP by three again; UI S is not a skill-synergy label.",
  ],
  counts: {
    allThirdOptions: candidates.length,
    under10Games: candidates.filter((row) => row.games < 10).length,
    eligible10: candidates.filter((row) => row.games >= 10).length,
    uiS: candidates.filter((row) => row.uiS).length,
  },
  candidates,
}, null, 2)}\n`);
