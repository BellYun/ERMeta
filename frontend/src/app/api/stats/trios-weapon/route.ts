import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { createServerClient } from "@/lib/supabase";
import {
  parseTrioWeaponTuple,
  trioWeaponTupleToResult,
  type CachedTrioWeaponTuple,
} from "@/lib/trioWeaponTuple";

const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);
const TRIO_WEAPON_SEARCH_TABLE = "v2_CharacterTrioWeaponSearch_all";
const TRIO_WEAPON_MEMBER_BUCKET_TABLE = "v2_CharacterTrioWeaponMemberBucket";
const TRIO_WEAPON_PAIR_LOOKUP_TABLES = [
  "v2_CharacterTrioWeaponPairLookup_agg_next",
  "v2_CharacterTrioWeaponPairLookup_all_next",
] as const;

// .or() 한 번에 character1/2/3 세 컬럼 OR 절을 던지면 인기 캐릭(예: 자히르=1)에서
// PostgREST statement_timeout(~3s) 초과 → 500. 컬럼당 단일 인덱스만 쓰는 .eq() 3쿼리
// Promise.all 병렬로 분해하여 각 쿼리는 인덱스 1개만 타도록 한다.
const DB_PAGE_SIZE = 1000;
const PARALLEL_FETCH_LIMIT = 5000;
const FULL_FETCH_LIMIT = 5000;
const MAX_RESPONSE_LIMIT = FULL_FETCH_LIMIT;
const TRIO_WEAPON_CACHE_VERSION = "v15";

// L1 캐시 TTL — source 가 사전 집계 테이블(v2_CharacterTrioWeapon* / search_all)이고
// tag-based invalidation 으로 즉시 갱신되므로 7d. member+weapon 버킷을 오래 유지해
// 여러 pair 조회가 같은 저카디널리티 엔트리를 재사용한다. pair/sortBy/limit 은 캐시 외부.
const L1_REVALIDATE_SEC = 7 * 24 * 3600;

type SortBy = "averageRP" | "winRate" | "averageRank" | "totalGames" | "recommended";

const BAYESIAN_K = 50;

function parseIntOrNull(param: string | null): number | null {
  if (param == null) return null;
  const n = parseInt(param, 10);
  return isNaN(n) ? null : n;
}

function normalizeCharacterPair(char1: number, char2: number): [number, number] {
  return char1 <= char2 ? [char1, char2] : [char2, char1];
}

function pairLookupKey(char1: number, char2: number): string {
  const [c1, c2] = normalizeCharacterPair(char1, char2);
  return `${c1}:${c2}`;
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

interface MemberWeaponBucketRow {
  item_count: number;
  items: unknown;
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

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

type SearchPositionColumn = "ally1_char" | "ally2_char" | "third_char";
type TrioWeaponSearchPairPosition = {
  charColumn1: SearchPositionColumn;
  charColumn2: SearchPositionColumn;
};

const TRIO_WEAPON_SEARCH_PAIR_POSITIONS: readonly TrioWeaponSearchPairPosition[] = [
  {
    charColumn1: "ally1_char",
    charColumn2: "ally2_char",
  },
  {
    charColumn1: "ally1_char",
    charColumn2: "third_char",
  },
  {
    charColumn1: "ally2_char",
    charColumn2: "third_char",
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

function matchesCharacterFilter(r: AggregatedTrioWeapon, charCode: number): boolean {
  return r.character1 === charCode || r.character2 === charCode || r.character3 === charCode;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const supabaseError = error as SupabaseErrorLike;
  if (supabaseError.code === "PGRST205" || supabaseError.code === "42P01") return true;

  const message = supabaseError.message ?? "";
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

async function fetchSearchRows(
  fetchPage: (
    offset: number,
    pageEnd: number
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  fetchLimit: number
): Promise<TrioWeaponSearchRow[]> {
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
    const { data, error } = await fetchPage(offset, pageEnd);
    if (error) throw error;

    const pageRows = (data ?? []) as TrioWeaponSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return rows;
}

// ─── DB fetch + 집계 — 기본 분기는 무기 필터를 캐시 외부에서 적용해 L1 키 카디널리티 압축 ──

/**
 * 페어(char1+char2) — all 검색 테이블에서 (char1, char2) 위치 매칭만으로 fetch.
 * 무기 필터는 캐시 외부에서 JS-side 로 적용.
 * char1 < char2 정규화 후 호출.
 */
async function fetchTrioWeaponPair(char1: number, char2: number): Promise<AggregatedTrioWeapon[]> {
  const supabase = createServerClient();
  const [c1, c2] = normalizeCharacterPair(char1, char2);
  const searchSelect =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";

  const key = pairLookupKey(c1, c2);
  for (const lookupTable of TRIO_WEAPON_PAIR_LOOKUP_TABLES) {
    try {
      const lookupRows = await fetchSearchRows(
        (offset, pageEnd) =>
          supabase
            .from(lookupTable)
            .select(searchSelect)
            .eq("pair_key", key)
            .order("total_games", { ascending: false })
            .range(offset, pageEnd),
        FULL_FETCH_LIMIT
      );

      if (lookupRows.length > 0) {
        return aggregateSearchRows(lookupRows).filter((r) => !hasExcludedChar(r));
      }
    } catch (error) {
      if (!isMissingRelationError(error)) throw error;
    }
  }

  const rows = (
    await Promise.all(
      TRIO_WEAPON_SEARCH_PAIR_POSITIONS.map((position) =>
        fetchSearchRows(
          (offset, pageEnd) =>
            supabase
              .from(TRIO_WEAPON_SEARCH_TABLE)
              .select(searchSelect)
              .eq(position.charColumn1, c1)
              .eq(position.charColumn2, c2)
              .order("total_games", { ascending: false })
              .range(offset, pageEnd),
          FULL_FETCH_LIMIT
        )
      )
    )
  ).flat();

  return aggregateSearchRows(rows).filter((r) => !hasExcludedChar(r));
}

/**
 * character+weapon 한 개를 anchor로 사전 집계된 compact tuple bucket 한 행을 가져온다.
 * 패치 집계 시 canonical pair row에서 미리 생성하므로 요청 경로에서는 JSONB_AGG를 하지 않는다.
 */
async function fetchTrioWeaponMemberWeaponBucket(
  character: number,
  weapon: number
): Promise<CachedTrioWeaponTuple[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(TRIO_WEAPON_MEMBER_BUCKET_TABLE)
    .select("item_count,items")
    .eq("character_code", character)
    .eq("weapon_code", weapon)
    .maybeSingle();

  if (error) throw error;
  if (!data) return [];

  const bucket = data as MemberWeaponBucketRow;
  if (!Array.isArray(bucket.items)) {
    throw new Error("invalid_trio_weapon_member_bucket_response");
  }

  const tuples = bucket.items.map(parseTrioWeaponTuple);
  if (Number(bucket.item_count) !== tuples.length) {
    throw new Error("invalid_trio_weapon_member_bucket_count");
  }

  return tuples;
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
      .from(TRIO_WEAPON_SEARCH_TABLE)
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

/** 단일 캐릭터 — all 검색 테이블에서 ally1/ally2/third 3 위치별 fetch 후 trio 단위 dedup. */
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

/** 캐릭터 미지정 — all 검색 테이블 top N */
async function fetchTrioWeaponAll(): Promise<AggregatedTrioWeapon[]> {
  const supabase = createServerClient();
  const select =
    "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
  const rows: TrioWeaponSearchRow[] = [];

  for (let offset = 0; offset < FULL_FETCH_LIMIT; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, FULL_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(TRIO_WEAPON_SEARCH_TABLE)
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

// ─── L1 캐시 래퍼 ────────────────────────────────────────────────────────────
// 무기 지정 요청은 member+weapon bucket만 캐시한다. 두 번째 캐릭터/무기,
// sortBy/limit은 캐시 밖에서 적용하여 pair+weapon 키 폭발을 막는다.

function getCachedTrioWeaponPair(char1: number, char2: number) {
  const [c1, c2] = normalizeCharacterPair(char1, char2);
  return unstable_cache(
    () => fetchTrioWeaponPair(c1, c2),
    ["trio-weapon-pair", TRIO_WEAPON_CACHE_VERSION, String(c1), String(c2)],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: ["trios-weapon", `trios-weapon:char:${c1}`, `trios-weapon:char:${c2}`],
    }
  )();
}

function getCachedTrioWeaponMemberWeapon(character: number, weapon: number) {
  return unstable_cache(
    () => fetchTrioWeaponMemberWeaponBucket(character, weapon),
    ["trio-weapon-member-weapon", TRIO_WEAPON_CACHE_VERSION, String(character), String(weapon)],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags: [
        "trios-weapon",
        `trios-weapon:char:${character}`,
        `trios-weapon:member-weapon:${character}:${weapon}`,
      ],
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
  const tupleFormat = searchParams.get("format") === "tuple";

  // compact tuple 계약은 이 Next route와 Supabase bucket table이 담당한다.
  // Nest가 아직 같은 계약을 제공하지 않으므로 기존 object 요청만 proxy한다.
  if (!tupleFormat) {
    const proxied = await tryNestApiProxy(request, "/stats/trios-weapon");
    if (proxied) return proxied;
  }

  const sortByParam = (searchParams.get("sortBy") ?? "averageRP") as SortBy;
  const limitParam = searchParams.get("limit");

  const rawChar1 = parseIntOrNull(searchParams.get("character1"));
  const rawChar2 = parseIntOrNull(searchParams.get("character2"));
  const rawWeapon1 = parseIntOrNull(searchParams.get("weapon1"));
  const rawWeapon2 = parseIntOrNull(searchParams.get("weapon2"));

  if (
    tupleFormat &&
    (rawChar1 == null ||
      rawWeapon1 == null ||
      rawChar1 < 1 ||
      rawWeapon1 < 1 ||
      rawChar2 != null ||
      rawWeapon2 != null ||
      searchParams.has("sortBy") ||
      searchParams.has("limit"))
  ) {
    return NextResponse.json(
      { error: "tuple_format_requires_member_weapon_only" },
      { status: 400 }
    );
  }
  if (rawChar2 != null && rawChar1 == null) {
    return NextResponse.json({ error: "missing_character1" }, { status: 400 });
  }
  if (rawChar1 != null && rawChar2 != null && rawChar1 === rawChar2) {
    return NextResponse.json({ error: "duplicate_characters" }, { status: 400 });
  }
  if (
    (rawChar1 != null && EXCLUDED_CHARACTER_CODES.has(rawChar1)) ||
    (rawChar2 != null && EXCLUDED_CHARACTER_CODES.has(rawChar2))
  ) {
    if (tupleFormat) {
      return NextResponse.json(
        { version: 1, itemCount: 0, items: [] },
        { headers: getCacheHeaders("stats-long") }
      );
    }
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
    const isExactPairWeaponSearch =
      char1 != null && char2 != null && weapon1 != null && weapon2 != null;
    const memberWeaponAnchor =
      char1 != null && weapon1 != null
        ? { character: char1, weapon: weapon1 }
        : char2 != null && weapon2 != null
          ? { character: char2, weapon: weapon2 }
          : null;

    if (memberWeaponAnchor) {
      const tuples = await getCachedTrioWeaponMemberWeapon(
        memberWeaponAnchor.character,
        memberWeaponAnchor.weapon
      );
      const latencyMs = Date.now() - t0;

      if (tupleFormat) {
        return NextResponse.json(
          { version: 1, itemCount: tuples.length, items: tuples },
          { headers: withCacheObservability(getCacheHeaders("stats-long"), latencyMs) }
        );
      }

      aggregated = tuples.map(trioWeaponTupleToResult);
    } else if (char1 != null && char2 != null) {
      aggregated = await getCachedTrioWeaponPair(char1, char2);
    } else if (char1 != null) {
      aggregated = await getCachedTrioWeaponSingle(char1);
    } else {
      aggregated = await getCachedTrioWeaponAll();
    }
    const latencyMs = Date.now() - t0;

    // member+weapon bucket은 anchor만 보장한다. 두 번째 캐릭터/무기 조건은
    // 캐시 밖에서 적용하여 pair별 캐시 엔트리를 만들지 않는다.
    let filtered = aggregated;
    if (char1 != null) {
      filtered = filtered.filter((r) => matchesCharacterFilter(r, char1));
    }
    if (char2 != null) {
      filtered = filtered.filter((r) => matchesCharacterFilter(r, char2));
    }
    if (char1 != null && weapon1 != null) {
      filtered = filtered.filter((r) => matchesWeaponFilter(r, char1, weapon1));
    }
    if (char2 != null && weapon2 != null) {
      filtered = filtered.filter((r) => matchesWeaponFilter(r, char2, weapon2));
    }

    // 캐시된 배열 mutate 방지를 위해 복사 후 정렬
    const sorted = filtered === aggregated ? [...filtered] : filtered;
    sortAggregatedResults(sorted, sortByParam);

    return NextResponse.json(
      { results: isExactPairWeaponSearch ? sorted : sorted.slice(0, limit) },
      { headers: withCacheObservability(getCacheHeaders("stats-long"), latencyMs) }
    );
  } catch (err) {
    console.error("[stats/trios-weapon] request failed:", err);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
