/**
 * v2_CharacterTrioWeaponSearch_all 에서 유형분석 LabData JSON 재생성.
 *
 * Usage:
 *   node frontend/scripts/generate-lab-data-from-search-table.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable no-console */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(FRONTEND_DIR, "public", "data", "lab");
const CHARACTER_MAP = path.resolve(FRONTEND_DIR, "src", "lib", "characterMap.ts");
const WEAPON_MAP = path.resolve(FRONTEND_DIR, "src", "lib", "weaponMap.ts");

const TABLE = "v2_CharacterTrioWeaponSearch_all";
const PAGE_SIZE = 1000;
const MIN_TOTAL_GAMES = 100;
const STRONG_TOP_K = 12;
const WEAK_TOP_K = 12;

const ROLES = [
  { role: "탱커", slug: "tanks" },
  { role: "전사", slug: "warriors" },
  { role: "암살자", slug: "assassins" },
  { role: "스킬딜러", slug: "skilldealers" },
  { role: "원거리 딜러", slug: "rangers" },
  { role: "지원가", slug: "supports" },
];

const ROLE_ORDER = new Map(ROLES.map((entry, index) => [entry.role, index]));
const MIN_MULTISET_GAMES_BY_SLUG = {
  assassins: 30,
  supports: 30,
  rangers: 30,
  skilldealers: 30,
  tanks: 30,
  warriors: 100,
};

const ROLE_GROUP_OVERRIDES = {
  warriors: [
    {
      id: 0,
      label: "스증 연계 전사",
      curated: true,
      characterKeys: ["78_16", "22_3", "56_20", "11_18", "28_13"],
    },
    {
      id: 1,
      label: "원딜 연계 전사",
      curated: true,
      characterKeys: ["67_14", "59_2", "11_16"],
    },
    {
      id: 2,
      label: "단독 캐리형 전사",
      curated: true,
      characterKeys: ["64_24"],
    },
    {
      id: 3,
      label: "선진입 전사",
      curated: true,
      characterKeys: ["86_1", "33_1", "80_19"],
    },
    {
      id: 4,
      label: "암살 연계 전사",
      curated: true,
      characterKeys: ["1_18", "1_14", "3_19"],
    },
    {
      id: 6,
      label: "크랙형 전사",
      curated: true,
      characterKeys: ["35_2", "10_20", "7_2"],
    },
    {
      id: 7,
      label: "탱커 연계 전사",
      curated: true,
      characterKeys: ["74_3", "14_21", "44_25"],
    },
    {
      id: 8,
      label: "지원가 연계 전사",
      curated: true,
      characterKeys: ["46_16", "39_18"],
    },
    {
      id: 9,
      label: "핑퐁형 전사",
      curated: true,
      characterKeys: ["27_null", "10_1", "35_1"],
    },
    {
      id: 11,
      label: "아웃라이어-레온-글러브",
      curated: true,
      characterKeys: ["29_1"],
    },
    {
      id: 13,
      label: "탱커 선진입 캐미",
      curated: true,
      characterKeys: ["82_21", "1_16", "49_19", "88_3"],
    },
    {
      id: 14,
      label: "플렉스 교전 전사",
      curated: true,
      characterKeys: ["65_16", "61_5", "28_3"],
    },
    {
      id: 16,
      label: "선진입 딜브루저",
      curated: true,
      characterKeys: ["39_21", "63_15", "3_21"],
    },
    {
      id: 17,
      label: "아웃라이어-케네스-도끼",
      curated: true,
      characterKeys: ["71_14"],
    },
    {
      id: 18,
      label: "아웃라이어-재키-단검",
      curated: true,
      characterKeys: ["1_15"],
    },
    {
      id: 19,
      label: "아웃라이어-실비아-권총",
      curated: true,
      characterKeys: ["16_9"],
    },
    {
      id: 20,
      label: "아웃라이어-피오라-양손검",
      curated: true,
      characterKeys: ["3_16"],
    },
    {
      id: 21,
      label: "아웃라이어-현우-글러브",
      curated: true,
      characterKeys: ["7_1"],
    },
    {
      id: 22,
      label: "아웃라이어-레온-톤파",
      curated: true,
      characterKeys: ["29_2"],
    },
    {
      id: 23,
      label: "아웃라이어-라우라-채찍",
      curated: true,
      characterKeys: ["47_4"],
    },
    {
      id: 24,
      label: "아웃라이어-블레어-쌍검",
      curated: true,
      characterKeys: ["84_18"],
    },
    {
      id: 26,
      label: "흡혈 진입 브루저",
      curated: true,
      characterKeys: ["42_24"],
    },
  ],
  tanks: [
    {
      id: 0,
      label: "딜러 보호 파트너형",
      curated: true,
      characterKeys: ["20_4", "50_21"],
    },
    {
      id: 1,
      label: "암살자 대응형",
      curated: true,
      characterKeys: ["4_13", "13_15"],
    },
    {
      id: 2,
      label: "전사-딜러 연계형",
      curated: true,
      characterKeys: ["30_13", "55_14"],
    },
    {
      id: 3,
      label: "전사-지원 특화형",
      curated: true,
      characterKeys: ["45_4"],
    },
    {
      id: 4,
      label: "세컨탱-지원 연계형",
      curated: true,
      characterKeys: ["76_3", "53_14"],
    },
    {
      id: 5,
      label: "암살자 동반 진입형",
      curated: true,
      characterKeys: ["85_13", "68_1"],
    },
    {
      id: 6,
      label: "세컨탱 유지형",
      curated: true,
      characterKeys: ["53_13"],
    },
    {
      id: 7,
      label: "원딜-지원 돌진형",
      curated: true,
      characterKeys: ["4_3"],
    },
    {
      id: 8,
      label: "원딜 보조 딜탱형",
      curated: true,
      characterKeys: ["13_19"],
    },
  ],
  skilldealers: [
    {
      id: 0,
      label: "설치 포킹형",
      curated: true,
      characterKeys: ["87_24", "83_6", "26_9"],
    },
    {
      id: 1,
      label: "지원가 포킹 연계형",
      curated: true,
      characterKeys: ["34_23", "12_7", "75_22", "2_9", "36_5", "54_8"],
    },
    {
      id: 2,
      label: "전사 변수 교전형",
      curated: true,
      characterKeys: ["61_5", "16_9"],
    },
    {
      id: 3,
      label: "암살 폭딜 연계형",
      curated: true,
      characterKeys: ["43_5", "52_24", "5_6", "19_24"],
    },
    {
      id: 4,
      label: "스증 중첩 견제형",
      curated: true,
      characterKeys: ["15_5", "15_6", "19_6"],
    },
    {
      id: 5,
      label: "암살 연계 교전형",
      curated: true,
      characterKeys: ["60_6", "24_21"],
    },
    {
      id: 6,
      label: "전사 유틸 교전형",
      curated: true,
      characterKeys: ["9_9", "66_24", "79_8"],
    },
    {
      id: 7,
      label: "전사-지원 연계형",
      curated: true,
      characterKeys: ["6_7", "77_24"],
    },
    {
      id: 8,
      label: "전열 CC 견제형",
      curated: true,
      characterKeys: ["17_5", "48_3"],
    },
    {
      id: 9,
      label: "암살 변수 포킹형",
      curated: true,
      characterKeys: ["81_9", "5_5", "12_6"],
    },
    {
      id: 10,
      label: "지원 변수 포킹형",
      curated: true,
      characterKeys: ["51_22", "24_3", "2_11"],
    },
  ],
  rangers: [
    {
      id: 0,
      label: "쌍포-다원딜형",
      curated: true,
      characterKeys: ["72_11"],
    },
    {
      id: 1,
      label: "전열-스증 압박형",
      curated: true,
      characterKeys: ["70_6", "9_10"],
    },
    {
      id: 2,
      label: "변수 캐리형",
      curated: true,
      characterKeys: ["31_7", "32_5"],
    },
    {
      id: 3,
      label: "다원딜 받아치기형",
      curated: true,
      characterKeys: ["8_22", "2_10"],
    },
    {
      id: 4,
      label: "전사-암살 변수형",
      curated: true,
      characterKeys: ["6_8", "38_9"],
    },
    {
      id: 5,
      label: "기동 포킹형",
      curated: true,
      characterKeys: ["21_9", "57_23"],
    },
    {
      id: 6,
      label: "저격 견제형",
      curated: true,
      characterKeys: ["25_11"],
    },
    {
      id: 7,
      label: "전열 유지 견제형",
      curated: true,
      characterKeys: ["62_11"],
    },
    {
      id: 8,
      label: "교전 브루저형",
      curated: true,
      characterKeys: ["40_6"],
    },
  ],
};

const ROLE_EXCLUDED_KEYS = {
  rangers: new Set(["58_10", "2_11", "2_9", "9_9", "6_7"]),
  skilldealers: new Set(["28_3"]),
};

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadSupabaseEnv() {
  const env = {
    ...readEnvFile(path.resolve(FRONTEND_DIR, ".env")),
    ...readEnvFile(path.resolve(FRONTEND_DIR, ".env.local")),
    ...process.env,
  };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.");
  }
  return { url, key };
}

function extractObjectLiteral(source, name) {
  const start = source.indexOf(`const ${name}`);
  const exportedStart = source.indexOf(`export const ${name}`);
  const index = start >= 0 ? start : exportedStart;
  if (index < 0) throw new Error(`${name} 선언을 찾지 못했습니다.`);

  const equals = source.indexOf("=", index);
  const open = source.indexOf("{", equals);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) return source.slice(open, i + 1);
  }
  throw new Error(`${name} 객체 리터럴 종료 지점을 찾지 못했습니다.`);
}

function evalObjectLiteral(literal) {
  const stripped = literal
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return Function(`"use strict"; return (${stripped});`)();
}

function loadMappings() {
  const characterSource = fs.readFileSync(CHARACTER_MAP, "utf8");
  const weaponSource = fs.readFileSync(WEAPON_MAP, "utf8");

  const characterNames = evalObjectLiteral(extractObjectLiteral(characterSource, "CHARACTER_NAMES"));
  const comboRoles = evalObjectLiteral(extractObjectLiteral(characterSource, "COMBO_ROLES"));
  const weaponRolesFallback = evalObjectLiteral(
    extractObjectLiteral(characterSource, "WEAPON_ROLES_FALLBACK")
  );
  const weaponAgnosticRoles = evalObjectLiteral(
    extractObjectLiteral(characterSource, "WEAPON_AGNOSTIC_ROLES")
  );
  const weaponNames = evalObjectLiteral(extractObjectLiteral(weaponSource, "WEAPON_KOR_BY_CODE"));

  return {
    characterNames,
    comboRoles,
    weaponRolesFallback,
    weaponAgnosticRoles,
    weaponNames,
  };
}

function isWeaponAgnostic(mappings, characterCode) {
  return Object.hasOwn(mappings.weaponAgnosticRoles, String(characterCode));
}

function comboKey(mappings, characterCode, weaponCode) {
  return isWeaponAgnostic(mappings, characterCode)
    ? `${characterCode}_null`
    : `${characterCode}_${weaponCode}`;
}

function comboRoles(mappings, characterCode, weaponCode) {
  const agnostic = mappings.weaponAgnosticRoles[String(characterCode)];
  if (agnostic) return agnostic;
  return (
    mappings.comboRoles[`${characterCode}_${weaponCode}`] ??
    mappings.weaponRolesFallback[String(weaponCode)] ??
    []
  );
}

function primaryRole(mappings, characterCode, weaponCode) {
  return comboRoles(mappings, characterCode, weaponCode)[0] ?? "미분류";
}

function multisetKey(mappings, members) {
  return members
    .map((member) => primaryRole(mappings, member.characterCode, member.weapon))
    .sort((a, b) => (ROLE_ORDER.get(a) ?? 999) - (ROLE_ORDER.get(b) ?? 999) || a.localeCompare(b))
    .join(" + ");
}

function displayWeaponName(mappings, characterCode, weapons) {
  if (!isWeaponAgnostic(mappings, characterCode)) {
    return mappings.weaponNames[String(weapons[0])] ?? `무기 ${weapons[0]}`;
  }
  const names = [...new Set(weapons)]
    .sort((a, b) => a - b)
    .map((weapon) => mappings.weaponNames[String(weapon)] ?? `무기 ${weapon}`);
  return names.join(" / ");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function addBucketStat(bucket, row, multiset) {
  const games = Number(row.total_games ?? 0);
  if (games <= 0) return;
  const avgRp = Number(row.total_rp ?? 0) / games / 3;
  bucket.totalGames += games;
  bucket.weightedRp += avgRp * games;
  const multisetBucket = bucket.multisets.get(multiset) ?? { games: 0, weightedRp: 0 };
  multisetBucket.games += games;
  multisetBucket.weightedRp += avgRp * games;
  bucket.multisets.set(multiset, multisetBucket);
}

function templateGroupIndex(template) {
  const keyToGroup = new Map();
  for (const group of template.groups ?? []) {
    for (const key of group.characterKeys ?? []) keyToGroup.set(key, group.id);
  }
  return keyToGroup;
}

function buildGroups(template, characters) {
  const existing = template.groups ?? [];
  const byId = new Map(
    existing.map((group) => [
      group.id,
      {
        id: group.id,
        label: group.label,
        curated: Boolean(group.curated),
        ...(group.topPartnerRoles ? { topPartnerRoles: group.topPartnerRoles } : {}),
        characterKeys: [],
      },
    ])
  );

  for (const character of characters) {
    if (character.groupId == null) continue;
    const group = byId.get(character.groupId);
    if (group) group.characterKeys.push(`${character.characterCode}_${character.weapon ?? "null"}`);
  }

  return [...byId.values()].filter((group) => group.characterKeys.length > 0);
}

function characterOutputKey(character) {
  return `${character.characterCode}_${character.weapon ?? "null"}`;
}

function applyRoleOverrides(slug, characters) {
  const overrideGroups = ROLE_GROUP_OVERRIDES[slug];
  const excludedKeys = ROLE_EXCLUDED_KEYS[slug] ?? new Set();
  if (!overrideGroups) {
    return { characters: characters.filter((character) => !excludedKeys.has(characterOutputKey(character))) };
  }

  const keyToGroup = new Map();
  for (const group of overrideGroups) {
    for (const key of group.characterKeys) keyToGroup.set(key, group.id);
  }

  const filteredCharacters = characters
    .filter((character) => {
      const key = characterOutputKey(character);
      return !excludedKeys.has(key) && keyToGroup.has(key);
    })
    .map((character) => ({ ...character, groupId: keyToGroup.get(characterOutputKey(character)) ?? null }))
    .sort((a, b) => {
      const groupA = a.groupId ?? 9999;
      const groupB = b.groupId ?? 9999;
      return groupA - groupB || b.totalGames - a.totalGames;
    });

  const presentKeys = new Set(filteredCharacters.map(characterOutputKey));
  const groups = overrideGroups
    .map((group) => ({
      ...group,
      characterKeys: group.characterKeys.filter((key) => presentKeys.has(key)),
    }))
    .filter((group) => group.characterKeys.length > 0);

  return { characters: filteredCharacters, groups };
}

async function fetchRows(client) {
  const rows = [];
  let expectedCount = null;
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await client
      .from(TABLE)
      .select(
        [
          "ally1_char",
          "ally1_weapon",
          "ally2_char",
          "ally2_weapon",
          "third_char",
          "third_weapon",
          "total_games",
          "total_rp",
        ].join(","),
        from === 0 ? { count: "exact" } : undefined
      )
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (from === 0) expectedCount = count;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { rows, expectedCount };
}

function buildRoleData({ role, slug }, rows, mappings) {
  const templatePath = path.resolve(OUT_DIR, `${slug}.json`);
  const template = fs.existsSync(templatePath)
    ? JSON.parse(fs.readFileSync(templatePath, "utf8"))
    : { groups: [] };
  const keyToGroup = templateGroupIndex(template);
  const buckets = new Map();

  for (const row of rows) {
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    const multiset = multisetKey(mappings, members);

    for (const member of members) {
      if (!comboRoles(mappings, member.characterCode, member.weapon).includes(role)) continue;
      const key = comboKey(mappings, member.characterCode, member.weapon);
      const bucket =
        buckets.get(key) ??
        {
          characterCode: member.characterCode,
          weapons: new Set(),
          totalGames: 0,
          weightedRp: 0,
          multisets: new Map(),
        };
      bucket.weapons.add(member.weapon);
      addBucketStat(bucket, row, multiset);
      buckets.set(key, bucket);
    }
  }

  const minMultisetGames = MIN_MULTISET_GAMES_BY_SLUG[slug] ?? 100;
  const builtCharacters = [...buckets.entries()]
    .map(([key, bucket]) => {
      const weapons = [...bucket.weapons];
      const ownMeanRP = bucket.weightedRp / bucket.totalGames;
      const entries = [...bucket.multisets.entries()]
        .filter(([, stat]) => stat.games >= minMultisetGames)
        .map(([multiset, stat]) => ({
          multiset,
          delta: round3(stat.weightedRp / stat.games - ownMeanRP),
          games: stat.games,
        }));

      return {
        characterCode: bucket.characterCode,
        characterName:
          mappings.characterNames[String(bucket.characterCode)] ?? `코드:${bucket.characterCode}`,
        weapon: isWeaponAgnostic(mappings, bucket.characterCode) ? null : weapons[0],
        weaponName: displayWeaponName(mappings, bucket.characterCode, weapons),
        totalGames: bucket.totalGames,
        ownMeanRP: round3(ownMeanRP),
        groupId: keyToGroup.get(key) ?? null,
        strong: entries
          .filter((entry) => entry.delta > 0)
          .sort((a, b) => b.delta - a.delta || b.games - a.games)
          .slice(0, STRONG_TOP_K),
        weak: entries
          .filter((entry) => entry.delta < 0)
          .sort((a, b) => a.delta - b.delta || b.games - a.games)
          .slice(0, WEAK_TOP_K),
      };
    })
    .filter((character) => character.totalGames >= MIN_TOTAL_GAMES)
    .sort((a, b) => {
      const groupA = a.groupId ?? 9999;
      const groupB = b.groupId ?? 9999;
      return groupA - groupB || b.totalGames - a.totalGames;
    });

  const overridden = applyRoleOverrides(slug, builtCharacters);
  const characters = overridden.characters;
  const groups = overridden.groups ?? buildGroups(template, characters);

  return {
    role,
    roleSlug: slug,
    groupK: groups.length,
    minGames: minMultisetGames,
    cumulative: true,
    generatedFrom: TABLE,
    generatedAt: new Date().toISOString().slice(0, 10),
    groups,
    characters,
  };
}

async function main() {
  const { url, key } = loadSupabaseEnv();
  const mappings = loadMappings();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { rows, expectedCount } = await fetchRows(client);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const roleInfo of ROLES) {
    const data = buildRoleData(roleInfo, rows, mappings);
    const outPath = path.resolve(OUT_DIR, `${roleInfo.slug}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
    console.log(
      `✓ ${roleInfo.slug} (${roleInfo.role}) chars=${data.characters.length} groups=${data.groups.length} minGames=${data.minGames}`
    );
  }
  console.log(`source rows=${rows.length} expected=${expectedCount ?? "unknown"} table=${TABLE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
