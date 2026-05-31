import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";
import { TierGroup } from "@/utils/tier";

const DIAMOND_PLUS_TIERS: TierGroup[] = [TierGroup.DIAMOND, TierGroup.METEORITE, TierGroup.MITHRIL];
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);
const TRIO_WEAPON_SEARCH_P10_TABLE = "v2_CharacterTrioWeaponSearch_p10";
const TRIO_WEAPON_TABLE = "v2_CharacterTrioWeapon";
const SUPPLEMENTAL_PATCH_VERSIONS = ["11.1", "11.2", "11.3"];

// .or() 한 번에 character1/2/3 세 컬럼 OR 절을 던지면 인기 캐릭(예: 자히르=1)에서
// PostgREST statement_timeout(~3s) 초과 → 500. 컬럼당 단일 인덱스만 쓰는 .eq() 3쿼리
// Promise.all 병렬로 분해하여 각 쿼리는 인덱스 1개만 타도록 한다.
const DB_PAGE_SIZE = 1000;
const PARALLEL_FETCH_LIMIT = 5000;
const FULL_FETCH_LIMIT = 5000;
const EXACT_PAIR_WEAPON_FETCH_LIMIT = 20000;
const MAX_RESPONSE_LIMIT = FULL_FETCH_LIMIT;
const TRIO_WEAPON_CACHE_VERSION = "v3";

// L1 캐시 TTL — source 가 사전 집계 테이블(v2_CharacterTrioWeapon* / _p10)이고
// tag-based invalidation 으로 즉시 갱신되므로 7d. 카디널리티가 가장 큰 라우트라
// 한번 채워진 항목을 최대한 오래 유지해 hit rate 극대화. 무기/sortBy/limit 은 캐시 외부.
const L1_REVALIDATE_SEC = 7 * 24 * 3600;

type SortBy = "averageRP" | "winRate" | "averageRank" | "totalGames" | "recommended";

const BAYESIAN_K = 50;

function parseIntOrNull(param: string | null): number | null {
  if (param == null) return null;
  const n = parseInt(param, 10);
  return isNaN(n) ? null : n;
}

function bayesianRP(averageRP: number, totalGames: number, globalAvgRP: number): number {
  return (totalGames * averageRP + BAYESIAN_K * globalAvgRP) / (totalGames + BAYESIAN_K);
}

function wilsonLower(winRatePct: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  const p = winRatePct / 100;
  const z = 1.645;
  const n = totalGames;
  const numerator =
    p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const denominator = 1 + (z * z) / n;
  return Math.max(0, numerator / denominator);
}

function rankScore(averageRank: number): number {
  return Math.max(0, Math.min(1, (8 - averageRank) / 7));
}

function recommendedScore(
  rec: AggregatedTrioWeapon,
  globalAvgRP: number,
  rpRange: { min: number; max: number }
): number {
  const bRP = bayesianRP(rec.averageRP, rec.totalGames, globalAvgRP);
  const span = rpRange.max - rpRange.min || 1;
  const normalizedRP = Math.max(0, Math.min(1, (bRP - rpRange.min) / span));
  const wilson = wilsonLower(rec.winRate, rec.totalGames);
  const rScore = rankScore(rec.averageRank);
  return 0.6 * normalizedRP + 0.3 * wilson + 0.1 * rScore;
}

interface TrioWeaponRow {
  tier: string;
  character1: number;
  weapon_type1: number;
  character2: number;
  weapon_type2: number;
  character3: number;
  weapon_type3: number;
  main_core1: number | null;
  main_core2: number | null;
  main_core3: number | null;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

interface AggregatedTrioWeapon {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

interface TrioWeaponSearchRow {
  ally1_char: number;
  ally1_weapon: number;
  ally1_core: number | null;
  ally2_char: number;
  ally2_weapon: number;
  ally2_core: number | null;
  third_char: number;
  third_weapon: number;
  third_core: number | null;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

interface TrioWeaponMember {
  character: number;
  weapon: number;
  mainCore: number | null;
}

type SearchPositionColumn = "ally1_char" | "ally2_char" | "third_char";
type TrioWeaponPositionColumn = "character1" | "character2" | "character3";
type TrioWeaponColumn = keyof TrioWeaponRow;
type TrioWeaponPairPosition = {
  charColumn1: TrioWeaponPositionColumn;
  weaponColumn1: TrioWeaponColumn;
  charColumn2: TrioWeaponPositionColumn;
  weaponColumn2: TrioWeaponColumn;
};

const TRIO_WEAPON_SELECT =
  "tier,character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,main_core1,main_core2,main_core3,total_games,total_wins,total_rp,rank_sum";

const TRIO_WEAPON_PAIR_POSITIONS: readonly TrioWeaponPairPosition[] = [
  {
    charColumn1: "character1",
    weaponColumn1: "weapon_type1",
    charColumn2: "character2",
    weaponColumn2: "weapon_type2",
  },
  {
    charColumn1: "character1",
    weaponColumn1: "weapon_type1",
    charColumn2: "character3",
    weaponColumn2: "weapon_type3",
  },
  {
    charColumn1: "character2",
    weaponColumn1: "weapon_type2",
    charColumn2: "character3",
    weaponColumn2: "weapon_type3",
  },
];

function normalizeTrioMembersByCharacter(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember]
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return [...members].sort(
    (a, b) =>
      a.character - b.character || a.weapon - b.weapon || (a.mainCore ?? 0) - (b.mainCore ?? 0)
  ) as [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember];
}

function trioWeaponKeyFromMembers(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember]
): string {
  return members
    .map((member) => [member.character, member.weapon, member.mainCore ?? 0].join(":"))
    .join("|");
}

function buildNormalizedMembersFromSearchRow(
  row: Pick<
    TrioWeaponSearchRow,
    | "ally1_char"
    | "ally1_weapon"
    | "ally1_core"
    | "ally2_char"
    | "ally2_weapon"
    | "ally2_core"
    | "third_char"
    | "third_weapon"
    | "third_core"
  >
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return normalizeTrioMembersByCharacter([
    { character: row.ally1_char, weapon: row.ally1_weapon, mainCore: row.ally1_core },
    { character: row.ally2_char, weapon: row.ally2_weapon, mainCore: row.ally2_core },
    { character: row.third_char, weapon: row.third_weapon, mainCore: row.third_core },
  ]);
}

function buildNormalizedMembersFromTrioRow(
  row: Pick<
    TrioWeaponRow,
    | "character1"
    | "weapon_type1"
    | "main_core1"
    | "character2"
    | "weapon_type2"
    | "main_core2"
    | "character3"
    | "weapon_type3"
    | "main_core3"
  >
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return normalizeTrioMembersByCharacter([
    { character: row.character1, weapon: row.weapon_type1, mainCore: row.main_core1 },
    { character: row.character2, weapon: row.weapon_type2, mainCore: row.main_core2 },
    { character: row.character3, weapon: row.weapon_type3, mainCore: row.main_core3 },
  ]);
}

function searchRowKey(row: TrioWeaponSearchRow): string {
  return trioWeaponKeyFromMembers(buildNormalizedMembersFromSearchRow(row));
}

function mapSearchRowToAggregated(row: TrioWeaponSearchRow): AggregatedTrioWeapon {
  const [m1, m2, m3] = buildNormalizedMembersFromSearchRow(row);

  return {
    character1: m1.character,
    weaponType1: m1.weapon,
    character2: m2.character,
    weaponType2: m2.weapon,
    character3: m3.character,
    weaponType3: m3.weapon,
    mainCore1: m1.mainCore,
    mainCore2: m2.mainCore,
    mainCore3: m3.mainCore,
    totalGames: row.total_games,
    winRate: row.total_games > 0 ? (row.total_wins / row.total_games) * 100 : 0,
    averageRP: row.total_games > 0 ? row.total_rp / row.total_games / 3 : 0,
    averageRank: row.total_games > 0 ? row.rank_sum / row.total_games : 0,
  };
}

function aggregateSearchRows(rows: TrioWeaponSearchRow[]): AggregatedTrioWeapon[] {
  const grouped = new Map<string, TrioWeaponSearchRow>();

  for (const row of rows) {
    const key = searchRowKey(row);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...row });
      continue;
    }

    existing.total_games += row.total_games;
    existing.total_wins += row.total_wins;
    existing.total_rp += row.total_rp;
    existing.rank_sum += row.rank_sum;
  }

  return Array.from(grouped.values()).map(mapSearchRowToAggregated);
}

function sortAggregatedResults(results: AggregatedTrioWeapon[], sortByParam: SortBy) {
  if (sortByParam === "recommended") {
    const globalAvgRP =
      results.length > 0 ? results.reduce((sum, r) => sum + r.averageRP, 0) / results.length : 0;
    const rpValues = results.map((r) => r.averageRP);
    const rpRange = {
      min: rpValues.length > 0 ? Math.min(...rpValues) : 0,
      max: rpValues.length > 0 ? Math.max(...rpValues) : 0,
    };
    results.sort(
      (a, b) =>
        recommendedScore(b, globalAvgRP, rpRange) - recommendedScore(a, globalAvgRP, rpRange)
    );
    return;
  }

  results.sort((a, b) => {
    if (sortByParam === "averageRP") return b.averageRP - a.averageRP;
    if (sortByParam === "winRate") return b.winRate - a.winRate;
    if (sortByParam === "averageRank") return a.averageRank - b.averageRank;
    return b.totalGames - a.totalGames;
  });
}

function aggregateByTrioWeapon(rows: TrioWeaponRow[]): AggregatedTrioWeapon[] {
  const map = new Map<
    string,
    {
      c1: number;
      w1: number;
      c2: number;
      w2: number;
      c3: number;
      w3: number;
      mc1: number | null;
      mc2: number | null;
      mc3: number | null;
      totalGames: number;
      totalWins: number;
      totalRP: number;
      rankSum: number;
    }
  >();

  for (const row of rows) {
    const [m1, m2, m3] = buildNormalizedMembersFromTrioRow(row);
    const key = trioWeaponKeyFromMembers([m1, m2, m3]);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        c1: m1.character,
        w1: m1.weapon,
        c2: m2.character,
        w2: m2.weapon,
        c3: m3.character,
        w3: m3.weapon,
        mc1: m1.mainCore,
        mc2: m2.mainCore,
        mc3: m3.mainCore,
        totalGames: row.total_games,
        totalWins: row.total_wins,
        totalRP: row.total_rp,
        rankSum: row.rank_sum,
      });
    } else {
      existing.totalGames += row.total_games;
      existing.totalWins += row.total_wins;
      existing.totalRP += row.total_rp;
      existing.rankSum += row.rank_sum;
    }
  }

  return Array.from(map.values()).map((v) => ({
    character1: v.c1,
    weaponType1: v.w1,
    character2: v.c2,
    weaponType2: v.w2,
    character3: v.c3,
    weaponType3: v.w3,
    mainCore1: v.mc1,
    mainCore2: v.mc2,
    mainCore3: v.mc3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? (v.totalWins / v.totalGames) * 100 : 0,
    averageRP: v.totalGames > 0 ? v.totalRP / v.totalGames / 3 : 0,
    averageRank: v.totalGames > 0 ? v.rankSum / v.totalGames : 0,
  }));
}

function aggregateKey(row: AggregatedTrioWeapon): string {
  return trioWeaponKeyFromMembers(
    normalizeTrioMembersByCharacter([
      { character: row.character1, weapon: row.weaponType1, mainCore: row.mainCore1 },
      { character: row.character2, weapon: row.weaponType2, mainCore: row.mainCore2 },
      { character: row.character3, weapon: row.weaponType3, mainCore: row.mainCore3 },
    ])
  );
}

function mergeAggregatedResults(results: AggregatedTrioWeapon[]): AggregatedTrioWeapon[] {
  const merged = new Map<
    string,
    {
      row: AggregatedTrioWeapon;
      totalWins: number;
      totalRP: number;
      rankSum: number;
    }
  >();

  for (const result of results) {
    const key = aggregateKey(result);
    const totalWins = (result.winRate * result.totalGames) / 100;
    const totalRP = result.averageRP * result.totalGames * 3;
    const rankSum = result.averageRank * result.totalGames;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { row: { ...result }, totalWins, totalRP, rankSum });
      continue;
    }

    existing.row.totalGames += result.totalGames;
    existing.totalWins += totalWins;
    existing.totalRP += totalRP;
    existing.rankSum += rankSum;
  }

  return Array.from(merged.values()).map(({ row, totalWins, totalRP, rankSum }) => ({
    ...row,
    winRate: row.totalGames > 0 ? (totalWins / row.totalGames) * 100 : 0,
    averageRP: row.totalGames > 0 ? totalRP / row.totalGames / 3 : 0,
    averageRank: row.totalGames > 0 ? rankSum / row.totalGames : 0,
  }));
}

function hasExcludedChar(r: AggregatedTrioWeapon): boolean {
  return (
    EXCLUDED_CHARACTER_CODES.has(r.character1) ||
    EXCLUDED_CHARACTER_CODES.has(r.character2) ||
    EXCLUDED_CHARACTER_CODES.has(r.character3)
  );
}

function matchesWeaponFilter(
  r: AggregatedTrioWeapon,
  charCode: number,
  weaponCode: number
): boolean {
  return (
    (r.character1 === charCode && r.weaponType1 === weaponCode) ||
    (r.character2 === charCode && r.weaponType2 === weaponCode) ||
    (r.character3 === charCode && r.weaponType3 === weaponCode)
  );
}

async function fetchSupplementalTrioWeaponPairPosition(
  char1: number,
  char2: number,
  position: TrioWeaponPairPosition,
  fetchLimit: number
): Promise<TrioWeaponRow[]> {
  const supabase = createServerClient();
  const rows: TrioWeaponRow[] = [];

  for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_TABLE)
      .select(TRIO_WEAPON_SELECT)
      .in("patch_version", SUPPLEMENTAL_PATCH_VERSIONS)
      .in("tier", DIAMOND_PLUS_TIERS)
      .eq(position.charColumn1, char1)
      .eq(position.charColumn2, char2)
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchSupplementalTrioWeaponExactPairPosition(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number,
  position: TrioWeaponPairPosition,
  fetchLimit: number
): Promise<TrioWeaponRow[]> {
  const supabase = createServerClient();
  const rows: TrioWeaponRow[] = [];

  for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_TABLE)
      .select(TRIO_WEAPON_SELECT)
      .in("patch_version", SUPPLEMENTAL_PATCH_VERSIONS)
      .in("tier", DIAMOND_PLUS_TIERS)
      .eq(position.charColumn1, char1)
      .eq(position.weaponColumn1, weapon1)
      .eq(position.charColumn2, char2)
      .eq(position.weaponColumn2, weapon2)
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchSupplementalTrioWeaponPair(
  char1: number,
  char2: number,
  fetchLimit: number
): Promise<AggregatedTrioWeapon[]> {
  const rows = (
    await Promise.all(
      TRIO_WEAPON_PAIR_POSITIONS.map((position) =>
        fetchSupplementalTrioWeaponPairPosition(char1, char2, position, fetchLimit)
      )
    )
  ).flat();

  return aggregateByTrioWeapon(rows).filter((r) => !hasExcludedChar(r));
}

async function fetchSupplementalTrioWeaponExactPair(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number,
  fetchLimit: number
): Promise<AggregatedTrioWeapon[]> {
  const rows = (
    await Promise.all(
      TRIO_WEAPON_PAIR_POSITIONS.map((position) =>
        fetchSupplementalTrioWeaponExactPairPosition(
          char1,
          weapon1,
          char2,
          weapon2,
          position,
          fetchLimit
        )
      )
    )
  ).flat();

  return aggregateByTrioWeapon(rows).filter((r) => !hasExcludedChar(r));
}

async function safeFetchSupplemental(
  label: string,
  fetcher: () => Promise<AggregatedTrioWeapon[]>
): Promise<AggregatedTrioWeapon[]> {
  try {
    return await fetcher();
  } catch (error) {
    console.warn(`[stats/trios-weapon] supplemental fetch skipped: ${label}`, error);
    return [];
  }
}

// ─── DB fetch + 집계 — 기본 분기는 무기 필터를 캐시 외부에서 적용해 L1 키 카디널리티 압축 ──

/**
 * 페어(char1+char2) — p10 테이블에서 (char1, char2) 위치 매칭만으로 fetch.
 * 무기 필터는 캐시 외부에서 JS-side 로 적용.
 * char1 < char2 정규화 후 호출.
 */
async function fetchTrioWeaponPair(char1: number, char2: number): Promise<AggregatedTrioWeapon[]> {
  const supabase = createServerClient();
  const searchSelect =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < FULL_FETCH_LIMIT; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, FULL_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_SEARCH_P10_TABLE)
      .select(searchSelect)
      .eq("ally1_char", char1)
      .eq("ally2_char", char2)
      .order("total_games", { ascending: false })
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  const baseResults = aggregateSearchRows(rows).filter((r) => !hasExcludedChar(r));
  const supplementalResults = await safeFetchSupplemental(`pair:${char1}:${char2}`, () =>
    fetchSupplementalTrioWeaponPair(char1, char2, FULL_FETCH_LIMIT)
  );
  return mergeAggregatedResults([...baseResults, ...supplementalResults]);
}

/**
 * 정확 페어(char1+weapon1, char2+weapon2) — DB에서 무기까지 필터링한다.
 * 상세 추천처럼 조건이 충분히 좁은 경우에는 5,000개 일반 cap 때문에 후보가 누락되면 안 된다.
 */
async function fetchTrioWeaponPairWeaponExact(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number
): Promise<AggregatedTrioWeapon[]> {
  const supabase = createServerClient();
  const searchSelect =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < EXACT_PAIR_WEAPON_FETCH_LIMIT; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, EXACT_PAIR_WEAPON_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_SEARCH_P10_TABLE)
      .select(searchSelect)
      .eq("ally1_char", char1)
      .eq("ally1_weapon", weapon1)
      .eq("ally2_char", char2)
      .eq("ally2_weapon", weapon2)
      .order("total_games", { ascending: false })
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  const baseResults = aggregateSearchRows(rows).filter((r) => !hasExcludedChar(r));
  const supplementalResults = await safeFetchSupplemental(
    `exact-pair:${char1}:${weapon1}:${char2}:${weapon2}`,
    () =>
      fetchSupplementalTrioWeaponExactPair(
        char1,
        weapon1,
        char2,
        weapon2,
        EXACT_PAIR_WEAPON_FETCH_LIMIT
      )
  );
  return mergeAggregatedResults([...baseResults, ...supplementalResults]);
}

async function fetchTrioWeaponSinglePosition(
  char1: number,
  column: SearchPositionColumn
): Promise<TrioWeaponSearchRow[]> {
  const supabase = createServerClient();
  const searchSelect =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < PARALLEL_FETCH_LIMIT; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, PARALLEL_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_SEARCH_P10_TABLE)
      .select(searchSelect)
      .eq(column, char1)
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return rows;
}

/** 단일 캐릭터 — p10 테이블에서 ally1/ally2/third 3 위치별 fetch 후 trio 단위 dedup. */
async function fetchTrioWeaponSingle(char1: number): Promise<AggregatedTrioWeapon[]> {
  const results = await Promise.all([
    fetchTrioWeaponSinglePosition(char1, "ally1_char"),
    fetchTrioWeaponSinglePosition(char1, "ally2_char"),
    fetchTrioWeaponSinglePosition(char1, "third_char"),
  ]);
  const allSearchRows = results.flat();
  // dedup: 같은 trio가 ally1/ally2/third 3 위치에서 동시 매칭됨.
  // 정렬된 (char, weapon, core) tuple을 키로.
  const seen = new Set<string>();
  const dedupedRows = allSearchRows.filter((row) => {
    const triple = [
      [row.ally1_char, row.ally1_weapon, row.ally1_core ?? 0],
      [row.ally2_char, row.ally2_weapon, row.ally2_core ?? 0],
      [row.third_char, row.third_weapon, row.third_core ?? 0],
    ]
      .sort((a, b) => a[0]! - b[0]!)
      .map((t) => t.join(":"))
      .join("|");
    if (seen.has(triple)) return false;
    seen.add(triple);
    return true;
  });

  return aggregateSearchRows(dedupedRows).filter((r) => !hasExcludedChar(r));
}

/** [임시 검증] 캐릭터 미지정 — p10 search 테이블 top N (migration 024 인덱스 효과 측정용) */
async function fetchTrioWeaponAll(): Promise<AggregatedTrioWeapon[]> {
  const supabase = createServerClient();
  const select =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < FULL_FETCH_LIMIT; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, FULL_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_SEARCH_P10_TABLE)
      .select(select)
      .order("total_games", { ascending: false })
      .range(offset, pageEnd);

    if (error) throw error;
    const pageRows = (data ?? []) as TrioWeaponSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return aggregateSearchRows(rows).filter((r) => !hasExcludedChar(r));
}

// ─── L1 캐시 래퍼 — 키는 정규화된 캐릭터 코드만. 무기/sortBy/limit 은 외부 적용. ──

function getCachedTrioWeaponPair(char1: number, char2: number) {
  return unstable_cache(
    () => fetchTrioWeaponPair(char1, char2),
    ["trio-weapon-pair", TRIO_WEAPON_CACHE_VERSION, String(char1), String(char2)],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: ["trios-weapon", `trios-weapon:char:${char1}`, `trios-weapon:char:${char2}`],
    }
  )();
}

function getCachedTrioWeaponPairWeaponExact(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number
) {
  return unstable_cache(
    () => fetchTrioWeaponPairWeaponExact(char1, weapon1, char2, weapon2),
    [
      "trio-weapon-pair-weapon-exact",
      TRIO_WEAPON_CACHE_VERSION,
      String(char1),
      String(weapon1),
      String(char2),
      String(weapon2),
    ],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: ["trios-weapon", `trios-weapon:char:${char1}`, `trios-weapon:char:${char2}`],
    }
  )();
}

function getCachedTrioWeaponSingle(char1: number) {
  return unstable_cache(
    () => fetchTrioWeaponSingle(char1),
    ["trio-weapon-single", TRIO_WEAPON_CACHE_VERSION, String(char1)],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: ["trios-weapon", `trios-weapon:char:${char1}`],
    }
  )();
}

function getCachedTrioWeaponAll() {
  return unstable_cache(
    () => fetchTrioWeaponAll(),
    ["trio-weapon-all", TRIO_WEAPON_CACHE_VERSION],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: ["trios-weapon"],
    }
  )();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortByParam = (searchParams.get("sortBy") ?? "averageRP") as SortBy;
  const limitParam = searchParams.get("limit");

  const rawChar1 = parseIntOrNull(searchParams.get("character1"));
  const rawChar2 = parseIntOrNull(searchParams.get("character2"));
  const rawWeapon1 = parseIntOrNull(searchParams.get("weapon1"));
  const rawWeapon2 = parseIntOrNull(searchParams.get("weapon2"));

  if (rawChar2 != null && rawChar1 == null) {
    return NextResponse.json(
      { error: "character2는 character1 없이 사용할 수 없습니다." },
      { status: 400 }
    );
  }
  if (rawChar1 != null && rawChar2 != null && rawChar1 === rawChar2) {
    return NextResponse.json(
      { error: "character1과 character2는 달라야 합니다." },
      { status: 400 }
    );
  }
  if (
    (rawChar1 != null && EXCLUDED_CHARACTER_CODES.has(rawChar1)) ||
    (rawChar2 != null && EXCLUDED_CHARACTER_CODES.has(rawChar2))
  ) {
    return NextResponse.json({ results: [] }, { headers: getCacheHeaders("stats-long") });
  }

  // (char1, char2) 페어를 작은→큰 순으로 정규화하고 weapon 도 동일 순서로 swap.
  // 캐시 키는 char1<char2 만 사용 → 키 카디널리티 절반.
  let char1 = rawChar1;
  let char2 = rawChar2;
  let weapon1 = rawWeapon1;
  let weapon2 = rawWeapon2;
  if (char1 != null && char2 != null && char1 > char2) {
    [char1, char2] = [char2, char1];
    [weapon1, weapon2] = [weapon2, weapon1];
  }

  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > MAX_RESPONSE_LIMIT) limit = MAX_RESPONSE_LIMIT;

  try {
    const t0 = Date.now();
    let aggregated: AggregatedTrioWeapon[];
    let isExactPairWeaponSearch = false;
    if (char1 != null && char2 != null && weapon1 != null && weapon2 != null) {
      isExactPairWeaponSearch = true;
      aggregated = await getCachedTrioWeaponPairWeaponExact(char1, weapon1, char2, weapon2);
    } else if (char1 != null && char2 != null) {
      aggregated = await getCachedTrioWeaponPair(char1, char2);
    } else if (char1 != null) {
      aggregated = await getCachedTrioWeaponSingle(char1);
    } else {
      aggregated = await getCachedTrioWeaponAll();
    }
    const latencyMs = Date.now() - t0;

    // 무기 필터 — 캐시 외부에서 적용 (캐시 키에 weapon 미포함)
    let filtered = aggregated;
    if (char1 != null && weapon1 != null) {
      filtered = filtered.filter((r) => matchesWeaponFilter(r, char1!, weapon1!));
    }
    if (char2 != null && weapon2 != null) {
      filtered = filtered.filter((r) => matchesWeaponFilter(r, char2!, weapon2!));
    }

    // 캐시된 배열 mutate 방지를 위해 복사 후 정렬
    const sorted = filtered === aggregated ? [...filtered] : filtered;
    sortAggregatedResults(sorted, sortByParam);

    return NextResponse.json(
      { results: isExactPairWeaponSearch ? sorted : sorted.slice(0, limit) },
      { headers: withCacheObservability(getCacheHeaders("stats-long"), latencyMs) }
    );
  } catch (err) {
    console.error("[stats/trios-weapon] 예외:", err);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
