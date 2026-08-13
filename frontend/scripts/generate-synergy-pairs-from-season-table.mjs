/**
 * 시즌 10·11 통합 3인 조합 집계에서 캐릭터별 동료 시너지 JSON을 생성한다.
 *
 * Usage:
 *   node frontend/scripts/generate-synergy-pairs-from-season-table.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable no-console */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(FRONTEND_DIR, "public", "data", "synergy-pairs");
const CHARACTER_MAP_PATH = path.resolve(FRONTEND_DIR, "src", "lib", "characterMap.ts");
const WEAPON_MAP_PATH = path.resolve(FRONTEND_DIR, "src", "lib", "weaponMap.ts");
const ENV_PATH = path.resolve(FRONTEND_DIR, ".env");

const TABLE = "v2_CharacterTrioWeaponSeason";
const SEASONS = [10, 11];
const TIER_SCOPE = "DIAMOND+";
const PAGE_SIZE = 1000;
const FETCH_CONCURRENCY = 8;
const TOP_N = 5;
const MIN_SAMPLE_GAMES = 40;
const MIN_GAMES_HIGH = 500;
const MIN_GAMES_MEDIUM = 200;
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);

const SELECT_COLUMNS = [
  "ally1_char",
  "ally1_weapon",
  "ally2_char",
  "ally2_weapon",
  "third_char",
  "third_weapon",
  "total_games",
  "total_wins",
  "total_rp",
  "rank_sum",
].join(",");

function loadEnv() {
  const values = {};
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const raw = match[2].trim();
    values[match[1]] =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
  }
  return values;
}

function extractObjectLiteral(source, name) {
  const index = source.indexOf(name);
  if (index < 0) throw new Error(`${name} 선언을 찾지 못했습니다.`);
  const equals = source.indexOf("=", index);
  const open = source.indexOf("{", equals);
  let depth = 0;
  for (let cursor = open; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    if (source[cursor] === "}") depth -= 1;
    if (depth === 0) return source.slice(open, cursor + 1);
  }
  throw new Error(`${name} 객체 리터럴 종료 지점을 찾지 못했습니다.`);
}

function evaluateObjectLiteral(literal) {
  const stripped = literal.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return Function(`"use strict"; return (${stripped});`)();
}

function loadMappings() {
  const characterSource = fs.readFileSync(CHARACTER_MAP_PATH, "utf8");
  const weaponSource = fs.readFileSync(WEAPON_MAP_PATH, "utf8");
  return {
    characterNames: evaluateObjectLiteral(
      extractObjectLiteral(characterSource, "CHARACTER_NAMES")
    ),
    weaponNames: evaluateObjectLiteral(
      extractObjectLiteral(weaponSource, "WEAPON_KOR_BY_CODE")
    ),
  };
}

function createAggregate() {
  return { games: 0, wins: 0, totalRP: 0, rankSum: 0 };
}

function addRow(aggregate, row) {
  aggregate.games += Number(row.total_games ?? 0);
  aggregate.wins += Number(row.total_wins ?? 0);
  aggregate.totalRP += Number(row.total_rp ?? 0);
  aggregate.rankSum += Number(row.rank_sum ?? 0);
}

function summarize(aggregate) {
  if (aggregate.games <= 0) return { games: 0, winRate: 0, avgRP: 0, avgRank: 0 };
  return {
    games: aggregate.games,
    winRate: round2((aggregate.wins / aggregate.games) * 100),
    avgRP: round2(aggregate.totalRP / aggregate.games / 3),
    avgRank: round2(aggregate.rankSum / aggregate.games),
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function classifyConfidence(games) {
  if (games >= MIN_GAMES_HIGH) return "high";
  if (games >= MIN_GAMES_MEDIUM) return "medium";
  return "low";
}

async function fetchSeasonCount(client, season) {
  const { count, error } = await client
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("patch_major", String(season));
  if (error) throw error;
  if (count == null) throw new Error(`시즌 ${season} 행 수를 확인하지 못했습니다.`);
  return count;
}

async function fetchRows(client) {
  const seasonCounts = Object.fromEntries(
    await Promise.all(SEASONS.map(async (season) => [season, await fetchSeasonCount(client, season)]))
  );
  const tasks = SEASONS.flatMap((season) =>
    Array.from({ length: Math.ceil(seasonCounts[season] / PAGE_SIZE) }, (_, page) => ({
      season,
      page,
      from: page * PAGE_SIZE,
      to: Math.min((page + 1) * PAGE_SIZE, seasonCounts[season]) - 1,
    }))
  );
  const pages = new Array(tasks.length);
  let nextTask = 0;
  let completed = 0;

  async function worker() {
    for (;;) {
      const taskIndex = nextTask;
      nextTask += 1;
      if (taskIndex >= tasks.length) return;
      const task = tasks[taskIndex];
      const { data, error } = await client
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .eq("patch_major", String(task.season))
        .order("id", { ascending: true })
        .range(task.from, task.to);
      if (error) throw error;
      if ((data?.length ?? 0) !== task.to - task.from + 1) {
        throw new Error(
          `시즌 ${task.season} page=${task.page} 행 수 불일치: ` +
            `expected=${task.to - task.from + 1} actual=${data?.length ?? 0}`
        );
      }
      pages[taskIndex] = data;
      completed += 1;
      if (completed % 100 === 0 || completed === tasks.length) {
        console.log(`fetch pages=${completed}/${tasks.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()));
  return { rows: pages.flat(), seasonCounts };
}

function getWeaponBucket(characterBuckets, characterCode, weapon) {
  let character = characterBuckets.get(characterCode);
  if (!character) {
    character = new Map();
    characterBuckets.set(characterCode, character);
  }
  let weaponBucket = character.get(weapon);
  if (!weaponBucket) {
    weaponBucket = { baseline: createAggregate(), partners: new Map() };
    character.set(weapon, weaponBucket);
  }
  return weaponBucket;
}

function aggregateRows(rows) {
  const characterBuckets = new Map();
  for (const row of rows) {
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    if (members.some((member) => EXCLUDED_CHARACTER_CODES.has(member.characterCode))) continue;

    for (let focusIndex = 0; focusIndex < members.length; focusIndex += 1) {
      const focus = members[focusIndex];
      const weaponBucket = getWeaponBucket(characterBuckets, focus.characterCode, focus.weapon);
      addRow(weaponBucket.baseline, row);

      for (let partnerIndex = 0; partnerIndex < members.length; partnerIndex += 1) {
        if (partnerIndex === focusIndex) continue;
        const partner = members[partnerIndex];
        const pairKey = `${partner.characterCode}:${partner.weapon}`;
        let pair = weaponBucket.partners.get(pairKey);
        if (!pair) {
          pair = {
            partnerCode: partner.characterCode,
            partnerWeapon: partner.weapon,
            aggregate: createAggregate(),
          };
          weaponBucket.partners.set(pairKey, pair);
        }
        addRow(pair.aggregate, row);
      }
    }
  }
  return characterBuckets;
}

function buildOutput(characterCode, weaponBuckets, mappings, builtAt) {
  const weapons = [...weaponBuckets.entries()]
    .map(([weapon, bucket]) => {
      const soloBaseline = summarize(bucket.baseline);
      const partners = [...bucket.partners.values()]
        .filter((pair) => pair.aggregate.games >= MIN_SAMPLE_GAMES)
        .map((pair) => {
          const summary = summarize(pair.aggregate);
          return {
            partnerCode: pair.partnerCode,
            partnerName: mappings.characterNames[pair.partnerCode] ?? `코드 ${pair.partnerCode}`,
            partnerWeapon: pair.partnerWeapon,
            partnerWeaponName:
              mappings.weaponNames[pair.partnerWeapon] ?? `무기 ${pair.partnerWeapon}`,
            ...summary,
            rpLift: round2(summary.avgRP - soloBaseline.avgRP),
            winRateLift: round2(summary.winRate - soloBaseline.winRate),
            confidence: classifyConfidence(summary.games),
          };
        })
        .filter((pair) => pair.confidence !== "low")
        .sort((a, b) => b.rpLift - a.rpLift || b.games - a.games);

      return {
        weapon,
        weaponName: mappings.weaponNames[weapon] ?? `무기 ${weapon}`,
        soloBaseline,
        topSynergy: partners.slice(0, TOP_N),
        topAnti: partners.slice(-TOP_N).reverse(),
        eligiblePairs: partners.length,
      };
    })
    .sort((a, b) => b.soloBaseline.games - a.soloBaseline.games);

  return {
    characterCode,
    characterName: mappings.characterNames[characterCode] ?? `코드 ${characterCode}`,
    patchScope: "S10-S11",
    seasons: SEASONS,
    tierScope: TIER_SCOPE,
    minSampleGames: MIN_SAMPLE_GAMES,
    confidenceThresholds: { high: MIN_GAMES_HIGH, medium: MIN_GAMES_MEDIUM },
    builtAt,
    weapons,
  };
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("frontend/.env에 Supabase URL 또는 anon key가 없습니다.");
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const mappings = loadMappings();
const { rows, seasonCounts } = await fetchRows(client);
const characterBuckets = aggregateRows(rows);
const builtAt = new Date().toISOString();

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [characterCode, weaponBuckets] of [...characterBuckets.entries()].sort(
  ([codeA], [codeB]) => codeA - codeB
)) {
  const output = buildOutput(characterCode, weaponBuckets, mappings, builtAt);
  const filename = `${String(characterCode).padStart(3, "0")}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), `${JSON.stringify(output, null, 2)}\n`);
}

console.log(
  `generated characters=${characterBuckets.size} rows=${rows.length} seasons=${JSON.stringify(
    seasonCounts
  )}`
);
