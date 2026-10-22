/** Export the verified S10/S11/S12-through-12.4 recommendation snapshot.
 * Run from frontend: node --env-file=.env scripts/export-pick-partner-stats.mjs
 * Reads the published recommendation aggregate; never changes the database.
 */
/* eslint-disable no-console */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(FRONTEND, "public/data/pick-partners/s10-s12-through-12.4");
const TABLE = "v2_CharacterTrioWeaponSearch_all";
// Verified against the published Search_all and the 12.4 correction snapshot.
// Fail closed if the live dataset changes instead of mislabelling newer patches.
const EXPECTED_GAMES = 3_554_762;
const round = (n) => Math.round(n * 10000) / 10000;
const keyOf = (c, w) => `${c}:${w}`;
const fileOf = (c, w) => `${String(c).padStart(3, "0")}-${String(w).padStart(2, "0")}.json`;

function empty() {
  return { totalGames: 0, totalWins: 0, totalRP: 0, rankSum: 0 };
}

function add(target, values) {
  for (const key of Object.keys(target)) target[key] += values[key];
}

export function metrics(totals) {
  assert(totals.totalGames > 0);
  return {
    totalGames: totals.totalGames,
    totalWins: totals.totalWins,
    totalRP: totals.totalRP,
    rankSum: totals.rankSum,
    winRate: round((totals.totalWins / totals.totalGames) * 100),
    averageRP: round(totals.totalRP / totals.totalGames / 3),
    averageRank: round(totals.rankSum / totals.totalGames),
  };
}

export function addTrioRow(members, raw) {
  const row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]));
  assert(Object.values(row).every(Number.isFinite), "invalid source number");
  const trio = [
    [row.ally1_char, row.ally1_weapon],
    [row.ally2_char, row.ally2_weapon],
    [row.third_char, row.third_weapon],
  ];
  assert(trio[0][0] < trio[1][0] && trio[1][0] < trio[2][0], "noncanonical source characters");
  assert(trio.every(([c, w]) => c > 0 && c < 9998 && w > 0));
  const totals = {
    totalGames: row.total_games,
    totalWins: row.total_wins,
    totalRP: row.total_rp,
    rankSum: row.rank_sum,
  };
  assert(Number.isInteger(totals.totalGames) && totals.totalGames > 0);
  assert(totals.totalWins >= 0 && totals.totalWins <= totals.totalGames);
  for (const [characterCode, weaponCode] of trio) {
    const key = keyOf(characterCode, weaponCode);
    if (!members.has(key))
      members.set(key, { characterCode, weaponCode, baseline: empty(), partners: new Map() });
    const member = members.get(key);
    add(member.baseline, totals);
    for (const [partnerChar, partnerWeapon] of trio) {
      if (partnerChar === characterCode) continue;
      const partnerKey = keyOf(partnerChar, partnerWeapon);
      if (!member.partners.has(partnerKey))
        member.partners.set(partnerKey, {
          characterCode: partnerChar,
          weaponCode: partnerWeapon,
          totals: empty(),
        });
      add(member.partners.get(partnerKey).totals, totals);
    }
  }
  return totals.totalGames;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert(url && apiKey, "Supabase URL and anon key are required");
  const request = async (params, count = false) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(`${url}/rest/v1/${TABLE}?${new URLSearchParams(params)}`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            ...(count ? { Prefer: "count=exact" } : {}),
          },
          signal: AbortSignal.timeout(120_000),
        });
        if (!response.ok) throw new Error(`Source read failed: HTTP ${response.status}`);
        return {
          rows: await response.json(),
          count: Number(response.headers.get("content-range")?.split("/")[1]),
        };
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  };
  const sourceState = async () => {
    const [{ rows, count }, latest] = await Promise.all([
      request({ select: "id", order: "id.desc", limit: "1" }, true),
      request({ select: "last_updated", order: "last_updated.desc", limit: "1" }),
    ]);
    assert(Number.isInteger(count) && count > 0, "missing exact source row count");
    return { count, maxId: rows[0].id, latestUpdate: latest.rows[0].last_updated };
  };
  const inventory = await sourceState();
  console.log(`Reading ${inventory.count} published trio aggregate rows`);
  const cacheKey = createHash("sha256")
    .update(JSON.stringify(inventory))
    .digest("hex")
    .slice(0, 16);
  const cacheDir = path.join(os.tmpdir(), `ermeta-trio-export-${cacheKey}`);
  await fs.mkdir(cacheDir, { recursive: true });
  const members = new Map();
  let totalGames = 0;
  let rowCount = 0;
  let page = 0;
  let completed = 0;
  const pageCount = Math.ceil(inventory.count / 1000);
  const columns =
    "id,ally1_char,ally1_weapon,ally2_char,ally2_weapon,third_char,third_weapon,total_games,total_wins,total_rp,rank_sum";
  const worker = async () => {
    while (page < pageCount) {
      const current = page++;
      const cacheFile = path.join(cacheDir, `${current}.json`);
      let rows;
      try {
        rows = JSON.parse(await fs.readFile(cacheFile, "utf8"));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        ({ rows } = await request({
          select: columns,
          order: "id.asc",
          offset: String(current * 1000),
          limit: "1000",
        }));
        await fs.writeFile(cacheFile, JSON.stringify(rows));
      }
      assert.equal(
        rows.length,
        Math.min(1000, inventory.count - current * 1000),
        "truncated source page"
      );
      for (const raw of rows) {
        totalGames += addTrioRow(members, raw);
        rowCount++;
      }
      completed++;
      if (completed % 50 === 0 || completed === pageCount)
        console.log(`Aggregated pages ${completed}/${pageCount}`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  assert.deepEqual(await sourceState(), inventory, "published source changed during export");
  assert.equal(rowCount, inventory.count);
  assert.equal(
    totalGames,
    EXPECTED_GAMES,
    "published snapshot game count changed; verify patch scope before export"
  );
  const latestRefresh = inventory.latestUpdate;
  const results = [...members.values()]
    .sort((a, b) => a.characterCode - b.characterCode || a.weaponCode - b.weaponCode)
    .map((member) => ({
      characterCode: member.characterCode,
      weaponCode: member.weaponCode,
      baseline: metrics(member.baseline),
      partners: [...member.partners.values()]
        .map(({ characterCode, weaponCode, totals }) => ({
          characterCode,
          weaponCode,
          ...metrics(totals),
        }))
        .sort(
          (a, b) =>
            b.averageRP - a.averageRP ||
            b.totalGames - a.totalGames ||
            a.characterCode - b.characterCode ||
            a.weaponCode - b.weaponCode
        ),
    }));
  assert.equal(
    results.reduce((sum, r) => sum + r.baseline.totalGames, 0),
    totalGames * 3
  );
  const byMember = new Map(results.map((r) => [keyOf(r.characterCode, r.weaponCode), r]));
  for (const result of results) {
    assert.equal(
      result.partners.reduce((sum, p) => sum + p.totalGames, 0),
      result.baseline.totalGames * 2
    );
    for (const partner of result.partners) {
      const reverse = byMember
        .get(keyOf(partner.characterCode, partner.weaponCode))
        ?.partners.find(
          (p) => p.characterCode === result.characterCode && p.weaponCode === result.weaponCode
        );
      assert(reverse, "missing reverse partner");
      for (const field of ["totalGames", "totalWins", "totalRP", "rankSum"])
        assert(Math.abs(partner[field] - reverse[field]) < 0.01, `asymmetric pair ${field}`);
    }
  }
  // Write only after all source and aggregation checks pass.
  await fs.mkdir(OUTPUT, { recursive: true });
  const builtAt = new Date().toISOString();
  const files = [];
  for (const result of results) {
    const file = fileOf(result.characterCode, result.weaponCode);
    const contents = `${JSON.stringify({ schemaVersion: 1, scope: "s10-s12-through-12.4", ...result })}\n`;
    await fs.writeFile(path.join(OUTPUT, file), contents);
    files.push({
      characterCode: result.characterCode,
      weaponCode: result.weaponCode,
      file,
      partnerCount: result.partners.length,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  }
  const manifest = {
    schemaVersion: 1,
    builtAt,
    scope: "s10-s12-through-12.4",
    seasons: [10, 11, 12],
    lastIncludedPatch: "12.4",
    excludedPatches: ["12.5", "12.6"],
    tierScope: "DIAMOND+",
    sourceTable: TABLE,
    sourceLatestRefreshedAt: latestRefresh,
    sourceTrioGames: totalGames,
    sourceRowCount: rowCount,
    sourceMaxId: inventory.maxId,
    sourceScopeVerification: {
      verifiedAt: "2026-10-22",
      through12_3Games: 3_109_336,
      patch12_4Games: 445_426,
    },
    minimumGamesFilter: null,
    aggregation:
      "Sum the published core-specific trio rows for each anchor and partner character+weapon; marginalize over cores and the third member. Retain every observed partner. Each trio contributes once to each member baseline and once to each directed pair.",
    rpDefinition:
      "Same as the recommendation API: sum(total_rp) / sum(total_games) / 3. Patches 12.4 use the published actual-entry-cost correction allocated by tier and three characters over weapon/core rows.",
    precision: "Raw sums retained; derived averages rounded to four decimal places.",
    files,
  };
  await fs.writeFile(path.join(OUTPUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Exported ${files.length} files, ${totalGames} trio games to ${OUTPUT}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
