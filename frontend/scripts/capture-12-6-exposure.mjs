import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

// 12.6 official item and augment changes. Capture only changed entries; use
// v2_CharacterStats as the denominator for each character and weapon profile.
const itemSlots = {
  weapon: [105407, 108505],
  chest: [202511, 202509, 202525],
  head: [201506, 201507, 701451, 201701, 201537],
  arm: [203408, 203516, 205407, 205508, 203513, 705619, 705607],
  leg: [204509, 204511, 204510],
};
const traitCodes = [7000701, 7211301];
const patch = "12.5";
const target = "12.6";
const tiers = ["DIAMOND", "METEORITE", "MITHRIL"];
const baseline = JSON.parse(readFileSync(new URL(`../src/data/${target}-prepatch-stats.json`, import.meta.url)));
const weaponTypes = JSON.parse(readFileSync(new URL("../const/weaponItemTypeMap.json", import.meta.url)));
if (baseline.patch !== patch) throw new Error("Expected a 12.5 baseline snapshot");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase public URL and anon key are required");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const profiles = new Map();
for (const row of baseline.rows) {
  const profileKey = `${row.characterNum}:${row.bestWeapon}`;
  const profile = profiles.get(profileKey) ?? {
    characterCode: row.characterNum,
    weaponCode: row.bestWeapon,
    totalGames: 0,
    itemGames: new Map(),
    traitGames: new Map(),
  };
  profile.totalGames += Number(row.totalGames);
  profiles.set(profileKey, profile);
}

async function fetchAll(makeQuery, orderColumns) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      let query = makeQuery();
      for (const column of orderColumns) query = query.order(column);
      result = await query.range(offset, offset + 999);
      if (!result.error) break;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return rows;
}

const equipmentOrder = ["characterNum", "tier", "mainCore", "weapon", "chest", "head", "arm", "leg"];
const traitOrder = ["characterNum", "tier", "bestWeapon", "mainCore", "sub1", "sub2", "sub3", "sub4", "optionTrait1", "optionTrait2", "optionTrait3", "optionTrait4"];
const tasks = Object.entries(itemSlots).flatMap(([slot, codes]) => codes.map((code) => ({ slot, code })));
let equipmentRows = 0;
let traitRows = 0;
let unmappedWeaponGames = 0;
let next = 0;

await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < tasks.length) {
    const { slot, code } = tasks[next++];
    const rows = await fetchAll(
      () => client.from("v2_CharacterEquipmentBuildStats")
        .select("characterNum,weapon,totalGames")
        .eq("patchVersion", patch)
        .in("tier", tiers)
        .eq(slot, code),
      equipmentOrder,
    );
    equipmentRows += rows.length;
    for (const row of rows) {
      const weaponCode = weaponTypes[String(row.weapon)];
      if (!weaponCode) {
        unmappedWeaponGames += Number(row.totalGames);
        continue;
      }
      const profile = profiles.get(`${row.characterNum}:${weaponCode}`);
      if (!profile) continue;
      profile.itemGames.set(code, (profile.itemGames.get(code) ?? 0) + Number(row.totalGames));
    }
    console.log(`${slot}:${code} ${rows.length} rows`);
  }
}));

for (const code of traitCodes) {
  const rows = await fetchAll(
    () => client.from("v2_CharacterTraitBuildStats")
      .select("characterNum,bestWeapon,mainCore,totalGames")
      .eq("patchVersion", patch)
      .in("tier", tiers)
      .eq("mainCore", code),
    traitOrder,
  );
  traitRows += rows.length;
  for (const row of rows) {
    const profile = profiles.get(`${row.characterNum}:${row.bestWeapon}`);
    if (!profile) continue;
    profile.traitGames.set(code, (profile.traitGames.get(code) ?? 0) + Number(row.totalGames));
  }
  console.log(`trait:${code} ${rows.length} rows`);
}

const roundRate = (games, totalGames) => Math.round((1000 * games) / totalGames) / 10;
for (const profile of profiles.values()) {
  for (const [code, games] of [...profile.itemGames, ...profile.traitGames]) {
    if (games > profile.totalGames) {
      throw new Error(`Exposure ${code} exceeds ${profile.characterCode}:${profile.weaponCode} baseline`);
    }
  }
}
const output = {
  capturedAt: new Date().toISOString(),
  patch,
  scope: "DIAMOND_PLUS",
  source: ["v2_CharacterEquipmentBuildStats", "v2_CharacterTraitBuildStats"],
  denominator: "v2_CharacterStats.totalGames",
  equipmentRows,
  traitRows,
  unmappedWeaponGames,
  profiles: [...profiles.values()]
    .sort((a, b) => a.characterCode - b.characterCode || a.weaponCode - b.weaponCode)
    .map((profile) => ({
      characterCode: profile.characterCode,
      weaponCode: profile.weaponCode,
      totalGames: profile.totalGames,
      items: [...profile.itemGames].sort((a, b) => a[0] - b[0]).map(([itemCode, games]) => ({
        itemCode, games, pickRate: roundRate(games, profile.totalGames),
      })),
      traits: [...profile.traitGames].sort((a, b) => a[0] - b[0]).map(([traitCode, games]) => ({
        traitCode, games, pickRate: roundRate(games, profile.totalGames),
      })),
    })),
};
const path = new URL(`../src/data/${target}-prepatch-exposure.json`, import.meta.url);
writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
console.log(`Saved ${output.profiles.length} profiles; ${equipmentRows} equipment rows, ${traitRows} trait rows, ${unmappedWeaponGames} unmapped weapon games`);
