/**
 * v2_CharacterTrioWeaponSeason 의 시즌 10+11 집계에서
 * 유형분석 LabData JSON 재생성.
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
const ENTRY_ADJUSTED_ONLY = process.argv.includes("--entry-adjusted");
const SAMPLE_CONFIDENCE_ONLY = process.argv.includes("--sample-confidence");
const COMBINED_CONFIDENCE = process.argv.includes("--entry-sample-confidence");
if (
  Number(ENTRY_ADJUSTED_ONLY) +
    Number(SAMPLE_CONFIDENCE_ONLY) +
    Number(COMBINED_CONFIDENCE) >
  1
) {
  throw new Error("분류 지표 옵션은 하나만 선택할 수 있습니다.");
}
const ENTRY_ADJUSTED = ENTRY_ADJUSTED_ONLY || COMBINED_CONFIDENCE;
const SAMPLE_CONFIDENCE = SAMPLE_CONFIDENCE_ONLY || COMBINED_CONFIDENCE;
const LAB_ROOT_DIR = path.resolve(FRONTEND_DIR, "public", "data", "lab");
const OUT_DIR = COMBINED_CONFIDENCE
  ? path.resolve(LAB_ROOT_DIR, "entry-sample-confidence")
  : ENTRY_ADJUSTED
    ? path.resolve(LAB_ROOT_DIR, "entry-adjusted")
    : SAMPLE_CONFIDENCE
      ? path.resolve(LAB_ROOT_DIR, "sample-confidence")
      : LAB_ROOT_DIR;
const CHARACTER_MAP = path.resolve(FRONTEND_DIR, "src", "lib", "characterMap.ts");
const WEAPON_MAP = path.resolve(FRONTEND_DIR, "src", "lib", "weaponMap.ts");
const SYNERGY_COMPOSITION = path.resolve(FRONTEND_DIR, "src", "lib", "synergyComposition.ts");
const SECOND_ORDER_OUT = path.resolve(OUT_DIR, "composition-types.json");
const EXACT_TWO_PARTNER_OUT = path.resolve(
  OUT_DIR,
  "exact-two-partner-character-contexts.ndjson"
);

const TABLE = ENTRY_ADJUSTED ? "v2_CharacterTrioWeapon" : "v2_CharacterTrioWeaponSeason";
const SEASONS = ["10", "11"];
const ENTRY_COST_BY_TIER = {
  DIAMOND: 48,
  METEORITE: 54.5,
  MITHRIL: 60,
};
const PAGE_SIZE = 1000;
const FETCH_CONCURRENCY = 8;
const MIN_TOTAL_GAMES = 100;
const STRONG_TOP_K = 12;
const WEAK_TOP_K = 12;
// RP 고점만이 아니라 실제로 반복해서 성립한 조합을 대표 조합으로 고르기 위한 판수 가중치.
// 0.5(기존 제곱근)보다 조금 높여 희귀 고점 조합의 과대평가를 줄인다.
const AFFINITY_GAME_EXPONENT = SAMPLE_CONFIDENCE ? 0.5 : 0.65;
const AFFINITY_MIN_GAME_SHARE = 0.01;
const METRIC_PROFILE_MIN_GAME_SHARE = 0.01;
const METRIC_PROFILE_MIN_GAMES = 100;
const METRIC_MIN_SHARED_COMPOSITIONS = 4;
const METRIC_CLUSTER_MIN_SIGN_AGREEMENT = 0.55;
const METRIC_SPLIT_MAX_PAIR_SIGN_AGREEMENT = 0.5;
const METRIC_MAX_RELATIVE_GAP = 0.6;
const SECOND_ORDER_MIN_GAMES = 300;
const SECOND_ORDER_MIN_OUTER_SHARE = 0.001;
const SECOND_ORDER_TOP_COMBINATIONS = 15;
const SECOND_ORDER_TOP_RECOMMENDATIONS = 3;
const SECOND_ORDER_CHARACTER_MIN_GAMES = 300;
const SECOND_ORDER_CHARACTER_MIN_TYPE_SHARE = 0.005;
const SECOND_ORDER_TOP_CHARACTER_COMBINATIONS = 3;
const SECOND_ORDER_VALIDATION_REFERENCE_GAMES = 30;
const SECOND_ORDER_VALIDATION_CHECK_GAMES = 100;
const SECOND_ORDER_VALIDATION_STRONG_GAMES = 300;
const SECOND_ORDER_VALIDATION_TOP_POSITIVE = 6;
const SECOND_ORDER_VALIDATION_TOP_EXCEPTION = 4;
const SECOND_ORDER_VALIDATION_TOP_VOLUME = 4;
const CONDITIONAL_TYPE_MIN_CONTEXT_GAMES = 100;
const COMPOSITION_AFFINITY_MIN_LIFT = 0.5;
const FULL_TREND_MIN_SHARED_CONTEXTS = 3;
// 전체 경향은 비슷하지만 일부 조합 방향이 뚜렷하게 어긋나는 캐릭터까지 한 군으로
// 압축되지 않도록, 평균 유사도와 군 간 최저 허용 유사도를 함께 사용합니다.
const FULL_TREND_MERGE_AVERAGE = 0.72;
const FULL_TREND_MERGE_MINIMUM = 0.6;
const FULL_TREND_MOVE_GAIN = 0.03;
// 현재 군집과 차선 군집의 유사도 차이가 작으면 분류 확정도가 낮은 경계 프로필로 표시합니다.
// 다만 차선 군집 자체가 병합 기준에서 너무 멀면 단순한 상대 순위일 뿐이므로 제외합니다.
const FULL_TREND_AMBIGUOUS_MARGIN = 0.05;
const FULL_TREND_AMBIGUOUS_AVERAGE = FULL_TREND_MERGE_AVERAGE - 0.04;
const FULL_TREND_AMBIGUOUS_MINIMUM = FULL_TREND_MERGE_MINIMUM - 0.03;
const FULL_TREND_GLOBAL_MAX_ITERATIONS = 10;
const COMBINATION_GROUPING_BASIS = "fixed-first-order-composition-contexts";
// 반복 중 새 역할군 문맥을 주축으로 보되, 기존 역할군 문맥을 비교 좌표로 남겨
// 역할군이 세분될수록 공통 문맥이 사라져 전원 단독군으로 붕괴하는 현상을 막습니다.
const FULL_TREND_REFINED_CONTEXT_WEIGHT = 0.6;
// 통계 방향은 비슷해도 실제 전투 기능이 다른 프로필은 역할군에서 분리합니다.
// 분리 후 조합 경향·대표 상승·다른 캐릭터 적합도는 전체 데이터에서 다시 계산됩니다.
const FULL_TREND_ROLE_ISOLATIONS = new Map([
  [
    "1_15",
    {
      fitRole: "추격 마무리 · 보호 장악 연계형",
      reason: "전열 유지가 아니라 보호·장악 이후 추격과 처형을 담당하는 단검 재키 역할 격리",
    },
  ],
]);

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
      (value.startsWith('"') && value.endsWith('"')) ||
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
  const stripped = literal.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return Function(`"use strict"; return (${stripped});`)();
}

function loadMappings() {
  const characterSource = fs.readFileSync(CHARACTER_MAP, "utf8");
  const weaponSource = fs.readFileSync(WEAPON_MAP, "utf8");
  const compositionSource = fs.readFileSync(SYNERGY_COMPOSITION, "utf8");

  const characterNames = evalObjectLiteral(
    extractObjectLiteral(characterSource, "CHARACTER_NAMES")
  );
  const comboRoles = evalObjectLiteral(extractObjectLiteral(characterSource, "COMBO_ROLES"));
  const weaponRolesFallback = evalObjectLiteral(
    extractObjectLiteral(characterSource, "WEAPON_ROLES_FALLBACK")
  );
  const weaponAgnosticRoles = evalObjectLiteral(
    extractObjectLiteral(characterSource, "WEAPON_AGNOSTIC_ROLES")
  );
  const weaponNames = evalObjectLiteral(extractObjectLiteral(weaponSource, "WEAPON_KOR_BY_CODE"));
  const characterTraits = evalObjectLiteral(
    extractObjectLiteral(compositionSource, "CHARACTER_TRAITS")
  );
  const comboTraitOverrides = evalObjectLiteral(
    extractObjectLiteral(compositionSource, "COMBO_TRAIT_OVERRIDES")
  );

  return {
    characterNames,
    comboRoles,
    weaponRolesFallback,
    weaponAgnosticRoles,
    weaponNames,
    characterTraits,
    comboTraitOverrides,
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

function scoreMode() {
  if (COMBINED_CONFIDENCE) return "tier-entry-cost-adjusted+sample-confidence";
  if (ENTRY_ADJUSTED) return "tier-entry-cost-adjusted";
  if (SAMPLE_CONFIDENCE) return "sample-confidence";
  return "observed-rp";
}

function classificationModeSuffix() {
  return (
    (ENTRY_ADJUSTED ? "+tier-entry-cost" : "") +
    (SAMPLE_CONFIDENCE ? "+lift-sqrt-games" : "")
  );
}

function averageRpForRow(row) {
  const games = Number(row.total_games ?? 0);
  if (games <= 0) return 0;
  const observedRp = Number(row.total_rp ?? 0) / games / 3;
  return ENTRY_ADJUSTED ? observedRp + (ENTRY_COST_BY_TIER[row.tier] ?? 0) : observedRp;
}

function addBucketStat(bucket, row, multiset) {
  const games = Number(row.total_games ?? 0);
  if (games <= 0) return;
  const avgRp = averageRpForRow(row);
  bucket.totalGames += games;
  bucket.weightedRp += avgRp * games;
  const multisetBucket = bucket.multisets.get(multiset) ?? { games: 0, weightedRp: 0 };
  multisetBucket.games += games;
  multisetBucket.weightedRp += avgRp * games;
  bucket.multisets.set(multiset, multisetBucket);
}

function characterOutputKey(character) {
  return `${character.characterCode}_${character.weapon ?? "null"}`;
}

const ARCHETYPE_LABELS = {
  탱커: {
    "engage+peel": "선봉 보호 탱커",
    "engage+protect": "진입 보호 탱커",
    "engage+sustain": "선봉 브루저 탱커",
    "engage+zoneControl": "제어 진입 탱커",
    "peel+protect": "보호 지원 탱커",
    "peel+sustain": "유지·받아치기 탱커",
  },
  전사: {
    "burst+dive": "진입 폭딜 전사",
    "burst+engage": "교전 개시 전사",
    "burst+zoneControl": "장악 누커 전사",
    "dive+engage": "강제 진입 전사",
    "dive+sustain": "추격 교전 전사",
    "dive+zoneControl": "진입 장악 전사",
    "engage+peel": "보호 전사",
    "engage+sustain": "선봉 브루저 전사",
    "peel+zoneControl": "제어·받아치기 전사",
    "peel+sustain": "유지·받아치기 전사",
  },
  암살자: {
    "burst+dive": "순간 암살자",
    "dive+sustain": "추격 암살자",
  },
  스킬딜러: {
    "burst+poke": "포킹 누커",
    "burst+zoneControl": "장악 누커",
    "engage+zoneControl": "진입 장악 딜러",
    "peel+poke": "유틸 포킹 딜러",
    "poke+protect": "지원형 포킹 딜러",
    "poke+sustain": "지속 견제 딜러",
    "poke+zoneControl": "장악 포킹 딜러",
    "protect+zoneControl": "지원형 장악 딜러",
    "sustain+zoneControl": "지속 장악 딜러",
  },
  "원거리 딜러": {
    "burst+dive": "진입 폭딜 원딜",
    "burst+poke": "포킹 점사 원딜",
    "burst+sustain": "인파이팅 원딜",
    "dive+sustain": "추격형 원딜",
    "peel+poke": "유틸 포킹 원딜",
    "peel+sustain": "유틸리티 원딜",
    "poke+protect": "지원형 원딜",
    "poke+sustain": "후열 지속 화력",
    "sustain+zoneControl": "장악 지속 원딜",
  },
  지원가: {
    "engage+protect": "진입 보호 지원가",
    "peel+protect": "보호 지원가",
    "poke+protect": "포킹 지원가",
    "protect+zoneControl": "장악 지원가",
  },
};

const FIT_ROLE_LABELS = {
  "burst+dive": "진입 마무리",
  "burst+engage": "교전 개시",
  "burst+poke": "포킹 점사",
  "burst+sustain": "인파이팅 화력",
  "burst+zoneControl": "장악 폭딜",
  "dive+engage": "강제 진입",
  "dive+sustain": "추격 지속전",
  "dive+zoneControl": "진입 장악",
  "engage+peel": "선봉 보호",
  "engage+protect": "진입 보호",
  "engage+sustain": "전열 유지",
  "engage+zoneControl": "진입 장악",
  "peel+poke": "견제·받아치기",
  "peel+protect": "후열 보호",
  "peel+sustain": "받아치기 유지",
  "peel+zoneControl": "진입 차단",
  "poke+protect": "견제 지원",
  "poke+sustain": "지속 견제",
  "poke+zoneControl": "포킹 장악",
  "protect+zoneControl": "보호 장악",
  "sustain+zoneControl": "지속 장악",
};

// 같은 전투 특성 조합 안에서도 실제 진입 순서와 임무가 뚜렷하게 다른 무기군만 분리합니다.
const COMBO_CLASSIFICATION_OVERRIDES = {
  "64_24": {
    archetype: "2선 진입 지속 전사",
    fitRole: "진입 지속전",
    fitReason: "다른 전열의 1차 진입을 따라 들어가 보호막을 누적하며 지속 교전을 이어갑니다.",
  },
  "75_22": {
    archetype: "진형 장악 포킹 딜러",
    fitRole: "전열 장악",
    fitReason:
      "탱커·전사와 원거리 딜러가 만든 진형에서 공간을 선점하고 포킹 구간을 길게 유지합니다.",
  },
  "83_6": {
    archetype: "진입 억제 포킹 딜러",
    fitRole: "진입 억제",
    fitReason:
      "아군 전열이 교전을 여는 동안 상대의 역진입과 이탈 경로를 묶어 후열 화력 시간을 확보합니다.",
  },
  "89_9": {
    archetype: "후속 포화 스킬딜러",
    fitRole: "포킹 점사",
    fitReason:
      "아군 전열이나 선행 스킬딜러가 만든 교전 구도에서 후속 화력을 연속으로 누적합니다.",
  },
};

const FIT_REASON_CLAUSES = {
  "burst+dive": "진입 타이밍에 순간 폭딜로 핵심 대상을 마무리합니다.",
  "burst+engage": "먼저 교전을 열고 짧은 시간에 화력을 집중합니다.",
  "burst+poke": "사전 견제로 체력을 깎은 뒤 점사 각을 완성합니다.",
  "burst+sustain": "근접 난전에서 폭딜과 지속 화력을 함께 보탭니다.",
  "burst+zoneControl": "이동 경로를 묶고 한 지점에 폭딜을 집중합니다.",
  "dive+engage": "후방까지 파고들어 강제로 교전 범위를 넓힙니다.",
  "dive+sustain": "도주하는 대상을 추격하며 긴 교전을 이어갑니다.",
  "dive+zoneControl": "진입으로 진형을 흔들고 퇴로를 제한합니다.",
  "engage+peel": "선봉에서 교전을 열면서 후열로 들어오는 적도 막습니다.",
  "engage+protect": "진입을 시작한 뒤 아군이 화력을 낼 시간을 확보합니다.",
  "engage+sustain": "전열에 오래 남아 동료 딜러의 화력 시간을 늘립니다.",
  "engage+zoneControl": "교전을 열면서 적의 이동 공간까지 제한합니다.",
  "peel+poke": "거리를 유지하며 견제하고 적의 역진입을 받아칩니다.",
  "peel+protect": "후열을 지키고 적의 진입 타이밍을 끊습니다.",
  "peel+sustain": "첫 진입을 받아낸 뒤 장기 교전으로 전환합니다.",
  "peel+zoneControl": "아군에게 접근하는 경로를 차단하고 진형을 유지합니다.",
  "poke+protect": "안전한 거리에서 견제하면서 동료의 딜 각을 보호합니다.",
  "poke+sustain": "사전 견제와 지속 화력으로 긴 교전의 우위를 만듭니다.",
  "poke+zoneControl": "공간을 묶고 포킹으로 상대 진입 경로를 제한합니다.",
  "protect+zoneControl": "아군을 보호하면서 유리한 전투 구역을 고정합니다.",
  "sustain+zoneControl": "지역을 오래 점유하며 지속 교전의 중심을 잡습니다.",
};

const PARTNER_ROLE_FOUNDATIONS = {
  탱커: "전열·진입",
  전사: "난전·진입",
  암살자: "후방 압박",
  스킬딜러: "스킬 화력·장악",
  "원거리 딜러": "후열 지속 화력",
  지원가: "보호·유틸",
};

function traitsForCombo(mappings, characterCode, weaponCode) {
  return (
    mappings.comboTraitOverrides[`${characterCode}_${weaponCode}`] ??
    mappings.characterTraits[String(characterCode)] ??
    []
  );
}

function archetypeForRole(role, traits) {
  const traitKey = [...traits].sort().join("+");
  return ARCHETYPE_LABELS[role]?.[traitKey] ?? `${role} 유연형`;
}

function fitRoleForTraits(traits) {
  const traitKey = [...traits].sort().join("+");
  return FIT_ROLE_LABELS[traitKey] ?? "유연 연계";
}

function classificationForCombo(characterCode, weaponCode, role, traits, partnerRoles) {
  const override = COMBO_CLASSIFICATION_OVERRIDES[`${characterCode}_${weaponCode}`];
  return {
    archetype: override?.archetype ?? archetypeForRole(role, traits),
    fitRole: override?.fitRole ?? fitRoleForTraits(traits),
    fitReason: override?.fitReason ?? fitReasonForTraits(partnerRoles, traits),
  };
}

function fitReasonForTraits(partnerRoles, traits) {
  const traitKey = [...traits].sort().join("+");
  const foundations = partnerRoles.map(
    (partnerRole) => PARTNER_ROLE_FOUNDATIONS[partnerRole] ?? partnerRole
  );
  const foundation =
    foundations.length === 2 && foundations[0] === foundations[1]
      ? `${foundations[0]} 2중 기반`
      : `${foundations.join(" + ")} 기반`;
  const clause = FIT_REASON_CLAUSES[traitKey] ?? "부족한 전투 기능을 유연하게 보완합니다.";
  return `${foundation}에서 ${clause}`;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function reliableMetricProfile(character) {
  const minGames = Math.max(
    METRIC_PROFILE_MIN_GAMES,
    Math.ceil(character.totalGames * METRIC_PROFILE_MIN_GAME_SHARE)
  );
  return new Map(
    [...character.strong, ...character.weak]
      .filter((entry) => entry.games >= minGames)
      .map((entry) => [entry.multiset, entry.delta])
  );
}

function relativeGap(left, right) {
  const largest = Math.max(Math.abs(left), Math.abs(right));
  return largest > 0 ? Math.abs(left - right) / largest : 0;
}

function compareMetricProfiles(left, right) {
  const leftProfile = reliableMetricProfile(left);
  const rightProfile = reliableMetricProfile(right);
  const shared = [...leftProfile.keys()].filter((key) => rightProfile.has(key));
  const signAgreement =
    shared.length > 0
      ? shared.filter((key) => Math.sign(leftProfile.get(key)) === Math.sign(rightProfile.get(key)))
          .length / shared.length
      : 0;
  const deltaGap = relativeGap(
    left.classification.partnerDelta ?? 0,
    right.classification.partnerDelta ?? 0
  );
  const shareGap = relativeGap(
    left.classification.partnerGameShare ?? 0,
    right.classification.partnerGameShare ?? 0
  );

  return {
    shared: shared.length,
    signAgreement,
    deltaGap,
    shareGap,
    compatible:
      shared.length >= METRIC_MIN_SHARED_COMPOSITIONS &&
      signAgreement >= METRIC_CLUSTER_MIN_SIGN_AGREEMENT &&
      deltaGap <= METRIC_MAX_RELATIVE_GAP &&
      shareGap <= METRIC_MAX_RELATIVE_GAP,
  };
}

function pairwiseMetricComparisons(characters) {
  const comparisons = [];
  for (let left = 0; left < characters.length; left += 1) {
    for (let right = left + 1; right < characters.length; right += 1) {
      comparisons.push(compareMetricProfiles(characters[left], characters[right]));
    }
  }
  return comparisons;
}

function shouldSplitMetricRole(characters) {
  if (characters.length < 2) return false;
  const comparisons = pairwiseMetricComparisons(characters);
  const usable = comparisons.filter(
    (comparison) => comparison.shared >= METRIC_MIN_SHARED_COMPOSITIONS
  );
  if (usable.length === 0) return false;

  if (characters.length === 2) {
    const comparison = usable[0];
    return (
      comparison.signAgreement < METRIC_SPLIT_MAX_PAIR_SIGN_AGREEMENT ||
      comparison.deltaGap > 0.65 ||
      comparison.shareGap > 0.65
    );
  }

  const deltas = characters.map((character) => character.classification.partnerDelta ?? 0);
  const shares = characters.map((character) => character.classification.partnerGameShare ?? 0);
  const deltaCv = average(deltas) > 0 ? standardDeviation(deltas) / average(deltas) : 0;
  const shareCv = average(shares) > 0 ? standardDeviation(shares) / average(shares) : 0;

  return (
    Math.min(...usable.map((comparison) => comparison.signAgreement)) < 0.45 ||
    average(usable.map((comparison) => comparison.signAgreement)) < 0.5 ||
    (deltaCv > 0.35 && shareCv > 0.35)
  );
}

function metricClustersForRole(characters) {
  const ordered = [...characters].sort((a, b) => b.totalGames - a.totalGames);
  if (!shouldSplitMetricRole(ordered)) return [ordered];

  const clusters = [];
  for (const character of ordered) {
    const candidates = clusters
      .map((cluster, index) => ({
        index,
        comparisons: cluster.map((member) => compareMetricProfiles(character, member)),
      }))
      .filter(({ comparisons }) => comparisons.every((comparison) => comparison.compatible))
      .map(({ index, comparisons }) => ({
        index,
        score: average(comparisons.map((comparison) => comparison.signAgreement)),
      }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) clusters[candidates[0].index].push(character);
    else clusters.push([character]);
  }
  return clusters;
}

function metricTrendLabel(gameShare) {
  if (gameShare >= 0.2) return "주류형";
  if (gameShare >= 0.08) return "선택형";
  return "특화형";
}

// A/B처럼 순서만 나타내는 이름 대신, 실제 구성원들이 맡는 전투 임무를 이름으로 고정합니다.
// 키는 같은 지표군에 묶인 캐릭터/무기 프로필의 정렬된 조합입니다.
const METRIC_CLUSTER_ROLE_OVERRIDES = new Map([
  ["76_3", "후열 화력 보장"],
  ["53_14", "진형 붕괴 압박"],
  ["13_19|53_14", "진형 교란"],
  ["49_19", "측면 진입"],
  ["10_1", "근접 교란"],
  ["11_18", "진입 연계"],
  ["1_18", "처형 압박"],
  ["42_24", "광역 진입"],
  ["7_2", "벽 연계 포착"],
  ["81_9", "범위 장악"],
  ["9_9", "함정 연계"],
  ["15_6|79_8", "지속 견제"],
  ["79_8", "장거리 압박"],
  ["60_6", "기동 포착"],
  ["48_3", "전열 연계"],
  ["5_6", "누적 압박"],
  ["30_13|85_13", "강제 진입"],
  ["4_13", "진입 교란"],
  ["74_3", "정면 압박"],
  ["59_2", "추격 압박"],
  ["63_15", "변신 지속전"],
  ["11_16|29_2", "연속 진입"],
  ["7_1", "반격 포착"],
  ["82_21", "측면 교란"],
  ["32_5", "투사체 견제"],
  ["38_9", "생존 반격"],
  ["57_23", "성장 장기전"],
]);

// 1차 조합 적합군은 유지하되, 서로 다른 적합군에서 같은 전투 기능과 지표 패턴이
// 확인된 프로필은 공통 내부 역할군으로 확정합니다.
const CROSS_GROUP_METRIC_ROLE_OVERRIDES = [
  {
    id: "warrior-frontline-sustained-pressure",
    characterKeys: ["74_3", "80_19", "88_3"],
    label: "전열 유지 · 선봉 지속 압박형",
  },
  {
    id: "skilldealer-poke-followup-barrage",
    characterKeys: ["89_9"],
    label: "포킹 점사 · 후속 포화",
  },
];

function metricClusterRole(cluster) {
  const key = cluster.map(characterOutputKey).sort().join("|");
  return METRIC_CLUSTER_ROLE_OVERRIDES.get(key) ?? null;
}

function assignMetricSubgroups(characters) {
  const byFitRole = new Map();
  for (const character of characters) {
    const fitRole = character.classification.fitRole;
    const members = byFitRole.get(fitRole) ?? [];
    members.push(character);
    byFitRole.set(fitRole, members);
  }

  for (const [fitRole, members] of byFitRole) {
    const clusters = metricClustersForRole(members).sort(
      (a, b) =>
        b.reduce((sum, character) => sum + character.totalGames, 0) -
        a.reduce((sum, character) => sum + character.totalGames, 0)
    );
    const trends = clusters.map((cluster) =>
      metricTrendLabel(
        average(cluster.map((character) => character.classification.partnerGameShare ?? 0))
      )
    );
    const trendCounts = new Map();
    for (const trend of trends) trendCounts.set(trend, (trendCounts.get(trend) ?? 0) + 1);
    const trendIndexes = new Map();

    clusters.forEach((cluster, clusterIndex) => {
      const trend = trends[clusterIndex];
      const trendIndex = (trendIndexes.get(trend) ?? 0) + 1;
      trendIndexes.set(trend, trendIndex);
      const semanticRole = metricClusterRole(cluster);
      const suffix =
        clusters.length === 1
          ? ""
          : semanticRole
            ? ` · ${semanticRole}`
            : trendCounts.get(trend) === 1
              ? ` · ${trend}`
              : ` · ${trend} ${String.fromCharCode(64 + trendIndex)}`;
      const comparisons = pairwiseMetricComparisons(cluster).filter(
        (comparison) => comparison.shared >= METRIC_MIN_SHARED_COMPOSITIONS
      );
      const cohesion =
        comparisons.length > 0
          ? average(comparisons.map((comparison) => comparison.signAgreement))
          : null;
      const meanDelta = average(
        cluster.map((character) => character.classification.partnerDelta ?? 0)
      );
      const meanShare = average(
        cluster.map((character) => character.classification.partnerGameShare ?? 0)
      );
      const metricSummary =
        `대표 조합 평균 +${meanDelta.toFixed(2)} RP · 평균 비중 ${(meanShare * 100).toFixed(1)}%` +
        (cohesion == null ? " · 개별 지표군" : ` · 방향 일치 ${Math.round(cohesion * 100)}%`);

      for (const character of cluster) {
        character.classification.metricRole = `${fitRole}${suffix}`;
        character.classification.metricSummary = metricSummary;
        character.classification.metricCohesion = cohesion;
        character.classification.metricClusterSize = cluster.length;
      }
    });
  }
}

function assignCrossGroupMetricSubgroups(characters) {
  const charactersByKey = new Map(
    characters.map((character) => [characterOutputKey(character), character])
  );

  for (const override of CROSS_GROUP_METRIC_ROLE_OVERRIDES) {
    const cluster = override.characterKeys
      .map((key) => charactersByKey.get(key))
      .filter((character) => character != null);
    if (cluster.length !== override.characterKeys.length) continue;

    const comparisons = pairwiseMetricComparisons(cluster).filter(
      (comparison) => comparison.shared >= METRIC_MIN_SHARED_COMPOSITIONS
    );
    const cohesion =
      comparisons.length > 0
        ? average(comparisons.map((comparison) => comparison.signAgreement))
        : null;
    const meanDelta = average(
      cluster.map((character) => character.classification.partnerDelta ?? 0)
    );
    const meanShare = average(
      cluster.map((character) => character.classification.partnerGameShare ?? 0)
    );
    const metricSummary =
      `대표 조합 평균 +${meanDelta.toFixed(2)} RP · 평균 비중 ${(meanShare * 100).toFixed(1)}%` +
      (cohesion == null ? " · 개별 지표군" : ` · 방향 일치 ${Math.round(cohesion * 100)}%`);

    for (const character of cluster) {
      character.classification.metricGroupKey = override.id;
      character.classification.metricRole = override.label;
      character.classification.metricSummary = metricSummary;
      character.classification.metricCohesion = cohesion;
      character.classification.metricClusterSize = cluster.length;
    }
  }
}

function partnerRolesFromMultiset(multiset, focusRole) {
  const roles = multiset.split(" + ");
  const focusIndex = roles.indexOf(focusRole);
  if (focusIndex >= 0) roles.splice(focusIndex, 1);
  return roles;
}

function bestReliableAffinity(entries, focusRole, minGames, totalGames) {
  const reliableMinGames = Math.max(100, minGames, Math.ceil(totalGames * AFFINITY_MIN_GAME_SHARE));
  const candidates = entries
    .filter((entry) => entry.delta > 0 && entry.games >= reliableMinGames)
    .map((entry) => ({
      ...entry,
      partnerRoles: partnerRolesFromMultiset(entry.multiset, focusRole),
      gameShare: totalGames > 0 ? entry.games / totalGames : 0,
      score: entry.delta * entry.games ** AFFINITY_GAME_EXPONENT,
    }))
    .filter((entry) => entry.partnerRoles.length === 2)
    .sort((a, b) => b.score - a.score || b.games - a.games);
  return candidates[0] ?? null;
}

function sampleConfidenceScore(entry) {
  return entry.delta * Math.sqrt(entry.games);
}

function partnerRoleBadges(partnerRoles) {
  if (partnerRoles.length !== 2) return [];
  return partnerRoles[0] === partnerRoles[1]
    ? [`${partnerRoles[0]} ×2`]
    : [...new Set(partnerRoles)];
}

function compositionFitLabel(partnerRoles) {
  if (partnerRoles.length !== 2) return "대표 연계 표본 부족";
  return partnerRoles[0] === partnerRoles[1]
    ? `${partnerRoles[0]} 2인 연계형`
    : `${partnerRoles[0]}·${partnerRoles[1]} 연계형`;
}

function buildCompositionFitGroups(characters) {
  const byPartnerPair = new Map();
  for (const character of characters) {
    delete character.classification.metricGroupKey;
    const partnerRoles = character.classification.partnerRoles;
    const pairKey = partnerRoles.length === 2 ? partnerRoles.join(" + ") : "unknown";
    const group = byPartnerPair.get(pairKey) ?? {
      label: compositionFitLabel(partnerRoles),
      partnerRoles,
      characters: [],
      totalGames: 0,
    };
    group.characters.push(character);
    group.totalGames += character.totalGames;
    byPartnerPair.set(pairKey, group);
  }

  const ordered = [...byPartnerPair.values()].sort(
    (a, b) => b.totalGames - a.totalGames || a.label.localeCompare(b.label, "ko")
  );
  for (const group of ordered) assignMetricSubgroups(group.characters);
  assignCrossGroupMetricSubgroups(characters);
  const internalGroupK = ordered.reduce(
    (sum, group) =>
      sum +
      new Set(
        group.characters.map(
          (character) =>
            `${character.classification.metricRole}::${character.classification.metricSummary}`
        )
      ).size,
    0
  );
  const groups = ordered.map((group, id) => {
    for (const character of group.characters) character.groupId = id;
    return {
      id,
      label: group.label,
      curated: false,
      topPartnerRoles: partnerRoleBadges(group.partnerRoles),
      characterKeys: group.characters.map(characterOutputKey),
    };
  });

  const cleanedCharacters = ordered.flatMap((group) =>
    group.characters
      .sort((a, b) => b.totalGames - a.totalGames)
      .map((character) => {
        const { affinityScore: _, ...classification } = character.classification;
        return { ...character, classification };
      })
  );
  return { groups, characters: cleanedCharacters, internalGroupK };
}

const SELECT_COLUMNS = [
  "ally1_char",
  "ally1_weapon",
  "ally2_char",
  "ally2_weapon",
  "third_char",
  "third_weapon",
  "total_games",
  "total_rp",
].join(",");

const ENTRY_ADJUSTED_SELECT_COLUMNS = [
  "id",
  "character1",
  "weapon_type1",
  "character2",
  "weapon_type2",
  "character3",
  "weapon_type3",
  "total_games",
  "total_rp",
  "tier",
].join(",");

async function fetchSeasonCount(client, season) {
  const { count, error } = await client
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("patch_major", season);
  if (error) throw error;
  if (count == null) throw new Error(`시즌 ${season} 행 수를 확인하지 못했습니다.`);
  return count;
}

async function fetchWithRetry(run, label, maxAttempts = 4) {
  let lastResult = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await run();
    if (!lastResult.error) return lastResult;
    if (attempt < maxAttempts) {
      console.warn(
        `retry ${label} attempt=${attempt + 1}/${maxAttempts}: ${lastResult.error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return lastResult;
}

async function fetchRows(client) {
  const seasonCounts = Object.fromEntries(
    await Promise.all(
      SEASONS.map(async (season) => [season, await fetchSeasonCount(client, season)])
    )
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
      const { data, error } = await fetchWithRetry(
        () =>
          client
            .from(TABLE)
            .select(SELECT_COLUMNS)
            .eq("patch_major", task.season)
            .order("id", { ascending: true })
            .range(task.from, task.to),
        `season=${task.season} page=${task.page}`
      );
      if (error) throw error;
      if ((data?.length ?? 0) !== task.to - task.from + 1) {
        throw new Error(
          `시즌 ${task.season} page=${task.page} 행 수 불일치: ` +
            `expected=${task.to - task.from + 1} actual=${data?.length ?? 0}`
        );
      }
      pages[taskIndex] = data.map((row) => ({ ...row, season: Number(task.season) }));
      completed += 1;
      if (completed % 100 === 0 || completed === tasks.length) {
        console.log(`fetch pages=${completed}/${tasks.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()));
  return {
    rows: pages.flat(),
    expectedCount: Object.values(seasonCounts).reduce((sum, count) => sum + count, 0),
    seasonCounts,
  };
}

async function fetchEntryAdjustedRows(client) {
  const tiers = Object.keys(ENTRY_COST_BY_TIER);
  const { data: patchRows, error: patchError } = await client
    .from("PatchVersion")
    .select("version")
    .order("version", { ascending: true });
  if (patchError) throw patchError;
  const patchVersions = [...new Set((patchRows ?? []).map((row) => String(row.version)))].filter(
    (version) => SEASONS.some((season) => version === season || version.startsWith(`${season}.`))
  );
  if (patchVersions.length === 0) {
    throw new Error(`시즌 ${SEASONS.join(", ")} 패치 버전을 찾지 못했습니다.`);
  }
  const tasks = patchVersions.flatMap((patchVersion) =>
    tiers.map((tier) => ({ patchVersion, season: patchVersion.split(".")[0], tier }))
  );
  const pages = new Array(tasks.length);
  const seasonCounts = Object.fromEntries(SEASONS.map((season) => [season, 0]));
  let nextTask = 0;
  let completedPages = 0;
  let completedTasks = 0;

  async function worker() {
    for (;;) {
      const taskIndex = nextTask;
      nextTask += 1;
      if (taskIndex >= tasks.length) return;
      const task = tasks[taskIndex];
      const taskRows = [];
      let from = 0;

      for (;;) {
        const { data, error } = await fetchWithRetry(
          () =>
            client
              .from(TABLE)
              .select(ENTRY_ADJUSTED_SELECT_COLUMNS)
              .eq("patch_version", task.patchVersion)
              .eq("tier", task.tier)
              .order("character1", { ascending: true })
              .order("total_games", { ascending: false })
              .order("id", { ascending: true })
              .range(from, from + PAGE_SIZE - 1),
          `entry-adjusted patch=${task.patchVersion} tier=${task.tier} from=${from}`
        );
        if (error) {
          throw new Error(
            `entry-adjusted fetch failed patch=${task.patchVersion} tier=${task.tier} ` +
              `from=${from}: ${error.message}`
          );
        }
        const batch = data ?? [];
        taskRows.push(
          ...batch.map((row) => ({
            ally1_char: row.character1,
            ally1_weapon: row.weapon_type1,
            ally2_char: row.character2,
            ally2_weapon: row.weapon_type2,
            third_char: row.character3,
            third_weapon: row.weapon_type3,
            total_games: row.total_games,
            total_rp: row.total_rp,
            tier: row.tier,
            season: Number(task.season),
          }))
        );
        completedPages += 1;
        if (completedPages % 100 === 0) {
          console.log(
            `fetch entry-adjusted pages=${completedPages} tasks=${completedTasks}/${tasks.length}`
          );
        }
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      pages[taskIndex] = taskRows;
      seasonCounts[task.season] += taskRows.length;
      completedTasks += 1;
    }
  }

  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()));
  const rows = pages.flat();
  return { rows, expectedCount: rows.length, seasonCounts };
}

function buildRoleData({ role, slug }, rows, mappings) {
  const buckets = new Map();

  for (const row of rows) {
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    const multiset = multisetKey(mappings, members);

    for (const member of members) {
      if (primaryRole(mappings, member.characterCode, member.weapon) !== role) continue;
      const key = comboKey(mappings, member.characterCode, member.weapon);
      const bucket = buckets.get(key) ?? {
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
    .map(([, bucket]) => {
      const weapons = [...bucket.weapons];
      const ownMeanRP = bucket.weightedRp / bucket.totalGames;
      const entries = [...bucket.multisets.entries()]
        .filter(([, stat]) => stat.games >= minMultisetGames)
        .map(([multiset, stat]) => ({
          multiset,
          delta: round3(stat.weightedRp / stat.games - ownMeanRP),
          games: stat.games,
        }));
      const characterWeapon = isWeaponAgnostic(mappings, bucket.characterCode) ? null : weapons[0];
      const roles = comboRoles(mappings, bucket.characterCode, weapons[0]);
      const traits = traitsForCombo(mappings, bucket.characterCode, weapons[0]);
      const affinity = bestReliableAffinity(entries, role, minMultisetGames, bucket.totalGames);
      const partnerRoles = affinity?.partnerRoles ?? [];
      const classificationLabels = classificationForCombo(
        bucket.characterCode,
        weapons[0],
        role,
        traits,
        partnerRoles
      );

      return {
        characterCode: bucket.characterCode,
        characterName:
          mappings.characterNames[String(bucket.characterCode)] ?? `코드:${bucket.characterCode}`,
        weapon: characterWeapon,
        weaponName: displayWeaponName(mappings, bucket.characterCode, weapons),
        totalGames: bucket.totalGames,
        ownMeanRP: round3(ownMeanRP),
        groupId: null,
        classification: {
          method: "combat-traits+season-10-11-affinity",
          archetype: classificationLabels.archetype,
          roles,
          traits,
          partnerRoles,
          fitRole: classificationLabels.fitRole,
          fitReason: classificationLabels.fitReason,
          partnerDelta: affinity?.delta ?? null,
          partnerGames: affinity?.games ?? 0,
          partnerGameShare: affinity?.gameShare ?? 0,
          affinityScore: affinity?.score ?? 0,
          confidence: SAMPLE_CONFIDENCE
            ? (affinity?.games ?? 0) >= 300
              ? "high"
              : (affinity?.games ?? 0) >= 100
                ? "medium"
                : "low"
            : (affinity?.games ?? 0) >= 3000
              ? "high"
              : (affinity?.games ?? 0) >= 500
                ? "medium"
                : "low",
        },
        strong: entries
          .filter((entry) => entry.delta > 0)
          .sort((a, b) =>
            SAMPLE_CONFIDENCE
              ? sampleConfidenceScore(b) - sampleConfidenceScore(a) || b.games - a.games
              : b.delta - a.delta || b.games - a.games
          )
          .slice(0, STRONG_TOP_K),
        weak: entries
          .filter((entry) => entry.delta < 0)
          .sort((a, b) =>
            SAMPLE_CONFIDENCE
              ? sampleConfidenceScore(a) - sampleConfidenceScore(b) || b.games - a.games
              : a.delta - b.delta || b.games - a.games
          )
          .slice(0, WEAK_TOP_K),
      };
    })
    .filter((character) => character.totalGames >= MIN_TOTAL_GAMES)
    .sort((a, b) => b.totalGames - a.totalGames);

  const { characters, groups, internalGroupK } = buildCompositionFitGroups(builtCharacters);

  return {
    role,
    roleSlug: slug,
    groupK: groups.length,
    internalGroupK,
    minGames: minMultisetGames,
    cumulative: true,
    generatedFrom: TABLE,
    seasons: SEASONS.map(Number),
    scoreMode: scoreMode(),
    entryCosts: ENTRY_ADJUSTED ? ENTRY_COST_BY_TIER : undefined,
    classificationMethod:
      "primary-role+season-10-11-composition-fit-game-trend-metric-split-v5" +
      classificationModeSuffix(),
    primaryRoleOnly: true,
    generatedAt: new Date().toISOString().slice(0, 10),
    groups,
    characters,
  };
}

function secondOrderProfileIndex(roleDatas) {
  const index = new Map();
  for (const data of roleDatas) {
    for (const character of data.characters) {
      index.set(characterOutputKey(character), {
        characterCode: character.characterCode,
        characterName: character.characterName,
        weapon: character.weapon,
        weaponName: character.weaponName,
        role: data.role,
        // 2차 조합 검증은 1차 분류의 최종 내부 역할군을 입력으로 사용해야 한다.
        // 넓은 fitRole을 다시 쓰면 이미 분리한 지표군이 옛 그룹의 예외로 재등장한다.
        fitRole: character.classification.metricRole ?? character.classification.fitRole,
        baseFitRole: character.classification.fitRole,
        metricRole: character.classification.metricRole,
        ownMeanRP: character.ownMeanRP,
      });
    }
  }
  return index;
}

function resolveSecondOrderProfile(index, member) {
  return (
    index.get(`${member.characterCode}_${member.weapon}`) ??
    index.get(`${member.characterCode}_null`) ??
    null
  );
}

function secondOrderType(profile) {
  return { role: profile.role, fitRole: profile.fitRole };
}

function secondOrderTypeKey(type) {
  return `${type.role}:${type.fitRole}`;
}

function compareSecondOrderTypes(left, right) {
  return (
    (ROLE_ORDER.get(left.role) ?? 99) - (ROLE_ORDER.get(right.role) ?? 99) ||
    left.fitRole.localeCompare(right.fitRole, "ko")
  );
}

function secondOrderTypeMultiset(profiles) {
  return profiles.map(secondOrderType).sort(compareSecondOrderTypes);
}

function secondOrderCharacterMultiset(profiles) {
  return profiles
    .map((profile) => ({
      characterCode: profile.characterCode,
      characterName: profile.characterName,
      weapon: profile.weapon,
      weaponName: profile.weaponName,
      role: profile.role,
      fitRole: profile.fitRole,
    }))
    .sort(
      (left, right) =>
        compareSecondOrderTypes(left, right) ||
        left.characterCode - right.characterCode ||
        Number(left.weapon ?? -1) - Number(right.weapon ?? -1)
    );
}

function secondOrderCharacterCompositionKey(members) {
  return members.map((member) => `${member.characterCode}_${member.weapon ?? "null"}`).join(" + ");
}

function secondOrderCompositionKey(types) {
  return types.map(secondOrderTypeKey).join(" + ");
}

function secondOrderOuterRoleKey(profiles) {
  return profiles
    .map((profile) => profile.role)
    .sort((left, right) => (ROLE_ORDER.get(left) ?? 99) - (ROLE_ORDER.get(right) ?? 99))
    .join(" + ");
}

function secondOrderTrend(games) {
  if (games >= 5000) return "high";
  if (games >= 1000) return "medium";
  return "low";
}

function secondOrderValidationEvidence(games) {
  if (games >= SECOND_ORDER_VALIDATION_STRONG_GAMES) return "strong";
  if (games >= SECOND_ORDER_VALIDATION_CHECK_GAMES) return "checked";
  if (games >= SECOND_ORDER_VALIDATION_REFERENCE_GAMES) return "reference";
  return "insufficient";
}

function secondOrderValidationDirection(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function buildSecondOrderCombinationValidation(entry, conditionalCatalog, combinationRawLift) {
  const memberBuckets = new Map();
  for (const characterEntry of entry.characterCompositions.values()) {
    for (const member of characterEntry.members) {
      const memberKey = secondOrderProfileKey(member);
      const bucket = memberBuckets.get(memberKey) ?? {
        games: 0,
        weightedRp: 0,
        weightedResidual: 0,
      };
      bucket.games += characterEntry.games;
      bucket.weightedRp += characterEntry.weightedRp;
      bucket.weightedResidual += characterEntry.weightedResidual;
      memberBuckets.set(memberKey, bucket);
    }
  }

  const combinationDirection = secondOrderValidationDirection(combinationRawLift);
  const typeCounts = new Map();
  for (const type of entry.types) {
    const typeKey = secondOrderTypeKey(type);
    const current = typeCounts.get(typeKey) ?? { type, slots: 0 };
    current.slots += 1;
    typeCounts.set(typeKey, current);
  }

  const groupChecks = [...typeCounts.values()].map(({ type, slots }) => {
    const catalog = conditionalCatalog.find(
      (catalogEntry) => secondOrderTypeKey(catalogEntry) === secondOrderTypeKey(type)
    );
    const members = (catalog?.characters ?? []).map((character) => {
      const bucket = memberBuckets.get(secondOrderProfileKey(character));
      const games = bucket?.games ?? 0;
      const rawLift = games > 0 ? bucket.weightedResidual / games : null;
      const adjustedLift =
        rawLift == null
          ? null
          : rawLift *
            (games / (games + SECOND_ORDER_VALIDATION_CHECK_GAMES));
      const direction =
        rawLift == null ? "unobserved" : secondOrderValidationDirection(rawLift);
      const aligned =
        direction === "unobserved" || direction === "neutral" || combinationDirection === "neutral"
          ? null
          : direction === combinationDirection;
      return {
        characterCode: character.characterCode,
        characterName: character.characterName,
        weapon: character.weapon,
        weaponName: character.weaponName,
        games,
        rawLift: rawLift == null ? null : round3(rawLift),
        adjustedLift: adjustedLift == null ? null : round3(adjustedLift),
        direction,
        aligned,
        evidence: secondOrderValidationEvidence(games),
      };
    });
    const observedMembers = members.filter(
      (member) => member.games >= SECOND_ORDER_VALIDATION_REFERENCE_GAMES
    );
    const checkedMembers = members.filter(
      (member) => member.games >= SECOND_ORDER_VALIDATION_CHECK_GAMES && member.aligned != null
    );
    const alignedMembers = checkedMembers.filter((member) => member.aligned);
    const checkedGames = checkedMembers.reduce((sum, member) => sum + member.games, 0);
    const alignedGames = alignedMembers.reduce((sum, member) => sum + member.games, 0);
    const directionAgreement =
      checkedMembers.length > 0 ? alignedMembers.length / checkedMembers.length : null;
    const weightedDirectionAgreement = checkedGames > 0 ? alignedGames / checkedGames : null;
    const status =
      checkedMembers.length < 2
        ? "insufficient"
        : directionAgreement >= 0.75
          ? "consistent"
          : "mixed";
    return {
      ...type,
      slots,
      expectedMembers: members.length,
      observedMembers: observedMembers.length,
      checkedMembers: checkedMembers.length,
      strongMembers: members.filter(
        (member) => member.games >= SECOND_ORDER_VALIDATION_STRONG_GAMES
      ).length,
      alignedMembers: alignedMembers.length,
      exceptionMembers: checkedMembers.length - alignedMembers.length,
      directionAgreement:
        directionAgreement == null ? null : round3(directionAgreement),
      weightedDirectionAgreement:
        weightedDirectionAgreement == null ? null : round3(weightedDirectionAgreement),
      status,
      members: members.sort(
        (left, right) =>
          right.games - left.games ||
          left.characterName.localeCompare(right.characterName, "ko")
      ),
    };
  });

  const exactCandidates = [...entry.characterCompositions.values()]
    .filter(
      (characterEntry) =>
        characterEntry.games >= SECOND_ORDER_VALIDATION_REFERENCE_GAMES
    )
    .map((characterEntry) => {
      const rawLift = characterEntry.weightedResidual / characterEntry.games;
      const adjustedLift =
        rawLift *
        (characterEntry.games /
          (characterEntry.games + SECOND_ORDER_VALIDATION_CHECK_GAMES));
      return {
        key: secondOrderCharacterCompositionKey(characterEntry.members),
        members: characterEntry.members,
        games: characterEntry.games,
        avgRp: round3(characterEntry.weightedRp / characterEntry.games),
        rawLift: round3(rawLift),
        adjustedLift: round3(adjustedLift),
        sampleScore: round3(rawLift * Math.sqrt(characterEntry.games)),
        direction: secondOrderValidationDirection(rawLift),
        aligned:
          combinationDirection === "neutral"
            ? null
            : secondOrderValidationDirection(rawLift) === combinationDirection,
        evidence: secondOrderValidationEvidence(characterEntry.games),
      };
    });
  const selectedExactKeys = new Set([
    ...exactCandidates
      .filter((candidate) => candidate.aligned !== false)
      .sort((left, right) => right.sampleScore - left.sampleScore || right.games - left.games)
      .slice(0, SECOND_ORDER_VALIDATION_TOP_POSITIVE)
      .map((candidate) => candidate.key),
    ...exactCandidates
      .filter((candidate) => candidate.aligned === false)
      .sort((left, right) => left.sampleScore - right.sampleScore || right.games - left.games)
      .slice(0, SECOND_ORDER_VALIDATION_TOP_EXCEPTION)
      .map((candidate) => candidate.key),
    ...exactCandidates
      .toSorted((left, right) => right.games - left.games)
      .slice(0, SECOND_ORDER_VALIDATION_TOP_VOLUME)
      .map((candidate) => candidate.key),
  ]);
  const actualCombinations = exactCandidates
    .filter((candidate) => selectedExactKeys.has(candidate.key))
    .sort(
      (left, right) =>
        Number(right.aligned) - Number(left.aligned) ||
        right.games - left.games ||
        right.sampleScore - left.sampleScore
    )
    .map(({ key: _, ...candidate }) => candidate);

  return {
    combinationDirection,
    referenceGames: SECOND_ORDER_VALIDATION_REFERENCE_GAMES,
    checkGames: SECOND_ORDER_VALIDATION_CHECK_GAMES,
    strongGames: SECOND_ORDER_VALIDATION_STRONG_GAMES,
    exactCombinationCount: exactCandidates.length,
    actualCombinations,
    groupChecks,
  };
}

function removeOneFocalType(types, focalKey) {
  const partners = [...types];
  const focalIndex = partners.findIndex((type) => secondOrderTypeKey(type) === focalKey);
  if (focalIndex >= 0) partners.splice(focalIndex, 1);
  return partners;
}

function secondOrderProfileKey(profile) {
  return `${profile.characterCode}_${profile.weapon ?? "null"}`;
}

function conditionalPartnerProfiles(profiles, focalIndex) {
  return profiles
    .filter((_, index) => index !== focalIndex)
    .sort(
      (left, right) =>
        (ROLE_ORDER.get(left.role) ?? 99) - (ROLE_ORDER.get(right.role) ?? 99) ||
        secondOrderProfileKey(left).localeCompare(secondOrderProfileKey(right))
    );
}

function conditionalContextTypes(context, labels) {
  return (context.partnerProfiles ?? [])
    .map(
      (profile) =>
        labels.get(secondOrderProfileKey(profile)) ?? secondOrderType(profile)
    )
    .sort(compareSecondOrderTypes);
}

function aggregateConditionalContexts(character, labels) {
  const aggregated = new Map();
  for (const context of character.contexts.values()) {
    const types = conditionalContextTypes(context, labels);
    const key = secondOrderCompositionKey(types);
    const bucket = aggregated.get(key) ?? {
      types,
      games: 0,
      weightedResidual: 0,
      seasonStats: new Map(),
    };
    bucket.games += context.games;
    bucket.weightedResidual += context.weightedResidual;
    for (const [season, seasonStat] of context.seasonStats ?? []) {
      const bucketSeason = bucket.seasonStats.get(season) ?? {
        games: 0,
        weightedResidual: 0,
      };
      bucketSeason.games += seasonStat.games;
      bucketSeason.weightedResidual += seasonStat.weightedResidual;
      bucket.seasonStats.set(season, bucketSeason);
    }
    aggregated.set(key, bucket);
  }
  return aggregated;
}

function reliableFullTrendProfile(character, labels, minGameShare = 0.01) {
  const minGames = Math.max(
    CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
    Math.ceil(character.totalGames * minGameShare)
  );
  return new Map(
    [...aggregateConditionalContexts(character, labels).entries()]
      .filter(([, context]) => context.games >= minGames)
      .map(([key, context]) => {
        const residual = context.weightedResidual / context.games;
        return [
          key,
          {
            games: context.games,
            residual,
            // 작은 표본의 큰 상승·하락폭이 군집을 지배하지 않도록 수축합니다.
            adjustedResidual: residual * (context.games / (context.games + minGames)),
          },
        ];
      })
  );
}

function compareFullTrendCharactersAtScale(
  left,
  right,
  labels,
  profileCache = null,
  minGameShare = 0.01
) {
  const profileFor = (character) => {
    const key = secondOrderProfileKey(character.profile);
    if (profileCache?.has(key)) return profileCache.get(key);
    const profile = reliableFullTrendProfile(character, labels, minGameShare);
    profileCache?.set(key, profile);
    return profile;
  };
  const leftProfile = profileFor(left);
  const rightProfile = profileFor(right);
  const sharedKeys = [...leftProfile.keys()].filter((key) => rightProfile.has(key));
  if (sharedKeys.length === 0) {
    return {
      shared: 0,
      sharedGames: 0,
      signAgreement: 0,
      cosineSimilarity: 0,
      magnitudeAgreement: 0,
      trendSimilarity: 0,
    };
  }

  let totalWeight = 0;
  let sharedGames = 0;
  let signWeight = 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  let magnitudeWeight = 0;
  for (const key of sharedKeys) {
    const leftValue = leftProfile.get(key);
    const rightValue = rightProfile.get(key);
    const weight = Math.sqrt(Math.min(leftValue.games, rightValue.games));
    const leftResidual = leftValue.adjustedResidual;
    const rightResidual = rightValue.adjustedResidual;
    totalWeight += weight;
    sharedGames += Math.min(leftValue.games, rightValue.games);
    if (Math.sign(leftResidual) === Math.sign(rightResidual)) signWeight += weight;
    dot += leftResidual * rightResidual * weight;
    leftNorm += leftResidual ** 2 * weight;
    rightNorm += rightResidual ** 2 * weight;
    magnitudeWeight +=
      (1 -
        Math.min(
          1,
          Math.abs(leftResidual - rightResidual) /
            (Math.abs(leftResidual) + Math.abs(rightResidual) + 0.5)
        )) * weight;
  }
  const signAgreement = totalWeight > 0 ? signWeight / totalWeight : 0;
  const cosineSimilarity =
    leftNorm > 0 && rightNorm > 0 ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
  const magnitudeAgreement = totalWeight > 0 ? magnitudeWeight / totalWeight : 0;
  // 방향을 가장 중요하게 보고, 상승폭 모양과 크기까지 함께 반영합니다.
  const trendSimilarity =
    signAgreement * 0.5 + ((cosineSimilarity + 1) / 2) * 0.3 + magnitudeAgreement * 0.2;
  return {
    shared: sharedKeys.length,
    sharedGames,
    signAgreement,
    cosineSimilarity,
    magnitudeAgreement,
    trendSimilarity,
  };
}

function compareFullTrendCharacters(
  left,
  right,
  labels,
  profileCache = null,
  referenceLabels = null,
  referenceProfileCache = null,
  detailedProfileCache = null
) {
  // 군집 안정화 계산은 기존 1% 문턱을 유지하고, 사용자에게 보여주는 세부 조합
  // 유사도만 별도 100판 문턱으로 계산합니다. 표시 지표가 분류 자체를 과분리하지
  // 않도록 두 계산을 분리합니다.
  const refined = compareFullTrendCharactersAtScale(
    left,
    right,
    labels,
    profileCache,
    0.01
  );
  const detailed = compareFullTrendCharactersAtScale(
    left,
    right,
    labels,
    detailedProfileCache,
    0
  );
  const refinedReliable = refined.shared >= FULL_TREND_MIN_SHARED_CONTEXTS;
  const detailedReliable = detailed.shared >= FULL_TREND_MIN_SHARED_CONTEXTS;
  if (referenceLabels == null || referenceLabels === labels) {
    return {
      ...refined,
      refinedTrendSimilarity: detailedReliable ? detailed.trendSimilarity : null,
      refinedShared: detailed.shared,
      refinedSharedGames: detailed.sharedGames,
      referenceTrendSimilarity: refinedReliable ? refined.trendSimilarity : null,
      referenceShared: refined.shared,
      referenceSharedGames: refined.sharedGames,
    };
  }

  const reference = compareFullTrendCharactersAtScale(
    left,
    right,
    referenceLabels,
    referenceProfileCache,
    0.01
  );
  const referenceReliable = reference.shared >= FULL_TREND_MIN_SHARED_CONTEXTS;
  if (!referenceReliable) {
    return {
      ...refined,
      refinedTrendSimilarity: detailedReliable ? detailed.trendSimilarity : null,
      refinedShared: detailed.shared,
      refinedSharedGames: detailed.sharedGames,
      referenceTrendSimilarity: null,
      referenceShared: reference.shared,
      referenceSharedGames: reference.sharedGames,
    };
  }
  // 세부 역할군에서 공통 문맥이 아직 충분하지 않으면 기존 공통 좌표를 유지합니다.
  // 충분한 경우에만 새 역할군 경향을 60% 반영해 다음 반복의 이동을 결정합니다.
  if (!refinedReliable) {
    return {
      ...reference,
      refinedTrendSimilarity: detailedReliable ? detailed.trendSimilarity : null,
      refinedShared: detailed.shared,
      refinedSharedGames: detailed.sharedGames,
      referenceTrendSimilarity: reference.trendSimilarity,
      referenceShared: reference.shared,
      referenceSharedGames: reference.sharedGames,
    };
  }

  const refinedWeight = FULL_TREND_REFINED_CONTEXT_WEIGHT;
  const referenceWeight = 1 - refinedWeight;
  return {
    shared: Math.max(reference.shared, refined.shared),
    sharedGames: Math.round(
      reference.sharedGames * referenceWeight + refined.sharedGames * refinedWeight
    ),
    signAgreement:
      reference.signAgreement * referenceWeight + refined.signAgreement * refinedWeight,
    cosineSimilarity:
      reference.cosineSimilarity * referenceWeight + refined.cosineSimilarity * refinedWeight,
    magnitudeAgreement:
      reference.magnitudeAgreement * referenceWeight +
      refined.magnitudeAgreement * refinedWeight,
    trendSimilarity:
      reference.trendSimilarity * referenceWeight + refined.trendSimilarity * refinedWeight,
    refinedTrendSimilarity: detailedReliable ? detailed.trendSimilarity : null,
    referenceShared: reference.shared,
    referenceSharedGames: reference.sharedGames,
    referenceTrendSimilarity: reference.trendSimilarity,
    refinedShared: detailed.shared,
    refinedSharedGames: detailed.sharedGames,
  };
}

function fullTrendClusters(
  characters,
  labels,
  referenceLabels = null,
  detailedOnly = false
) {
  const ordered = [...characters].sort(
    (left, right) =>
      right.totalGames - left.totalGames ||
      secondOrderProfileKey(left.profile).localeCompare(secondOrderProfileKey(right.profile))
  );
  const profileCache = new Map();
  const referenceProfileCache = new Map();
  const detailedProfileCache = new Map();
  const comparisonCache = new Map();
  const comparePair = (left, right) => {
    const keys = [secondOrderProfileKey(left.profile), secondOrderProfileKey(right.profile)].sort();
    const key = keys.join("|");
    if (!comparisonCache.has(key)) {
      const comparison = compareFullTrendCharacters(
          left,
          right,
          labels,
          profileCache,
          referenceLabels,
          referenceProfileCache,
          detailedProfileCache
        );
      comparisonCache.set(
        key,
        detailedOnly
          ? {
              ...comparison,
              shared: comparison.refinedShared,
              sharedGames: comparison.refinedSharedGames,
              trendSimilarity: comparison.refinedTrendSimilarity ?? -1,
            }
          : comparison
      );
    }
    return comparisonCache.get(key);
  };
  const clusterComparison = (leftCluster, rightCluster) => {
    const comparisons = leftCluster
      .flatMap((left) => rightCluster.map((right) => comparePair(left, right)))
      .filter((comparison) => comparison.shared >= FULL_TREND_MIN_SHARED_CONTEXTS);
    const possiblePairs = leftCluster.length * rightCluster.length;
    const totalWeight = comparisons.reduce(
      (sum, comparison) => sum + Math.sqrt(Math.max(comparison.sharedGames, 1)),
      0
    );
    return {
      knownPairs: comparisons.length,
      coverage: possiblePairs > 0 ? comparisons.length / possiblePairs : 0,
      average:
        totalWeight > 0
          ? comparisons.reduce(
              (sum, comparison) =>
                sum +
                comparison.trendSimilarity * Math.sqrt(Math.max(comparison.sharedGames, 1)),
              0
            ) / totalWeight
          : -1,
      minimum:
        comparisons.length > 0
          ? Math.min(...comparisons.map((comparison) => comparison.trendSimilarity))
          : -1,
    };
  };

  // 완전 연결에 가까운 계층 병합으로 시작해 한 캐릭터의 고점 하나가 아니라
  // 군집 전체와 경향이 맞을 때만 같은 역할군으로 묶습니다.
  const clusters = ordered.map((character) => [character]);
  for (;;) {
    let best = null;
    for (let left = 0; left < clusters.length; left += 1) {
      for (let right = left + 1; right < clusters.length; right += 1) {
        const comparison = clusterComparison(clusters[left], clusters[right]);
        const enoughCoverage =
          comparison.knownPairs > 0 &&
          (clusters[left].length === 1 ||
            clusters[right].length === 1 ||
            comparison.coverage >= 0.5);
        if (
          !enoughCoverage ||
          comparison.average < FULL_TREND_MERGE_AVERAGE ||
          comparison.minimum < FULL_TREND_MERGE_MINIMUM
        ) {
          continue;
        }
        if (
          best == null ||
          comparison.average > best.comparison.average ||
          (comparison.average === best.comparison.average &&
            comparison.knownPairs > best.comparison.knownPairs)
        ) {
          best = { left, right, comparison };
        }
      }
    }
    if (best == null) break;
    clusters[best.left].push(...clusters[best.right]);
    clusters.splice(best.right, 1);
  }

  // 초기 병합 결과가 생긴 뒤에도 모든 군집을 다시 비교하여, 기존 분류와 무관하게
  // 전체 경향이 더 가까운 곳으로 이동할 수 있게 합니다.
  let validationIterations = 0;
  let converged = false;
  for (let pass = 0; pass < 8; pass += 1) {
    validationIterations = pass + 1;
    let moved = false;
    for (const character of ordered.toReversed()) {
      const ownIndex = clusters.findIndex((cluster) => cluster.includes(character));
      if (ownIndex < 0 || clusters[ownIndex].length === 1) continue;
      const ownPeers = clusters[ownIndex].filter((member) => member !== character);
      const ownComparison = clusterComparison([character], ownPeers);
      const candidates = clusters
        .map((cluster, index) => ({
          index,
          comparison: index === ownIndex ? ownComparison : clusterComparison([character], cluster),
        }))
        .filter(
          (candidate) =>
            candidate.index !== ownIndex &&
            candidate.comparison.knownPairs > 0 &&
            candidate.comparison.minimum >= FULL_TREND_MERGE_MINIMUM
        )
        .sort((left, right) => right.comparison.average - left.comparison.average);
      const target = candidates[0];
      if (
        target &&
        target.comparison.average >= FULL_TREND_MERGE_AVERAGE &&
        target.comparison.average >= ownComparison.average + FULL_TREND_MOVE_GAIN
      ) {
        clusters[ownIndex] = ownPeers;
        clusters[target.index].push(character);
        moved = true;
      }
    }
    for (let index = clusters.length - 1; index >= 0; index -= 1) {
      if (clusters[index].length === 0) clusters.splice(index, 1);
    }
    if (!moved) {
      converged = true;
      break;
    }
  }

  // 통계적 유사도만으로는 구분되지 않는 전투 기능 차이를 최종 역할 제약으로 반영합니다.
  // 같은 캐릭터의 다른 무기는 별도 프로필이므로 지정한 무기만 격리됩니다.
  for (const profileKey of FULL_TREND_ROLE_ISOLATIONS.keys()) {
    const clusterIndex = clusters.findIndex((cluster) =>
      cluster.some((character) => secondOrderProfileKey(character.profile) === profileKey)
    );
    if (clusterIndex < 0) continue;
    const characterIndex = clusters[clusterIndex].findIndex(
      (character) => secondOrderProfileKey(character.profile) === profileKey
    );
    if (characterIndex < 0 || clusters[clusterIndex].length === 1) continue;
    const [isolatedCharacter] = clusters[clusterIndex].splice(characterIndex, 1);
    clusters.push([isolatedCharacter]);
  }

  return {
    clusters: clusters
      .map((cluster) =>
        cluster.sort(
          (left, right) =>
            right.totalGames - left.totalGames ||
            secondOrderProfileKey(left.profile).localeCompare(
              secondOrderProfileKey(right.profile)
            )
        )
      )
      .sort(
        (left, right) =>
          right.reduce((sum, character) => sum + character.totalGames, 0) -
          left.reduce((sum, character) => sum + character.totalGames, 0)
      ),
    validationIterations,
    converged,
  };
}

function summarizeTrendComparisons(
  comparisons,
  similarityKey = "trendSimilarity",
  sharedKey = "shared",
  gamesKey = "sharedGames"
) {
  const reliable = comparisons.filter(
    (comparison) =>
      comparison[similarityKey] != null &&
      comparison[sharedKey] >= FULL_TREND_MIN_SHARED_CONTEXTS
  );
  const totalWeight = reliable.reduce(
    (sum, comparison) => sum + Math.sqrt(Math.max(comparison[gamesKey], 1)),
    0
  );
  return {
    pairs: reliable.length,
    average:
      totalWeight > 0
        ? reliable.reduce(
            (sum, comparison) =>
              sum +
              comparison[similarityKey] * Math.sqrt(Math.max(comparison[gamesKey], 1)),
            0
          ) / totalWeight
        : null,
    minimum:
      reliable.length > 0
        ? Math.min(...reliable.map((comparison) => comparison[similarityKey]))
        : null,
  };
}

function clusterFullTrendStats(cluster, labels, referenceLabels = null) {
  const profileCache = new Map();
  const referenceProfileCache = new Map();
  const detailedProfileCache = new Map();
  const comparisons = [];
  for (let left = 0; left < cluster.length; left += 1) {
    for (let right = left + 1; right < cluster.length; right += 1) {
      const comparison = compareFullTrendCharacters(
        cluster[left],
        cluster[right],
        labels,
        profileCache,
        referenceLabels,
        referenceProfileCache,
        detailedProfileCache
      );
      if (comparison.shared >= FULL_TREND_MIN_SHARED_CONTEXTS) comparisons.push(comparison);
    }
  }
  const combined = summarizeTrendComparisons(comparisons);
  const refined = summarizeTrendComparisons(
    comparisons,
    "refinedTrendSimilarity",
    "refinedShared",
    "refinedSharedGames"
  );
  const reference = summarizeTrendComparisons(
    comparisons,
    "referenceTrendSimilarity",
    "referenceShared",
    "referenceSharedGames"
  );
  return {
    sharedPairs: combined.pairs,
    cohesion: combined.average,
    minimum: combined.minimum,
    refinedSharedPairs: refined.pairs,
    refinedCohesion: refined.average,
    refinedMinimum: refined.minimum,
    referenceSharedPairs: reference.pairs,
    referenceCohesion: reference.average,
    referenceMinimum: reference.minimum,
  };
}

function fullTrendAssignmentEvidence(clusters, labels, referenceLabels = null) {
  const profileCache = new Map();
  const referenceProfileCache = new Map();
  const detailedProfileCache = new Map();
  const comparisonCache = new Map();
  const comparePair = (left, right) => {
    const keys = [secondOrderProfileKey(left.profile), secondOrderProfileKey(right.profile)].sort();
    const key = keys.join("|");
    if (!comparisonCache.has(key)) {
      comparisonCache.set(
        key,
        compareFullTrendCharacters(
          left,
          right,
          labels,
          profileCache,
          referenceLabels,
          referenceProfileCache,
          detailedProfileCache
        )
      );
    }
    return comparisonCache.get(key);
  };
  const compareToCluster = (character, cluster) => {
    const comparisons = cluster
      .filter((member) => member !== character)
      .map((member) => comparePair(character, member));
    const combined = summarizeTrendComparisons(comparisons);
    const refined = summarizeTrendComparisons(
      comparisons,
      "refinedTrendSimilarity",
      "refinedShared",
      "refinedSharedGames"
    );
    return {
      knownPairs: combined.pairs,
      average: combined.average,
      minimum: combined.minimum,
      refinedKnownPairs: refined.pairs,
      refinedAverage: refined.average,
      refinedMinimum: refined.minimum,
    };
  };

  const evidence = new Map();
  clusters.forEach((ownCluster, ownIndex) => {
    for (const character of ownCluster) {
      const characterKey = secondOrderProfileKey(character.profile);
      const roleIsolated = FULL_TREND_ROLE_ISOLATIONS.has(characterKey);
      const own = compareToCluster(character, ownCluster);
      const alternatives = clusters
        .map((cluster, index) => ({ index, cluster, comparison: compareToCluster(character, cluster) }))
        .filter(
          (candidate) =>
            candidate.index !== ownIndex &&
            candidate.comparison.average != null &&
            // 전투 기능 때문에 의도적으로 격리한 단독 유형은 다른 캐릭터를 다시
            // 통계 경계 후보로 끌어들이지 않도록 교차 후보에서 제외합니다.
            (roleIsolated ||
              !candidate.cluster.some((member) =>
                FULL_TREND_ROLE_ISOLATIONS.has(secondOrderProfileKey(member.profile))
              ))
        )
        .sort(
          (left, right) =>
            right.comparison.average - left.comparison.average ||
            (right.comparison.minimum ?? -1) - (left.comparison.minimum ?? -1) ||
            right.comparison.knownPairs - left.comparison.knownPairs
        );
      const alternative = alternatives[0] ?? null;
      const refinedAlternatives = clusters
        .map((cluster, index) => ({
          index,
          cluster,
          comparison: compareToCluster(character, cluster),
        }))
        .filter(
          (candidate) =>
            candidate.index !== ownIndex &&
            candidate.comparison.refinedAverage != null &&
            (roleIsolated ||
              !candidate.cluster.some((member) =>
                FULL_TREND_ROLE_ISOLATIONS.has(secondOrderProfileKey(member.profile))
              ))
        )
        .sort(
          (left, right) =>
            right.comparison.refinedAverage - left.comparison.refinedAverage ||
            (right.comparison.refinedMinimum ?? -1) -
              (left.comparison.refinedMinimum ?? -1) ||
            right.comparison.refinedKnownPairs - left.comparison.refinedKnownPairs
        );
      const refinedAlternative = refinedAlternatives[0] ?? null;
      const alternativeSimilarity = alternative?.comparison.average ?? null;
      const assignmentMargin =
        alternativeSimilarity == null
          ? null
          : own.average == null
            ? FULL_TREND_MERGE_AVERAGE - alternativeSimilarity
            : own.average - alternativeSimilarity;
      const alternativeNearBoundary =
        alternativeSimilarity != null &&
        alternativeSimilarity >= FULL_TREND_AMBIGUOUS_AVERAGE &&
        (alternative?.comparison.minimum ?? -1) >= FULL_TREND_AMBIGUOUS_MINIMUM;
      const ambiguous =
        !roleIsolated &&
        alternativeNearBoundary &&
        assignmentMargin != null &&
        assignmentMargin <= FULL_TREND_AMBIGUOUS_MARGIN;
      const refinedAlternativeSimilarity =
        refinedAlternative?.comparison.refinedAverage ?? null;
      const refinedAssignmentMargin =
        refinedAlternativeSimilarity == null
          ? null
          : own.refinedAverage == null
            ? FULL_TREND_MERGE_AVERAGE - refinedAlternativeSimilarity
            : own.refinedAverage - refinedAlternativeSimilarity;
      const refinedAlternativeNearBoundary =
        refinedAlternativeSimilarity != null &&
        refinedAlternativeSimilarity >= FULL_TREND_AMBIGUOUS_AVERAGE &&
        (refinedAlternative?.comparison.refinedMinimum ?? -1) >=
          FULL_TREND_AMBIGUOUS_MINIMUM;
      const refinedAmbiguous =
        !roleIsolated &&
        refinedAlternativeNearBoundary &&
        refinedAssignmentMargin != null &&
        refinedAssignmentMargin <= FULL_TREND_AMBIGUOUS_MARGIN;

      evidence.set(characterKey, {
        ownSimilarity: own.average,
        ownSharedPairs: own.knownPairs,
        alternativeSimilarity,
        alternativeMinimum: alternative?.comparison.minimum ?? null,
        alternativeSharedPairs: alternative?.comparison.knownPairs ?? 0,
        assignmentMargin,
        ambiguous,
        refinedOwnSimilarity: own.refinedAverage,
        refinedOwnSharedPairs: own.refinedKnownPairs,
        refinedAlternativeSimilarity,
        refinedAlternativeMinimum:
          refinedAlternative?.comparison.refinedMinimum ?? null,
        refinedAlternativeSharedPairs:
          refinedAlternative?.comparison.refinedKnownPairs ?? 0,
        refinedAssignmentMargin,
        refinedAmbiguous,
        refinedAlternativeCharacters:
          refinedAlternative?.cluster.map((member) => ({
            characterCode: member.profile.characterCode,
            characterName: member.profile.characterName,
            weapon: member.profile.weapon,
            weaponName: member.profile.weaponName,
          })) ?? [],
        alternativeCharacters:
          alternative?.cluster.map((member) => ({
            characterCode: member.profile.characterCode,
            characterName: member.profile.characterName,
            weapon: member.profile.weapon,
            weaponName: member.profile.weaponName,
          })) ?? [],
      });
    }
  });
  return evidence;
}

function conditionalClusterContexts(cluster, labels) {
  const contexts = new Map();
  for (const character of cluster) {
    for (const [key, context] of aggregateConditionalContexts(character, labels)) {
      const bucket = contexts.get(key) ?? {
        types: context.types,
        games: 0,
        weightedResidual: 0,
      };
      bucket.games += context.games;
      bucket.weightedResidual += context.weightedResidual;
      contexts.set(key, bucket);
    }
  }
  return [...contexts.entries()]
    .filter(([, context]) => context.games >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES)
    .map(([key, context]) => ({
      key,
      ...context,
      residual: context.weightedResidual / context.games,
      adjustedResidual:
        (context.weightedResidual / context.games) *
        (context.games / (context.games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES)),
    }))
    .sort(
      (left, right) =>
        Math.abs(right.adjustedResidual) * Math.sqrt(right.games) -
          Math.abs(left.adjustedResidual) * Math.sqrt(left.games) ||
        right.games - left.games
    );
}

function conditionalClusterContext(cluster, labels) {
  return (
    conditionalClusterContexts(cluster, labels)
      .filter((context) => context.residual > 0)
      .sort(
        (left, right) =>
          right.adjustedResidual * Math.sqrt(right.games) -
            left.adjustedResidual * Math.sqrt(left.games) ||
          right.games - left.games
      )[0] ?? null
  );
}

function conditionalContextSuffix(bestContext, cluster) {
  if (!bestContext?.types?.length) {
    return `${cluster[0].profile.characterName} 중심`;
  }

  const fitRoleCounts = new Map();
  for (const type of bestContext.types) {
    fitRoleCounts.set(type.fitRole, (fitRoleCounts.get(type.fitRole) ?? 0) + 1);
  }
  const partnerTypes = bestContext.types.map((type) =>
    fitRoleCounts.get(type.fitRole) > 1 ? `${type.role} ${type.fitRole}` : type.fitRole
  );
  return `${partnerTypes.join(" + ")} 연계`;
}

function dominantConditionalFitRole(cluster) {
  const counts = new Map();
  for (const character of cluster) {
    const fitRole = character.profile.fitRole;
    const current = counts.get(fitRole) ?? { fitRole, games: 0, members: 0 };
    current.games += character.totalGames;
    current.members += 1;
    counts.set(fitRole, current);
  }
  return [...counts.values()].sort(
    (left, right) => right.games - left.games || right.members - left.members
  )[0]?.fitRole;
}

function globalClusteringSignature(clusteringByRole) {
  return [...clusteringByRole.entries()]
    .map(([role, clustering]) => {
      const clusterSignatures = clustering.clusters
        .map((cluster) =>
          cluster
            .map((character) => secondOrderProfileKey(character.profile))
            .sort()
            .join(",")
        )
        .sort();
      return `${role}:${clusterSignatures.join("|")}`;
    })
    .sort()
    .join("||");
}

function globalLabelPartitionSignature(labels) {
  const membersByType = new Map();
  for (const [profileKey, type] of labels) {
    const typeKey = secondOrderTypeKey(type);
    const members = membersByType.get(typeKey) ?? [];
    members.push(profileKey);
    membersByType.set(typeKey, members);
  }
  return [...membersByType.entries()]
    .map(([typeKey, members]) => `${typeKey}:${members.sort().join(",")}`)
    .sort()
    .join("||");
}

function iterativeGlobalLabels(clusteringHistory) {
  const membershipByProfile = new Map();
  clusteringHistory.forEach((clusteringByRole, pass) => {
    for (const [role, clustering] of clusteringByRole) {
      const orderedClusters = clustering.clusters
        .map((cluster) => ({
          cluster,
          signature: cluster
            .map((character) => secondOrderProfileKey(character.profile))
            .sort()
            .join(","),
        }))
        .sort((left, right) => left.signature.localeCompare(right.signature));
      orderedClusters.forEach(({ cluster }, index) => {
        for (const character of cluster) {
          const profileKey = secondOrderProfileKey(character.profile);
          const membership = membershipByProfile.get(profileKey) ?? {
            role,
            profileKey,
            passes: [],
          };
          membership.passes.push(`${pass + 1}:${index + 1}`);
          membershipByProfile.set(profileKey, membership);
        }
      });
    }
  });

  const labels = new Map();
  const membershipsByRole = new Map();
  for (const membership of membershipByProfile.values()) {
    const roleMemberships = membershipsByRole.get(membership.role) ?? [];
    roleMemberships.push(membership);
    membershipsByRole.set(membership.role, roleMemberships);
  }
  for (const [role, memberships] of membershipsByRole) {
    const groups = new Map();
    for (const membership of memberships) {
      const historyKey = membership.passes.join("|");
      const group = groups.get(historyKey) ?? [];
      group.push(membership.profileKey);
      groups.set(historyKey, group);
    }
    [...groups.values()]
      .map((profileKeys) => profileKeys.sort())
      .sort((left, right) => left.join(",").localeCompare(right.join(",")))
      .forEach((profileKeys, index) => {
      const type = { role, fitRole: `__global_second_order_${index + 1}` };
      for (const profileKey of profileKeys) labels.set(profileKey, type);
    });
  }
  return labels;
}

function refineFinalGlobalClusters(initialClusteringByRole, sourceLabels) {
  let clusteringByRole = initialClusteringByRole;
  let iterations = 0;
  let converged = false;
  let splitCount = 0;

  // 전역 고정점 이후에는 기존 군집끼리 다시 합치지 않습니다. 현재 역할군 하나씩만
  // 최종 라벨 문맥으로 재군집화해 72/60을 통과하지 못한 군을 단조롭게 세분합니다.
  // 분리로 문맥 라벨이 바뀌면 같은 검사를 반복하며, 군집 수는 줄지 않으므로 수렴합니다.
  for (let pass = 0; pass < FULL_TREND_GLOBAL_MAX_ITERATIONS; pass += 1) {
    const labels = iterativeGlobalLabels([clusteringByRole]);
    let innerConverged = true;
    const nextClusteringByRole = new Map();

    for (const [role, clustering] of clusteringByRole) {
      const refinedClusters = [];
      let validationIterations = 0;
      let roleConverged = true;
      for (const cluster of clustering.clusters) {
        const refinement = fullTrendClusters(cluster, labels, sourceLabels);
        refinedClusters.push(...refinement.clusters);
        validationIterations = Math.max(
          validationIterations,
          refinement.validationIterations
        );
        roleConverged &&= refinement.converged;
      }
      refinedClusters.sort(
        (left, right) =>
          right.reduce((sum, character) => sum + character.totalGames, 0) -
          left.reduce((sum, character) => sum + character.totalGames, 0)
      );
      nextClusteringByRole.set(role, {
        clusters: refinedClusters,
        validationIterations,
        converged: roleConverged,
      });
      innerConverged &&= roleConverged;
    }

    iterations = pass + 1;
    const currentSignature = globalClusteringSignature(clusteringByRole);
    const nextSignature = globalClusteringSignature(nextClusteringByRole);
    splitCount += [...nextClusteringByRole.entries()].reduce(
      (sum, [role, clustering]) =>
        sum +
        clustering.clusters.length -
        (clusteringByRole.get(role)?.clusters.length ?? 0),
      0
    );
    clusteringByRole = nextClusteringByRole;
    if (nextSignature === currentSignature) {
      converged = innerConverged;
      break;
    }
  }

  return { clusteringByRole, iterations, converged, splitCount };
}

function buildGlobalSecondOrderTypeIndex(characterContexts) {
  // 2차 역할군은 특정 외부 조합 구도에 종속되지 않습니다. 시즌 10+11의 모든
  // 조합 문맥을 캐릭터별로 합친 뒤, 같은 대분류의 모든 캐릭터를 전역 군집화합니다.
  // 새 군집 라벨로 동료 문맥을 다시 집계하는 과정을 수렴할 때까지 반복하고,
  // 최종 전역 라벨을 모든 외부 조합 분석에서 공통으로 사용합니다.
  const byRole = new Map();
  for (const character of characterContexts.values()) {
    const role = character.profile.role;
    const members = byRole.get(role) ?? [];
    members.push(character);
    byRole.set(role, members);
  }

  const sourceLabels = new Map(
    [...characterContexts.values()].map((character) => [
      secondOrderProfileKey(character.profile),
      secondOrderType(character.profile),
    ])
  );
  // 1차 내부 역할로 한 번만 군집화하지 않습니다. 새로 생성된 전역 역할군을 동료
  // 라벨로 다시 투입해 조합 경향을 재집계하고, 소속이 더 이상 바뀌지 않을 때까지
  // 모든 직업군을 동시에 반복합니다.
  let comparisonLabels = sourceLabels;
  let clusteringByRole = new Map();
  let previousSignature = null;
  let comparisonLabelSignature = globalLabelPartitionSignature(sourceLabels);
  const seenSignatures = new Set();
  const clusteringHistory = [];
  let iterations = 0;
  let converged = false;
  let cycleDetected = false;
  for (let pass = 0; pass < FULL_TREND_GLOBAL_MAX_ITERATIONS; pass += 1) {
    clusteringByRole = new Map(
      [...byRole.entries()].map(([role, members]) => [
        role,
        fullTrendClusters(members, comparisonLabels, sourceLabels),
      ])
    );
    iterations = pass + 1;
    const signature = globalClusteringSignature(clusteringByRole);
    clusteringHistory.push(clusteringByRole);
    const nextLabels = iterativeGlobalLabels(clusteringHistory);
    const nextLabelSignature = globalLabelPartitionSignature(nextLabels);
    const innerConverged = [...clusteringByRole.values()].every(
      (clustering) => clustering.converged
    );
    if (signature === previousSignature || nextLabelSignature === comparisonLabelSignature) {
      comparisonLabels = nextLabels;
      converged = innerConverged;
      break;
    }
    if (seenSignatures.has(signature)) {
      cycleDetected = true;
    }
    seenSignatures.add(signature);
    previousSignature = signature;
    comparisonLabels = nextLabels;
    comparisonLabelSignature = nextLabelSignature;
  }
  const fixedPointConverged = converged;
  const finalValidation = refineFinalGlobalClusters(clusteringByRole, sourceLabels);
  clusteringByRole = finalValidation.clusteringByRole;
  converged = fixedPointConverged && finalValidation.converged;
  const clustersByRole = new Map(
    [...clusteringByRole.entries()].map(([role, clustering]) => [role, clustering.clusters])
  );

  const labels = new Map();
  const clusterDescriptors = [];
  let splitBaseTypeCount = 0;
  for (const [role, clusters] of clustersByRole) {
    if (clusters.length > 1) splitBaseTypeCount += 1;
    const usedFitRoles = new Set();
    clusters.forEach((cluster) => {
      const profile = cluster[0].profile;
      const roleIsolation =
        cluster.length === 1
          ? FULL_TREND_ROLE_ISOLATIONS.get(secondOrderProfileKey(profile))
          : null;
      // 화면에 노출하는 이름은 임시 통계군 ID가 아니라 원래 전투 기능명으로 설명합니다.
      const bestContext = conditionalClusterContext(cluster, sourceLabels);
      const contextSuffix = conditionalContextSuffix(bestContext, cluster);
      const sourceFitRoles = [...new Set(cluster.map((entry) => entry.profile.fitRole))];
      const dominantFitRole = dominantConditionalFitRole(cluster) ?? profile.fitRole;
      let fitRole = roleIsolation?.fitRole ??
        (clusters.length === 1 ? dominantFitRole : `${dominantFitRole} · ${contextSuffix}`);
      if (usedFitRoles.has(fitRole)) {
        const memberNames = [...new Set(cluster.map((entry) => entry.profile.characterName))]
          .slice(0, 2)
          .join("·");
        fitRole = `${fitRole} · ${memberNames} 중심`;
      }
      usedFitRoles.add(fitRole);
      const type = { role, fitRole };
      for (const character of cluster) labels.set(secondOrderProfileKey(character.profile), type);
      clusterDescriptors.push({
        role,
        cluster,
        roleClusterCount: clusters.length,
        type,
        roleIsolation,
        sourceFitRoles,
        dominantFitRole,
      });
    });
  }

  // 수렴한 2차 역할군 라벨로 경향과 적합도를 마지막으로 다시 계산합니다.
  const assignmentEvidenceByRole = new Map(
    [...clustersByRole.entries()].map(([role, clusters]) => [
      role,
      fullTrendAssignmentEvidence(clusters, labels, sourceLabels),
    ])
  );
  const catalog = [];
  for (const descriptor of clusterDescriptors) {
      const {
        role,
        cluster,
        roleClusterCount,
        type,
        roleIsolation,
        sourceFitRoles,
        dominantFitRole,
      } = descriptor;
      const trendStats = clusterFullTrendStats(cluster, labels, sourceLabels);
      const trendContexts = conditionalClusterContexts(cluster, labels);
      const bestContext = conditionalClusterContext(cluster, labels);
      catalog.push({
        ...type,
        baseFitRole: dominantFitRole,
        sourceFitRoles,
        conditionalSplit: roleClusterCount > 1,
        regrouped: sourceFitRoles.length > 1,
        roleIsolated: roleIsolation != null,
        roleIsolationReason: roleIsolation?.reason,
        classificationBasis: "full-composition-trend-profile",
        trendCohesion:
          trendStats.cohesion == null ? null : round3(trendStats.cohesion),
        trendMinimum:
          trendStats.minimum == null ? null : round3(trendStats.minimum),
        trendSharedPairs: trendStats.sharedPairs,
        trendRefinedCohesion:
          trendStats.refinedCohesion == null
            ? null
            : round3(trendStats.refinedCohesion),
        trendRefinedMinimum:
          trendStats.refinedMinimum == null
            ? null
            : round3(trendStats.refinedMinimum),
        trendRefinedSharedPairs: trendStats.refinedSharedPairs,
        trendReferenceCohesion:
          trendStats.referenceCohesion == null
            ? null
            : round3(trendStats.referenceCohesion),
        trendReferenceMinimum:
          trendStats.referenceMinimum == null
            ? null
            : round3(trendStats.referenceMinimum),
        trendReferenceSharedPairs: trendStats.referenceSharedPairs,
        trendContextMinGames: CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
        trendContexts: trendContexts.map((context) => ({
          partnerTypes: context.types,
          games: context.games,
          rawResidual: round3(context.residual),
          adjustedResidual: round3(context.adjustedResidual),
          sampleScore: round3(context.adjustedResidual * Math.sqrt(context.games)),
          direction:
            context.residual > 0 ? "positive" : context.residual < 0 ? "negative" : "neutral",
        })),
        bestPartnerTypes: bestContext?.types ?? [],
        bestPartnerGames: bestContext?.games ?? 0,
        bestPartnerResidual: bestContext ? round3(bestContext.residual) : null,
        characters: cluster
          .map((character) => {
            const assignmentEvidence = assignmentEvidenceByRole
              .get(role)
              ?.get(secondOrderProfileKey(character.profile));
            const fitContext = bestContext
              ? aggregateConditionalContexts(character, labels).get(bestContext.key)
              : null;
            const fitGames = fitContext?.games ?? 0;
            const fitResidual = fitGames > 0 ? fitContext.weightedResidual / fitGames : null;
            const adjustedFit =
              fitResidual == null
                ? null
                : fitResidual * (fitGames / (fitGames + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
            const fitReliable = fitGames >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES;
            return {
              characterCode: character.profile.characterCode,
              characterName: character.profile.characterName,
              weapon: character.profile.weapon,
              weaponName: character.profile.weaponName,
              games: character.totalGames,
              fitGames,
              fitResidual: fitResidual == null ? null : round3(fitResidual),
              adjustedFit: adjustedFit == null ? null : round3(adjustedFit),
              fitReliable,
              trendOwnSimilarity:
                assignmentEvidence?.ownSimilarity == null
                  ? null
                  : round3(assignmentEvidence.ownSimilarity),
              trendOwnSharedPairs: assignmentEvidence?.ownSharedPairs ?? 0,
              trendAlternativeSimilarity:
                assignmentEvidence?.alternativeSimilarity == null
                  ? null
                  : round3(assignmentEvidence.alternativeSimilarity),
              trendAlternativeMinimum:
                assignmentEvidence?.alternativeMinimum == null
                  ? null
                  : round3(assignmentEvidence.alternativeMinimum),
              trendAlternativeSharedPairs:
                assignmentEvidence?.alternativeSharedPairs ?? 0,
              trendAssignmentMargin:
                assignmentEvidence?.assignmentMargin == null
                  ? null
                  : round3(assignmentEvidence.assignmentMargin),
              trendAmbiguous: assignmentEvidence?.ambiguous ?? false,
              trendRefinedOwnSimilarity:
                assignmentEvidence?.refinedOwnSimilarity == null
                  ? null
                  : round3(assignmentEvidence.refinedOwnSimilarity),
              trendRefinedOwnSharedPairs:
                assignmentEvidence?.refinedOwnSharedPairs ?? 0,
              trendRefinedAlternativeSimilarity:
                assignmentEvidence?.refinedAlternativeSimilarity == null
                  ? null
                  : round3(assignmentEvidence.refinedAlternativeSimilarity),
              trendRefinedAlternativeMinimum:
                assignmentEvidence?.refinedAlternativeMinimum == null
                  ? null
                  : round3(assignmentEvidence.refinedAlternativeMinimum),
              trendRefinedAlternativeSharedPairs:
                assignmentEvidence?.refinedAlternativeSharedPairs ?? 0,
              trendRefinedAssignmentMargin:
                assignmentEvidence?.refinedAssignmentMargin == null
                  ? null
                  : round3(assignmentEvidence.refinedAssignmentMargin),
              trendRefinedAmbiguous:
                assignmentEvidence?.refinedAmbiguous ?? false,
              trendRefinedAlternativeCharacters:
                assignmentEvidence?.refinedAlternativeCharacters ?? [],
              trendAlternativeCharacters:
                assignmentEvidence?.alternativeCharacters ?? [],
              recommendationScore:
                adjustedFit == null || !fitReliable ? null : adjustedFit * fitGames ** 0.25,
            };
          })
          .sort(
            (left, right) =>
              (right.recommendationScore ?? Number.NEGATIVE_INFINITY) -
                (left.recommendationScore ?? Number.NEGATIVE_INFINITY) || right.games - left.games
          )
          .map(({ recommendationScore: _, ...character }) => character),
      });
  }
  const relocationIterations = Math.max(
    0,
    ...[...clusteringByRole.values()].map((clustering) => clustering.validationIterations)
  );
  return {
    labels,
    catalog: catalog.sort(compareSecondOrderTypes),
    splitBaseTypeCount,
    iterations,
    converged,
    cycleDetected,
    relocationIterations,
    finalValidationIterations: finalValidation.iterations,
    finalValidationConverged: finalValidation.converged,
    finalValidationSplitCount: finalValidation.splitCount,
    roleValidation: [...clusteringByRole.entries()]
      .map(([role, clustering]) => ({
        role,
        types: clustering.clusters.length,
        iterations: clustering.validationIterations,
        converged: clustering.converged,
      }))
      .sort(
        (left, right) =>
          (ROLE_ORDER.get(left.role) ?? 99) - (ROLE_ORDER.get(right.role) ?? 99)
      ),
  };
}

function buildFirstOrderCompositionGroupIndex(characterContexts) {
  // 1차 전투 기능은 고정 축입니다. 같은 1차 유형 안에서만 캐릭터를 비교하고,
  // 동료 두 명의 1차 유형 조합별 상승·하락 방향이 비슷한 캐릭터를 조합 성향
  // 그룹으로 묶습니다. 생성된 그룹을 다시 입력 라벨로 사용하지 않습니다.
  const sourceLabels = new Map(
    [...characterContexts.values()].map((character) => [
      secondOrderProfileKey(character.profile),
      secondOrderType(character.profile),
    ])
  );
  const baseGroups = new Map();
  for (const character of characterContexts.values()) {
    const baseType = secondOrderType(character.profile);
    const baseKey = secondOrderTypeKey(baseType);
    const group = baseGroups.get(baseKey) ?? { baseType, members: [] };
    group.members.push(character);
    baseGroups.set(baseKey, group);
  }

  const clusteringByBaseType = new Map(
    [...baseGroups.entries()].map(([baseKey, group]) => [
      baseKey,
      {
        baseType: group.baseType,
        ...fullTrendClusters(group.members, sourceLabels, null, true),
      },
    ])
  );
  const labels = new Map();
  const descriptors = [];
  let splitBaseTypeCount = 0;

  for (const { baseType, clusters } of clusteringByBaseType.values()) {
    if (clusters.length > 1) splitBaseTypeCount += 1;
    const usedFitRoles = new Set();
    for (const cluster of clusters) {
      const profile = cluster[0].profile;
      const roleIsolation =
        cluster.length === 1
          ? FULL_TREND_ROLE_ISOLATIONS.get(secondOrderProfileKey(profile))
          : null;
      const bestContext = conditionalClusterContext(cluster, sourceLabels);
      const contextSuffix = conditionalContextSuffix(bestContext, cluster);
      let fitRole =
        roleIsolation?.fitRole ?? `${baseType.fitRole} · ${contextSuffix}`;
      if (usedFitRoles.has(fitRole)) {
        const memberNames = [...new Set(cluster.map((entry) => entry.profile.characterName))]
          .slice(0, 2)
          .join("·");
        fitRole = `${fitRole} · ${memberNames} 중심`;
      }
      usedFitRoles.add(fitRole);
      const type = { role: baseType.role, fitRole };
      for (const character of cluster) {
        labels.set(secondOrderProfileKey(character.profile), type);
      }
      descriptors.push({
        baseType,
        cluster,
        baseClusterCount: clusters.length,
        type,
        roleIsolation,
      });
    }
  }

  const assignmentEvidenceByBaseType = new Map(
    [...clusteringByBaseType.entries()].map(([baseKey, clustering]) => [
      baseKey,
      fullTrendAssignmentEvidence(clustering.clusters, sourceLabels),
    ])
  );
  const catalog = descriptors.map(
    ({ baseType, cluster, baseClusterCount, type, roleIsolation }) => {
      const baseKey = secondOrderTypeKey(baseType);
      const trendStats = clusterFullTrendStats(cluster, sourceLabels);
      const trendContexts = conditionalClusterContexts(cluster, sourceLabels);
      const bestContext = conditionalClusterContext(cluster, sourceLabels);
      return {
        ...type,
        baseFitRole: baseType.fitRole,
        sourceFitRoles: [baseType.fitRole],
        conditionalSplit: baseClusterCount > 1,
        regrouped: false,
        roleIsolated: roleIsolation != null,
        roleIsolationReason: roleIsolation?.reason,
        classificationBasis: "full-composition-trend-profile",
        trendCohesion:
          trendStats.refinedCohesion == null
            ? null
            : round3(trendStats.refinedCohesion),
        trendMinimum:
          trendStats.refinedMinimum == null
            ? null
            : round3(trendStats.refinedMinimum),
        trendSharedPairs: trendStats.refinedSharedPairs,
        trendRefinedCohesion:
          trendStats.refinedCohesion == null
            ? null
            : round3(trendStats.refinedCohesion),
        trendRefinedMinimum:
          trendStats.refinedMinimum == null
            ? null
            : round3(trendStats.refinedMinimum),
        trendRefinedSharedPairs: trendStats.refinedSharedPairs,
        trendReferenceCohesion: null,
        trendReferenceMinimum: null,
        trendReferenceSharedPairs: 0,
        trendContextMinGames: CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
        trendContexts: trendContexts.map((context) => ({
          partnerTypes: context.types,
          games: context.games,
          rawResidual: round3(context.residual),
          adjustedResidual: round3(context.adjustedResidual),
          sampleScore: round3(context.adjustedResidual * Math.sqrt(context.games)),
          direction:
            context.residual > 0
              ? "positive"
              : context.residual < 0
                ? "negative"
                : "neutral",
        })),
        bestPartnerTypes: bestContext?.types ?? [],
        bestPartnerGames: bestContext?.games ?? 0,
        bestPartnerResidual: bestContext ? round3(bestContext.residual) : null,
        characters: cluster
          .map((character) => {
            const evidence = assignmentEvidenceByBaseType
              .get(baseKey)
              ?.get(secondOrderProfileKey(character.profile));
            const fitContext = bestContext
              ? aggregateConditionalContexts(character, sourceLabels).get(bestContext.key)
              : null;
            const fitGames = fitContext?.games ?? 0;
            const fitResidual =
              fitGames > 0 ? fitContext.weightedResidual / fitGames : null;
            const adjustedFit =
              fitResidual == null
                ? null
                : fitResidual *
                  (fitGames / (fitGames + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
            const ownSimilarity = evidence?.refinedOwnSimilarity ?? null;
            const alternativeSimilarity =
              evidence?.refinedAlternativeSimilarity ?? null;
            const assignmentMargin = evidence?.refinedAssignmentMargin ?? null;
            return {
              characterCode: character.profile.characterCode,
              characterName: character.profile.characterName,
              weapon: character.profile.weapon,
              weaponName: character.profile.weaponName,
              games: character.totalGames,
              fitGames,
              fitResidual: fitResidual == null ? null : round3(fitResidual),
              adjustedFit: adjustedFit == null ? null : round3(adjustedFit),
              fitReliable: fitGames >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
              trendOwnSimilarity:
                ownSimilarity == null ? null : round3(ownSimilarity),
              trendOwnSharedPairs: evidence?.refinedOwnSharedPairs ?? 0,
              trendAlternativeSimilarity:
                alternativeSimilarity == null
                  ? null
                  : round3(alternativeSimilarity),
              trendAlternativeMinimum:
                evidence?.refinedAlternativeMinimum == null
                  ? null
                  : round3(evidence.refinedAlternativeMinimum),
              trendAlternativeSharedPairs:
                evidence?.refinedAlternativeSharedPairs ?? 0,
              trendAssignmentMargin:
                assignmentMargin == null ? null : round3(assignmentMargin),
              trendAmbiguous: evidence?.refinedAmbiguous ?? false,
              trendAlternativeCharacters:
                evidence?.refinedAlternativeCharacters ?? [],
              trendRefinedOwnSimilarity:
                ownSimilarity == null ? null : round3(ownSimilarity),
              trendRefinedOwnSharedPairs: evidence?.refinedOwnSharedPairs ?? 0,
              trendRefinedAlternativeSimilarity:
                alternativeSimilarity == null
                  ? null
                  : round3(alternativeSimilarity),
              trendRefinedAlternativeMinimum:
                evidence?.refinedAlternativeMinimum == null
                  ? null
                  : round3(evidence.refinedAlternativeMinimum),
              trendRefinedAlternativeSharedPairs:
                evidence?.refinedAlternativeSharedPairs ?? 0,
              trendRefinedAssignmentMargin:
                assignmentMargin == null ? null : round3(assignmentMargin),
              trendRefinedAmbiguous: evidence?.refinedAmbiguous ?? false,
              trendRefinedAlternativeCharacters:
                evidence?.refinedAlternativeCharacters ?? [],
              recommendationScore:
                adjustedFit == null || fitGames < CONDITIONAL_TYPE_MIN_CONTEXT_GAMES
                  ? null
                  : adjustedFit * fitGames ** 0.25,
            };
          })
          .sort(
            (left, right) =>
              (right.recommendationScore ?? Number.NEGATIVE_INFINITY) -
                (left.recommendationScore ?? Number.NEGATIVE_INFINITY) ||
              right.games - left.games
          )
          .map(({ recommendationScore: _, ...character }) => character),
      };
    }
  );

  const roleValidation = ROLES.map(({ role }) => {
    const roleClusterings = [...clusteringByBaseType.values()].filter(
      (clustering) => clustering.baseType.role === role
    );
    return {
      role,
      types: roleClusterings.reduce(
        (sum, clustering) => sum + clustering.clusters.length,
        0
      ),
      iterations: Math.max(
        0,
        ...roleClusterings.map((clustering) => clustering.validationIterations)
      ),
      converged: roleClusterings.every((clustering) => clustering.converged),
    };
  });

  return {
    labels,
    catalog: catalog.sort(compareSecondOrderTypes),
    splitBaseTypeCount,
    iterations: 1,
    converged: roleValidation.every((validation) => validation.converged),
    cycleDetected: false,
    relocationIterations: Math.max(
      0,
      ...roleValidation.map((validation) => validation.iterations)
    ),
    finalValidationIterations: 1,
    finalValidationConverged: true,
    finalValidationSplitCount: 0,
    roleValidation,
  };
}

function buildFirstOrderCompositionAffinityIndex(characterContexts) {
  const labels = new Map(
    [...characterContexts.values()].map((character) => [
      secondOrderProfileKey(character.profile),
      secondOrderType(character.profile),
    ])
  );
  const baseGroups = new Map();
  for (const character of characterContexts.values()) {
    const type = secondOrderType(character.profile);
    const key = secondOrderTypeKey(type);
    const group = baseGroups.get(key) ?? { type, members: [] };
    group.members.push(character);
    baseGroups.set(key, group);
  }

  function seasonSignalsFromStats(seasonStats) {
    return SEASONS.map((season) => {
      const stat = seasonStats?.get(String(season));
      const games = stat?.games ?? 0;
      const rawResidual = games > 0 ? stat.weightedResidual / games : null;
      const adjustedResidual =
        rawResidual == null
          ? null
          : rawResidual *
            (games / (games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
      return {
        season: Number(season),
        games,
        rawResidual: rawResidual == null ? null : round3(rawResidual),
        adjustedResidual:
          adjustedResidual == null ? null : round3(adjustedResidual),
        direction:
          rawResidual == null
            ? "unobserved"
            : rawResidual > 0
              ? "positive"
              : rawResidual < 0
                ? "negative"
                : "neutral",
        reliable: games >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
      };
    });
  }

  function seasonConsistencyForSignals(signals) {
    const reliable = signals.filter((signal) => signal.reliable);
    if (reliable.length < SEASONS.length) return "insufficient";
    if (reliable.every((signal) => signal.direction === "positive")) {
      return "both-positive";
    }
    if (reliable.every((signal) => signal.direction === "negative")) {
      return "both-negative";
    }
    return "mixed";
  }

  function buildPartnerAffinityGroups(contexts) {
    const affinityBuckets = new Map();
    for (const context of contexts) {
      const partnerRoles = context.partnerTypes
        .map((partnerType) => partnerType.role)
        .sort(
          (left, right) =>
            (ROLE_ORDER.get(left) ?? 99) - (ROLE_ORDER.get(right) ?? 99)
        );
      const uniqueAnchors = new Map(
        context.partnerTypes.map((partnerType) => [
          secondOrderTypeKey(partnerType),
          partnerType,
        ])
      );
      for (const [anchorKey, anchorType] of uniqueAnchors) {
        const companionTypes = [...context.partnerTypes];
        const anchorIndex = companionTypes.findIndex(
          (partnerType) => secondOrderTypeKey(partnerType) === anchorKey
        );
        companionTypes.splice(anchorIndex, 1);
        const affinityKey = `${partnerRoles.join(" + ")}::${anchorKey}`;
        const affinity = affinityBuckets.get(affinityKey) ?? {
          partnerRoles,
          anchorType,
          games: 0,
          weightedResidual: 0,
          characters: new Map(),
          secondaryContexts: new Map(),
        };
        affinity.games += context.games;
        affinity.weightedResidual += context.rawResidual * context.games;

        for (const character of context.characters ?? []) {
          const characterKey = `${character.characterCode}_${character.weapon}`;
          const characterBucket = affinity.characters.get(characterKey) ?? {
            characterCode: character.characterCode,
            characterName: character.characterName,
            weapon: character.weapon,
            weaponName: character.weaponName,
            games: 0,
            weightedResidual: 0,
            seasonStats: new Map(),
          };
          characterBucket.games += character.games;
          characterBucket.weightedResidual +=
            character.rawResidual * character.games;
          for (const seasonSignal of character.seasonSignals ?? []) {
            if (seasonSignal.games <= 0 || seasonSignal.rawResidual == null) {
              continue;
            }
            const seasonKey = String(seasonSignal.season);
            const seasonBucket = characterBucket.seasonStats.get(seasonKey) ?? {
              games: 0,
              weightedResidual: 0,
            };
            seasonBucket.games += seasonSignal.games;
            seasonBucket.weightedResidual +=
              seasonSignal.rawResidual * seasonSignal.games;
            characterBucket.seasonStats.set(seasonKey, seasonBucket);
          }
          affinity.characters.set(characterKey, characterBucket);
        }

        const secondaryKey = secondOrderCompositionKey(companionTypes);
        const secondary = affinity.secondaryContexts.get(secondaryKey) ?? {
          partnerTypes: companionTypes,
          games: 0,
          weightedResidual: 0,
        };
        secondary.games += context.games;
        secondary.weightedResidual += context.rawResidual * context.games;
        affinity.secondaryContexts.set(secondaryKey, secondary);
        affinityBuckets.set(affinityKey, affinity);
      }
    }

    return [...affinityBuckets.values()]
      .filter((affinity) => affinity.games >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES)
      .map((affinity) => {
        const characters = [...affinity.characters.values()]
          .filter(
            (character) =>
              character.games >= CONDITIONAL_TYPE_MIN_CONTEXT_GAMES
          )
          .map((character) => {
            const rawResidual =
              character.weightedResidual / character.games;
            const adjustedResidual =
              rawResidual *
              (character.games /
                (character.games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
            const seasonSignals = seasonSignalsFromStats(character.seasonStats);
            return {
              characterCode: character.characterCode,
              characterName: character.characterName,
              weapon: character.weapon,
              weaponName: character.weaponName,
              games: character.games,
              rawResidual: round3(rawResidual),
              adjustedResidual: round3(adjustedResidual),
              sampleScore: round3(adjustedResidual * Math.sqrt(character.games)),
              direction:
                rawResidual > 0
                  ? "positive"
                  : rawResidual < 0
                    ? "negative"
                    : "neutral",
              seasonSignals,
              seasonConsistency: seasonConsistencyForSignals(seasonSignals),
            };
          })
          .sort(
            (left, right) =>
              right.sampleScore - left.sampleScore || right.games - left.games
          );
        const positiveCharacters = characters.filter(
          (character) => character.direction === "positive"
        );
        const groupGames = positiveCharacters.reduce(
          (sum, character) => sum + character.games,
          0
        );
        const groupWeightedResidual = positiveCharacters.reduce(
          (sum, character) => sum + character.rawResidual * character.games,
          0
        );
        const groupRawResidual =
          groupGames > 0 ? groupWeightedResidual / groupGames : null;
        const groupAdjustedResidual =
          groupRawResidual == null
            ? null
            : groupRawResidual *
              (groupGames /
                (groupGames + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
        const rawResidual = affinity.weightedResidual / affinity.games;
        return {
          partnerRoles: affinity.partnerRoles,
          anchorType: affinity.anchorType,
          games: affinity.games,
          rawResidual: round3(rawResidual),
          adjustedResidual: round3(
            rawResidual *
              (affinity.games /
                (affinity.games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES))
          ),
          groupGames,
          groupRawResidual:
            groupRawResidual == null ? null : round3(groupRawResidual),
          groupAdjustedResidual:
            groupAdjustedResidual == null
              ? null
              : round3(groupAdjustedResidual),
          positiveCharacterCount: positiveCharacters.length,
          negativeCharacterCount: characters.filter(
            (character) => character.direction === "negative"
          ).length,
          tendencyAgreement:
            characters.length > 0
              ? round3(positiveCharacters.length / characters.length)
              : null,
          characters,
          secondaryContexts: [...affinity.secondaryContexts.values()]
            .map((secondary) => {
              const secondaryRawResidual =
                secondary.weightedResidual / secondary.games;
              const secondaryAdjustedResidual =
                secondaryRawResidual *
                (secondary.games /
                  (secondary.games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
              return {
                partnerTypes: secondary.partnerTypes,
                games: secondary.games,
                rawResidual: round3(secondaryRawResidual),
                adjustedResidual: round3(secondaryAdjustedResidual),
                sampleScore: round3(
                  secondaryAdjustedResidual * Math.sqrt(secondary.games)
                ),
                direction:
                  secondaryRawResidual > 0
                    ? "positive"
                    : secondaryRawResidual < 0
                      ? "negative"
                      : "neutral",
              };
            })
            .sort(
              (left, right) =>
                right.sampleScore - left.sampleScore || right.games - left.games
            )
            .filter((secondary) => secondary.direction === "positive")
            .slice(0, 8),
        };
      })
      .filter(
        (affinity) =>
          affinity.positiveCharacterCount > 0 &&
          (affinity.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) >=
            COMPOSITION_AFFINITY_MIN_LIFT
      )
      .sort(
        (left, right) =>
          (right.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
            Math.sqrt(Math.max(right.groupGames, 1)) -
            (left.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
              Math.sqrt(Math.max(left.groupGames, 1)) ||
          right.groupGames - left.groupGames
      );
  }

  const catalog = [...baseGroups.values()].map(({ type, members }) => {
    const contexts = conditionalClusterContexts(members, labels).map((context) => {
      const characters = members
        .map((character) => {
          const characterContext = aggregateConditionalContexts(character, labels).get(
            context.key
          );
          const games = characterContext?.games ?? 0;
          if (games < CONDITIONAL_TYPE_MIN_CONTEXT_GAMES) return null;
          const residual = characterContext.weightedResidual / games;
          const adjustedResidual =
            residual *
            (games / (games + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
          const seasonSignals = seasonSignalsFromStats(
            characterContext.seasonStats
          );
          return {
            characterCode: character.profile.characterCode,
            characterName: character.profile.characterName,
            weapon: character.profile.weapon,
            weaponName: character.profile.weaponName,
            games,
            rawResidual: round3(residual),
            adjustedResidual: round3(adjustedResidual),
            sampleScore: round3(adjustedResidual * Math.sqrt(games)),
            direction:
              residual > 0 ? "positive" : residual < 0 ? "negative" : "neutral",
            seasonSignals,
            seasonConsistency: seasonConsistencyForSignals(seasonSignals),
          };
        })
        .filter((character) => character != null)
        .sort(
          (left, right) =>
            right.sampleScore - left.sampleScore || right.games - left.games
        );
      const positiveCharacters = characters.filter(
        (character) => character.direction === "positive"
      );
      const positiveGames = positiveCharacters.reduce(
        (sum, character) => sum + character.games,
        0
      );
      const positiveWeightedResidual = positiveCharacters.reduce(
        (sum, character) => sum + character.rawResidual * character.games,
        0
      );
      const positiveRawResidual =
        positiveGames > 0 ? positiveWeightedResidual / positiveGames : null;
      const positiveAdjustedResidual =
        positiveRawResidual == null
          ? null
          : positiveRawResidual *
            (positiveGames /
              (positiveGames + CONDITIONAL_TYPE_MIN_CONTEXT_GAMES));
      return {
        partnerTypes: context.types,
        games: context.games,
        rawResidual: round3(context.residual),
        adjustedResidual: round3(context.adjustedResidual),
        sampleScore: round3(context.adjustedResidual * Math.sqrt(context.games)),
        direction:
          context.residual > 0
            ? "positive"
            : context.residual < 0
              ? "negative"
              : "neutral",
        groupGames: positiveGames,
        groupRawResidual:
          positiveRawResidual == null ? null : round3(positiveRawResidual),
        groupAdjustedResidual:
          positiveAdjustedResidual == null
            ? null
            : round3(positiveAdjustedResidual),
        positiveCharacterCount: positiveCharacters.length,
        negativeCharacterCount: characters.filter(
          (character) => character.direction === "negative"
        ).length,
        tendencyAgreement:
          characters.length > 0
            ? round3(positiveCharacters.length / characters.length)
            : null,
        characters,
      };
    }).sort(
      (left, right) =>
        (right.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
          Math.sqrt(Math.max(right.groupGames, 1)) -
          (left.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
            Math.sqrt(Math.max(left.groupGames, 1)) ||
        right.groupGames - left.groupGames
    );
    const affinityGroups = buildPartnerAffinityGroups(contexts);
    const bestContext = contexts
      .filter((context) => context.positiveCharacterCount > 0)
      .sort(
        (left, right) =>
          (right.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
            Math.sqrt(Math.max(right.groupGames, 1)) -
            (left.groupAdjustedResidual ?? Number.NEGATIVE_INFINITY) *
              Math.sqrt(Math.max(left.groupGames, 1)) ||
          right.groupGames - left.groupGames
      )[0];

    return {
      ...type,
      baseFitRole: type.fitRole,
      sourceFitRoles: [type.fitRole],
      conditionalSplit: false,
      regrouped: false,
      roleIsolated: false,
      classificationBasis: "first-order-composition-affinity-profile",
      trendCohesion: null,
      trendMinimum: null,
      trendSharedPairs: affinityGroups.filter(
        (group) => group.positiveCharacterCount > 0
      ).length,
      trendRefinedCohesion: null,
      trendRefinedMinimum: null,
      trendRefinedSharedPairs: 0,
      trendReferenceCohesion: null,
      trendReferenceMinimum: null,
      trendReferenceSharedPairs: 0,
      trendContextMinGames: CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
      // 화면은 핵심 동료 유형 단위의 affinityGroups를 사용합니다. 정확한 동료
      // 유형 쌍은 2차 조합 성향군 재분류에서 두 동료를 함께 검증할 때 사용합니다.
      trendContexts: [],
      exactPartnerContexts: contexts,
      affinityGroups,
      bestPartnerTypes: bestContext?.partnerTypes ?? [],
      bestPartnerGames: bestContext?.groupGames ?? 0,
      bestPartnerResidual: bestContext?.groupRawResidual ?? null,
      characters: members
        .map((character) => {
          const bestCharacterContext = contexts
            .flatMap((context) =>
              context.characters
                .filter(
                  (entry) =>
                    entry.characterCode === character.profile.characterCode &&
                    entry.weapon === character.profile.weapon &&
                    entry.direction === "positive"
                )
                .map((entry) => ({ context, entry }))
            )
            .sort(
              (left, right) =>
                right.entry.sampleScore - left.entry.sampleScore ||
                right.entry.games - left.entry.games
            )[0];
          return {
            characterCode: character.profile.characterCode,
            characterName: character.profile.characterName,
            weapon: character.profile.weapon,
            weaponName: character.profile.weaponName,
            games: character.totalGames,
            fitGames: bestCharacterContext?.entry.games ?? 0,
            fitResidual: bestCharacterContext?.entry.rawResidual ?? null,
            adjustedFit:
              bestCharacterContext?.entry.adjustedResidual ?? null,
            fitReliable:
              (bestCharacterContext?.entry.games ?? 0) >=
              CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
            bestPartnerTypes:
              bestCharacterContext?.context.partnerTypes ?? [],
            trendOwnSimilarity: null,
            trendOwnSharedPairs: 0,
            trendAlternativeSimilarity: null,
            trendAlternativeMinimum: null,
            trendAlternativeSharedPairs: 0,
            trendAssignmentMargin: null,
            trendAmbiguous: false,
            trendAlternativeCharacters: [],
          };
        })
        .sort(
          (left, right) =>
            (right.adjustedFit ?? Number.NEGATIVE_INFINITY) *
              Math.sqrt(Math.max(right.fitGames, 1)) -
              (left.adjustedFit ?? Number.NEGATIVE_INFINITY) *
                Math.sqrt(Math.max(left.fitGames, 1)) ||
            right.games - left.games
        ),
    };
  });

  const roleValidation = ROLES.map(({ role }) => ({
    role,
    types: catalog.filter((type) => type.role === role).length,
    iterations: 1,
    converged: true,
  }));
  return {
    labels,
    catalog: catalog.sort(compareSecondOrderTypes),
    splitBaseTypeCount: catalog.filter(
      (type) =>
        type.affinityGroups.filter(
          (group) => group.positiveCharacterCount > 0
        ).length > 1
    ).length,
    iterations: 1,
    converged: true,
    cycleDetected: false,
    relocationIterations: 0,
    finalValidationIterations: 0,
    finalValidationConverged: true,
    finalValidationSplitCount: 0,
    roleValidation,
  };
}

function buildSecondOrderCompositionData(rows, roleDatas) {
  const profileIndex = secondOrderProfileIndex(roleDatas);
  const outerBuckets = new Map();
  const globalCharacterContexts = new Map();
  let skippedRows = 0;
  let skippedGames = 0;

  const seasonProfileBuckets = new Map();
  for (const row of rows) {
    const games = Number(row.total_games ?? 0);
    if (games <= 0) continue;
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    const profiles = members.map((member) => resolveSecondOrderProfile(profileIndex, member));
    if (profiles.some((profile) => profile == null)) continue;
    const season = String(row.season ?? "");
    const avgRp = averageRpForRow(row);
    const seasonBuckets = seasonProfileBuckets.get(season) ?? new Map();
    for (const profile of profiles) {
      const profileKey = secondOrderProfileKey(profile);
      const bucket = seasonBuckets.get(profileKey) ?? { games: 0, weightedRp: 0 };
      bucket.games += games;
      bucket.weightedRp += avgRp * games;
      seasonBuckets.set(profileKey, bucket);
    }
    seasonProfileBuckets.set(season, seasonBuckets);
  }

  function expectedRpForRow(row, profiles) {
    const seasonBuckets = seasonProfileBuckets.get(String(row.season ?? ""));
    return average(
      profiles.map((profile) => {
        const bucket = seasonBuckets?.get(secondOrderProfileKey(profile));
        return bucket?.games > 0 ? bucket.weightedRp / bucket.games : profile.ownMeanRP;
      })
    );
  }

  function addCharacterContext(
    characterContexts,
    profile,
    partnerProfiles,
    games,
    residual,
    season
  ) {
    const profileKey = secondOrderProfileKey(profile);
    const character = characterContexts.get(profileKey) ?? {
      profile,
      totalGames: 0,
      contexts: new Map(),
    };
    const contextKey = partnerProfiles
      .map(secondOrderProfileKey)
      .join(" + ");
    const context = character.contexts.get(contextKey) ?? {
      types: partnerProfiles.map(secondOrderType).sort(compareSecondOrderTypes),
      partnerProfiles,
      games: 0,
      weightedResidual: 0,
      seasonStats: new Map(),
    };
    character.totalGames += games;
    context.games += games;
    context.weightedResidual += residual * games;
    const seasonBucket = context.seasonStats.get(season) ?? {
      games: 0,
      weightedResidual: 0,
    };
    seasonBucket.games += games;
    seasonBucket.weightedResidual += residual * games;
    context.seasonStats.set(season, seasonBucket);
    character.contexts.set(contextKey, context);
    characterContexts.set(profileKey, character);
  }

  for (const row of rows) {
    const games = Number(row.total_games ?? 0);
    if (games <= 0) continue;
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    const profiles = members.map((member) => resolveSecondOrderProfile(profileIndex, member));
    if (profiles.some((profile) => profile == null)) {
      skippedRows += 1;
      skippedGames += games;
      continue;
    }

    const avgRp = averageRpForRow(row);
    const expectedRp = expectedRpForRow(row, profiles);
    const residual = avgRp - expectedRp;
    const outerKey = secondOrderOuterRoleKey(profiles);
    const outer = outerBuckets.get(outerKey) ?? {
      roleComposition: outerKey,
      totalGames: 0,
      weightedRp: 0,
      weightedResidual: 0,
      characterContexts: new Map(),
      typeCompositions: new Map(),
    };
    outer.totalGames += games;
    outer.weightedRp += avgRp * games;
    outer.weightedResidual += residual * games;
    profiles.forEach((profile, focalIndex) => {
      // 기존 역할군 이름으로 먼저 합치지 않고 실제 동료 프로필 쌍을 보존합니다.
      // 외부 조합별 집계와 전역 집계에 같은 실제 동료 문맥을 각각 누적합니다.
      const partnerProfiles = conditionalPartnerProfiles(profiles, focalIndex);
      const season = String(row.season ?? "");
      addCharacterContext(
        outer.characterContexts,
        profile,
        partnerProfiles,
        games,
        residual,
        season
      );
      addCharacterContext(
        globalCharacterContexts,
        profile,
        partnerProfiles,
        games,
        residual,
        season
      );
    });
    outerBuckets.set(outerKey, outer);
  }

  const globalSecondOrderTypes =
    COMBINATION_GROUPING_BASIS === "fixed-first-order-composition-contexts"
      ? buildFirstOrderCompositionAffinityIndex(globalCharacterContexts)
      : COMBINATION_GROUPING_BASIS === "fixed-first-order-partner-types"
        ? buildFirstOrderCompositionGroupIndex(globalCharacterContexts)
        : buildGlobalSecondOrderTypeIndex(globalCharacterContexts);

  for (const row of rows) {
    const games = Number(row.total_games ?? 0);
    if (games <= 0) continue;
    const members = [
      { characterCode: Number(row.ally1_char), weapon: Number(row.ally1_weapon) },
      { characterCode: Number(row.ally2_char), weapon: Number(row.ally2_weapon) },
      { characterCode: Number(row.third_char), weapon: Number(row.third_weapon) },
    ];
    const profiles = members.map((member) => resolveSecondOrderProfile(profileIndex, member));
    if (profiles.some((profile) => profile == null)) continue;

    const avgRp = averageRpForRow(row);
    const expectedRp = expectedRpForRow(row, profiles);
    const residual = avgRp - expectedRp;
    const outerKey = secondOrderOuterRoleKey(profiles);
    const outer = outerBuckets.get(outerKey);
    const conditionalProfiles = profiles.map((profile) => ({
      ...profile,
      baseFitRole: profile.fitRole,
      fitRole:
        globalSecondOrderTypes.labels.get(secondOrderProfileKey(profile))?.fitRole ??
        profile.fitRole,
    }));
    const types = secondOrderTypeMultiset(conditionalProfiles);
    const typeKey = secondOrderCompositionKey(types);
    const typeBucket = outer.typeCompositions.get(typeKey) ?? {
      types,
      games: 0,
      weightedRp: 0,
      weightedResidual: 0,
      seasonStats: new Map(),
      characterCompositions: new Map(),
    };
    typeBucket.games += games;
    typeBucket.weightedRp += avgRp * games;
    typeBucket.weightedResidual += residual * games;
    const season = String(row.season ?? "");
    const seasonStat = typeBucket.seasonStats.get(season) ?? {
      games: 0,
      weightedResidual: 0,
    };
    seasonStat.games += games;
    seasonStat.weightedResidual += residual * games;
    typeBucket.seasonStats.set(season, seasonStat);
    const characterMembers = secondOrderCharacterMultiset(conditionalProfiles);
    const characterKey = secondOrderCharacterCompositionKey(characterMembers);
    const characterBucket = typeBucket.characterCompositions.get(characterKey) ?? {
      members: characterMembers,
      games: 0,
      weightedRp: 0,
      weightedResidual: 0,
    };
    characterBucket.games += games;
    characterBucket.weightedRp += avgRp * games;
    characterBucket.weightedResidual += residual * games;
    typeBucket.characterCompositions.set(characterKey, characterBucket);
    outer.typeCompositions.set(typeKey, typeBucket);
  }

  const roleCompositions = [...outerBuckets.values()]
    .map((outer) => {
      const minGames = Math.max(
        SECOND_ORDER_MIN_GAMES,
        Math.ceil(outer.totalGames * SECOND_ORDER_MIN_OUTER_SHARE)
      );
      const priorGames = Math.max(500, minGames);
      const outerRoles = new Set(outer.roleComposition.split(" + "));
      // 카탈로그의 역할군 정의는 전역으로 동일하고, 화면에는 현재 외부 조합에
      // 등장하는 대분류만 노출합니다.
      const conditionalCatalog = globalSecondOrderTypes.catalog.filter((type) =>
        outerRoles.has(type.role)
      );
      const combinations = [...outer.typeCompositions.values()]
        .filter((entry) => entry.games >= minGames)
        .map((entry) => {
          const rawLift = entry.weightedResidual / entry.games;
          const adjustedLift = rawLift * (entry.games / (entry.games + priorGames));
          const seasonSignals = SEASONS.map((season) => {
            const stat = entry.seasonStats.get(season);
            return {
              season: Number(season),
              games: stat?.games ?? 0,
              rawLift: stat?.games > 0 ? round3(stat.weightedResidual / stat.games) : null,
            };
          });
          const reliableSeasonSignals = seasonSignals.filter((signal) => signal.games >= 100);
          const seasonConsistency =
            reliableSeasonSignals.length < SEASONS.length
              ? "insufficient"
              : reliableSeasonSignals.every((signal) => signal.rawLift > 0)
                ? "both-positive"
                : reliableSeasonSignals.every((signal) => signal.rawLift < 0)
                  ? "both-negative"
                  : "mixed";
          const characterMinGames = Math.max(
            SECOND_ORDER_CHARACTER_MIN_GAMES,
            Math.ceil(entry.games * SECOND_ORDER_CHARACTER_MIN_TYPE_SHARE)
          );
          const characterPriorGames = Math.max(100, characterMinGames);
          const characterCombinations = [...entry.characterCompositions.values()]
            .filter((characterEntry) => characterEntry.games >= characterMinGames)
            .map((characterEntry) => {
              const characterRawLift = characterEntry.weightedResidual / characterEntry.games;
              const characterAdjustedLift =
                characterRawLift *
                (characterEntry.games / (characterEntry.games + characterPriorGames));
              return {
                members: characterEntry.members,
                games: characterEntry.games,
                avgRp: round3(characterEntry.weightedRp / characterEntry.games),
                rawLift: round3(characterRawLift),
                adjustedLift: round3(characterAdjustedLift),
                rankScore: characterAdjustedLift * characterEntry.games ** 0.25,
                confidence: secondOrderTrend(characterEntry.games),
              };
            })
            .filter((characterEntry) => characterEntry.adjustedLift > 0)
            .sort((a, b) => b.rankScore - a.rankScore || b.games - a.games)
            .slice(0, SECOND_ORDER_TOP_CHARACTER_COMBINATIONS)
            .map(({ rankScore: _, ...characterEntry }) => characterEntry);
          const combinationKey = secondOrderCompositionKey(entry.types);
          const validation = buildSecondOrderCombinationValidation(
            entry,
            conditionalCatalog,
            rawLift
          );
          return {
            combinationKey,
            types: entry.types,
            games: entry.games,
            share: entry.games / outer.totalGames,
            avgRp: round3(entry.weightedRp / entry.games),
            rawLift: round3(rawLift),
            adjustedLift: round3(adjustedLift),
            sampleScore: round3(rawLift * Math.sqrt(entry.games)),
            seasonSignals,
            seasonConsistency,
            rankScore: adjustedLift * entry.games ** 0.25,
            confidence: secondOrderTrend(entry.games),
            characterMinGames,
            characterCombinations,
            validation,
          };
        })
        .sort((a, b) => b.rankScore - a.rankScore || b.games - a.games);

      const focalKeys = new Set(
        combinations.flatMap((combination) => combination.types.map(secondOrderTypeKey))
      );
      const recommendations = [...focalKeys]
        .map((focalKey) => {
          const candidates = combinations.filter((combination) =>
            combination.types.some((type) => secondOrderTypeKey(type) === focalKey)
          );
          const focalGames = candidates.reduce((sum, candidate) => sum + candidate.games, 0);
          const [focalRole, ...fitRoleParts] = focalKey.split(":");
          return {
            focal: { role: focalRole, fitRole: fitRoleParts.join(":") },
            totalGames: focalGames,
            options: candidates
              .filter((candidate) => candidate.adjustedLift > 0)
              .slice(0, SECOND_ORDER_TOP_RECOMMENDATIONS)
              .map((candidate) => ({
                partners: removeOneFocalType(candidate.types, focalKey),
                games: candidate.games,
                conditionalShare: focalGames > 0 ? candidate.games / focalGames : 0,
                rawLift: candidate.rawLift,
                adjustedLift: candidate.adjustedLift,
                confidence: candidate.confidence,
                combinationKey: candidate.combinationKey,
                characterMinGames: candidate.characterMinGames,
                characterCombinations: candidate.characterCombinations,
              })),
          };
        })
        .sort(
          (a, b) =>
            (ROLE_ORDER.get(a.focal.role) ?? 99) - (ROLE_ORDER.get(b.focal.role) ?? 99) ||
            a.focal.fitRole.localeCompare(b.focal.fitRole, "ko")
        );
      const validationKeys = new Set([
        ...combinations
          .slice(0, SECOND_ORDER_TOP_COMBINATIONS)
          .map((combination) => combination.combinationKey),
        ...combinations
          .toSorted(
            (left, right) => right.sampleScore - left.sampleScore || right.games - left.games
          )
          .slice(0, SECOND_ORDER_TOP_COMBINATIONS)
          .map((combination) => combination.combinationKey),
        ...recommendations.flatMap((recommendation) =>
          recommendation.options.map((option) => option.combinationKey)
        ),
      ]);

      return {
        roleComposition: outer.roleComposition,
        totalGames: outer.totalGames,
        avgRp: round3(outer.weightedRp / outer.totalGames),
        avgResidual: round3(outer.weightedResidual / outer.totalGames),
        minGames,
        observedTypeCombinations: outer.typeCompositions.size,
        reliableTypeCombinations: combinations.length,
        validations: combinations
          .filter((combination) => validationKeys.has(combination.combinationKey))
          .map((combination) => ({
            combinationKey: combination.combinationKey,
            ...combination.validation,
          })),
        topCombinations: combinations
          .slice(0, SECOND_ORDER_TOP_COMBINATIONS)
          .map(({ rankScore: _, validation: __, ...combination }) => combination),
        sampleRankedCombinations: combinations
          .toSorted(
            (left, right) => right.sampleScore - left.sampleScore || right.games - left.games
          )
          .slice(0, SECOND_ORDER_TOP_COMBINATIONS)
          .map(({ rankScore: _, validation: __, ...combination }) => combination),
        recommendations,
        conditionalSplitBaseTypes: [...outerRoles].filter(
          (role) => conditionalCatalog.filter((type) => type.role === role).length > 1
        ).length,
        conditionalIterations: globalSecondOrderTypes.iterations,
        conditionalConverged: globalSecondOrderTypes.converged,
        conditionalCycleDetected: globalSecondOrderTypes.cycleDetected,
        // 모든 경향 원본은 최상위 globalSecondOrderTypeCatalog에 한 번만 저장합니다.
        // 외부 조합마다 같은 수천 개 문맥을 복제하지 않고, 조합 검증에 필요한 정보만 둡니다.
        typeCatalog: conditionalCatalog.map(
          ({
            trendContexts: _,
            affinityGroups: __,
            trendContextMinGames: ___,
            ...type
          }) => type
        ),
      };
    })
    // 희귀 역할 조합도 목록에서 제거하지 않고 '판수 충족 내부 조합 없음'으로 남긴다.
    // 그래야 모든 외부 역할 조합을 같은 검증 범위에서 추적할 수 있다.
    .sort((a, b) => b.totalGames - a.totalGames);

  return {
    generatedFrom: TABLE,
    seasons: SEASONS.map(Number),
    generatedAt: new Date().toISOString().slice(0, 10),
    scoreMode: scoreMode(),
    entryCosts: ENTRY_ADJUSTED ? ENTRY_COST_BY_TIER : undefined,
    method:
      "fixed-first-order-composition-context-groups+multi-membership-character-tendencies+100-game-partner-type-contexts+verified-character-triples+member-baseline-residual-v12" +
      classificationModeSuffix(),
    secondOrderScope: "global",
    combinationGroupingBasis: COMBINATION_GROUPING_BASIS,
    globalSecondOrderIterations: globalSecondOrderTypes.iterations,
    globalSecondOrderRelocationIterations: globalSecondOrderTypes.relocationIterations,
    globalSecondOrderConverged: globalSecondOrderTypes.converged,
    globalSecondOrderCycleDetected: globalSecondOrderTypes.cycleDetected,
    globalSecondOrderFinalValidationIterations:
      globalSecondOrderTypes.finalValidationIterations,
    globalSecondOrderFinalValidationConverged:
      globalSecondOrderTypes.finalValidationConverged,
    globalSecondOrderFinalValidationSplitCount:
      globalSecondOrderTypes.finalValidationSplitCount,
    globalSecondOrderMergeAverage: FULL_TREND_MERGE_AVERAGE,
    globalSecondOrderMergeMinimum: FULL_TREND_MERGE_MINIMUM,
    globalSecondOrderRefinedContextWeight: FULL_TREND_REFINED_CONTEXT_WEIGHT,
    displayedSimilarityMode: "fixed-first-order-context-lift",
    displayedSimilarityMinGames: CONDITIONAL_TYPE_MIN_CONTEXT_GAMES,
    compositionAffinityMinLift: COMPOSITION_AFFINITY_MIN_LIFT,
    globalSecondOrderAmbiguousAverage: FULL_TREND_AMBIGUOUS_AVERAGE,
    globalSecondOrderAmbiguousMargin: FULL_TREND_AMBIGUOUS_MARGIN,
    globalSecondOrderRoleValidation: globalSecondOrderTypes.roleValidation,
    globalSecondOrderTypeCatalog: globalSecondOrderTypes.catalog,
    minGamesFloor: SECOND_ORDER_MIN_GAMES,
    minOuterShare: SECOND_ORDER_MIN_OUTER_SHARE,
    characterMinGamesFloor: SECOND_ORDER_CHARACTER_MIN_GAMES,
    characterMinTypeShare: SECOND_ORDER_CHARACTER_MIN_TYPE_SHARE,
    validationReferenceGames: SECOND_ORDER_VALIDATION_REFERENCE_GAMES,
    validationCheckGames: SECOND_ORDER_VALIDATION_CHECK_GAMES,
    validationStrongGames: SECOND_ORDER_VALIDATION_STRONG_GAMES,
    sourceRows: rows.length,
    skippedRows,
    skippedGames,
    roleCompositionCount: roleCompositions.length,
    reliableTypeCombinationCount: roleCompositions.reduce(
      (sum, composition) => sum + composition.reliableTypeCombinations,
      0
    ),
    roleCompositions,
  };
}

function writeExactTwoPartnerContexts(catalog) {
  const profiles = new Map();
  for (const type of catalog) {
    for (const character of type.characters) {
      const key = `${character.characterCode}:${character.weapon}`;
      profiles.set(key, {
        profileKey: key,
        characterCode: character.characterCode,
        characterName: character.characterName,
        weapon: character.weapon,
        weaponName: character.weaponName,
        role: type.role,
        firstOrderType: type.fitRole,
        contexts: [],
      });
    }
    for (const context of type.exactPartnerContexts ?? []) {
      for (const character of context.characters ?? []) {
        const key = `${character.characterCode}:${character.weapon}`;
        const profile = profiles.get(key);
        if (!profile) continue;
        profile.contexts.push({
          partnerTypes: context.partnerTypes,
          games: character.games,
          adjustedResidual: character.adjustedResidual,
          seasonSignals: character.seasonSignals ?? [],
        });
      }
    }
  }
  const descriptor = fs.openSync(EXACT_TWO_PARTNER_OUT, "w");
  try {
    for (const profile of profiles.values()) {
      fs.writeSync(descriptor, `${JSON.stringify(profile)}\n`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return profiles.size;
}

async function main() {
  if (process.argv.includes("--regroup-only")) {
    for (const { role, slug } of ROLES) {
      const outPath = path.resolve(OUT_DIR, `${slug}.json`);
      const current = JSON.parse(fs.readFileSync(outPath, "utf8"));
      const enrichedCharacters = current.characters.map((character) => {
        const classification = character.classification;
        const traits = classification?.traits ?? [];
        const partnerRoles = classification?.partnerRoles ?? [];
        const labels = classificationForCombo(
          character.characterCode,
          character.weapon,
          role,
          traits,
          partnerRoles
        );
        return {
          ...character,
          classification: classification
            ? {
                ...classification,
                archetype: labels.archetype,
                fitRole: labels.fitRole,
                fitReason: labels.fitReason,
              }
            : classification,
        };
      });
      const { characters, groups, internalGroupK } = buildCompositionFitGroups(enrichedCharacters);
      const data = {
        ...current,
        groupK: groups.length,
        internalGroupK,
        role,
        classificationMethod:
          "primary-role+season-10-11-composition-fit-game-trend-metric-split-v5",
        groups,
        characters,
      };
      fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
      console.log(`✓ ${slug} regrouped chars=${characters.length} groups=${groups.length}`);
    }
    return;
  }

  const { url, key } = loadSupabaseEnv();
  const mappings = loadMappings();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { rows, expectedCount, seasonCounts } = ENTRY_ADJUSTED
    ? await fetchEntryAdjustedRows(client)
    : await fetchRows(client);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const roleDatas = ROLES.map((roleInfo) => buildRoleData(roleInfo, rows, mappings));
  for (const [index, roleInfo] of ROLES.entries()) {
    const data = roleDatas[index];
    const outPath = path.resolve(OUT_DIR, `${roleInfo.slug}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
    console.log(
      `✓ ${roleInfo.slug} (${roleInfo.role}) chars=${data.characters.length} groups=${data.groups.length} minGames=${data.minGames}`
    );
  }
  const secondOrderData = buildSecondOrderCompositionData(rows, roleDatas);
  if (secondOrderData.skippedRows > 0) {
    throw new Error(
      `2차 조합 분류에서 역할 프로필이 없는 행 ${secondOrderData.skippedRows}개를 발견했습니다.`
    );
  }
  const exactProfileCount = writeExactTwoPartnerContexts(
    secondOrderData.globalSecondOrderTypeCatalog
  );
  const serializableSecondOrderData = {
    ...secondOrderData,
    globalSecondOrderTypeCatalog:
      secondOrderData.globalSecondOrderTypeCatalog.map(
        ({ exactPartnerContexts: _, ...type }) => type
      ),
    roleCompositions: secondOrderData.roleCompositions.map((composition) => ({
      ...composition,
      typeCatalog: composition.typeCatalog.map(
        ({ exactPartnerContexts: _, ...type }) => type
      ),
    })),
  };
  fs.writeFileSync(
    SECOND_ORDER_OUT,
    `${JSON.stringify(serializableSecondOrderData, null, 2)}\n`
  );
  console.log(
    `✓ composition-types roles=${secondOrderData.roleCompositionCount} ` +
      `reliable=${secondOrderData.reliableTypeCombinationCount} skipped=${secondOrderData.skippedRows} ` +
      `exactProfiles=${exactProfileCount}`
  );
  console.log(
    `source rows=${rows.length} expected=${expectedCount} ` +
      `seasons=${JSON.stringify(seasonCounts)} table=${TABLE}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
