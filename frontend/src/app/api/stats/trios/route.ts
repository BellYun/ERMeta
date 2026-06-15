import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";

const TRIO_MEMBER_COUNT = 3;
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]); // Dr. 하나, 나쟈
const TRIO_WEAPON_SEARCH_TABLE = "v2_CharacterTrioWeaponSearch_all";
const SEARCH_SELECT = "ally1_char,ally2_char,third_char,total_games,total_wins,total_rp,rank_sum";
const TRIOS_CACHE_VERSION = "v2";

const DB_PAGE_SIZE = 1000;
const PARALLEL_FETCH_LIMIT = 5000;
const FULL_FETCH_LIMIT = 5000;

// L1 캐시 TTL — source 가 사전 집계 검색 테이블이고 tag-based invalidation 으로 갱신됨.
const L1_REVALIDATE_SEC = 7 * 24 * 3600;

type SortBy = "averageRP" | "winRate" | "averageRank" | "totalGames" | "recommended";

// ─── 추천 점수 계산 ────────────────────────────────────────────────────────────
// 이터널리턴 트리오: 24인 8팀, 순위 1~8
// RP 손익 분기점: ~4~5등 (그 이하 음수 RP)

const BAYESIAN_K = 50; // prior 강도: 샘플 50판 수준의 전체 평균으로 수렴

function parseIntOrNull(param: string | null): number | null {
  if (param == null) return null;
  const n = parseInt(param, 10);
  return isNaN(n) ? null : n;
}

/** 베이지안 RP: 샘플 부족 시 전체 평균으로 수렴 */
function bayesianRP(averageRP: number, totalGames: number, globalAvgRP: number): number {
  return (totalGames * averageRP + BAYESIAN_K * globalAvgRP) / (totalGames + BAYESIAN_K);
}

/** Wilson score 하한 (90% 신뢰구간) — 승률의 보수적 추정치 */
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

/** 순위 점수: 1등=1.0, 8등=0.0 (선형) */
function rankScore(averageRank: number): number {
  // averageRank 범위: 1(최고) ~ 8(최저)
  return Math.max(0, Math.min(1, (8 - averageRank) / 7));
}

/** 추천 종합 점수 계산 */
function recommendedScore(
  rec: AggregatedTrio,
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

interface TrioSearchRow {
  ally1_char: number;
  ally2_char: number;
  third_char: number;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

type SearchPositionColumn = "ally1_char" | "ally2_char" | "third_char";
type TrioSearchPairPosition = {
  charColumn1: SearchPositionColumn;
  charColumn2: SearchPositionColumn;
};

const TRIO_SEARCH_PAIR_POSITIONS: readonly TrioSearchPairPosition[] = [
  { charColumn1: "ally1_char", charColumn2: "ally2_char" },
  { charColumn1: "ally1_char", charColumn2: "third_char" },
  { charColumn1: "ally2_char", charColumn2: "third_char" },
];

interface AggregatedTrio {
  character1: number;
  character2: number;
  character3: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

function normalizeCharacters(row: TrioSearchRow): [number, number, number] {
  return [row.ally1_char, row.ally2_char, row.third_char].sort((a, b) => a - b) as [
    number,
    number,
    number,
  ];
}

function trioKeyFromCharacters(characters: readonly [number, number, number]): string {
  return characters.join("-");
}

function searchRowKey(row: TrioSearchRow): string {
  return `${row.ally1_char}|${row.ally2_char}|${row.third_char}`;
}

function aggregateByTrio(rows: TrioSearchRow[]): AggregatedTrio[] {
  const map = new Map<
    string,
    {
      c1: number;
      c2: number;
      c3: number;
      totalGames: number;
      totalWins: number;
      totalRP: number;
      rankSum: number;
    }
  >();

  for (const row of rows) {
    const [c1, c2, c3] = normalizeCharacters(row);
    const key = trioKeyFromCharacters([c1, c2, c3]);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        c1,
        c2,
        c3,
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
    character2: v.c2,
    character3: v.c3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? (v.totalWins / v.totalGames) * 100 : 0,
    averageRP: v.totalGames > 0 ? v.totalRP / v.totalGames / TRIO_MEMBER_COUNT : 0,
    averageRank: v.totalGames > 0 ? v.rankSum / v.totalGames : 0,
  }));
}

function hasExcludedCharacter(row: TrioSearchRow): boolean {
  return (
    EXCLUDED_CHARACTER_CODES.has(row.ally1_char) ||
    EXCLUDED_CHARACTER_CODES.has(row.ally2_char) ||
    EXCLUDED_CHARACTER_CODES.has(row.third_char)
  );
}

async function fetchSearchRows(
  fetchPage: (
    offset: number,
    pageEnd: number
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  fetchLimit: number
): Promise<TrioSearchRow[]> {
  const rows: TrioSearchRow[] = [];

  for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
    const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
    const { data, error } = await fetchPage(offset, pageEnd);
    if (error) throw error;

    const pageRows = (data ?? []) as TrioSearchRow[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
  }

  return rows;
}

/**
 * DB fetch + dedup + filter(제외 캐릭터) + 집계.
 * sort/limit 은 캐시 외부에서 적용해 sortBy/limit 토글에도 L1 hit 유지.
 *
 * char1/char2 는 호출 측에서 char1 < char2 로 정규화된 값을 전달해야 한다.
 */
async function fetchAndAggregateTrios(
  char1: number | null,
  char2: number | null
): Promise<AggregatedTrio[]> {
  const supabase = createServerClient();
  let rows: TrioSearchRow[] = [];

  if (char1 != null && char2 != null) {
    rows = (
      await Promise.all(
        TRIO_SEARCH_PAIR_POSITIONS.map((position) =>
          fetchSearchRows(
            (offset, pageEnd) =>
              supabase
                .from(TRIO_WEAPON_SEARCH_TABLE)
                .select(SEARCH_SELECT)
                .eq(position.charColumn1, char1)
                .eq(position.charColumn2, char2)
                .order("total_games", { ascending: false })
                .range(offset, pageEnd),
            FULL_FETCH_LIMIT
          )
        )
      )
    ).flat();
  } else if (char1 != null) {
    const results = await Promise.all([
      fetchSearchRows(
        (offset, pageEnd) =>
          supabase
            .from(TRIO_WEAPON_SEARCH_TABLE)
            .select(SEARCH_SELECT)
            .eq("ally1_char", char1)
            .range(offset, pageEnd),
        PARALLEL_FETCH_LIMIT
      ),
      fetchSearchRows(
        (offset, pageEnd) =>
          supabase
            .from(TRIO_WEAPON_SEARCH_TABLE)
            .select(SEARCH_SELECT)
            .eq("ally2_char", char1)
            .range(offset, pageEnd),
        PARALLEL_FETCH_LIMIT
      ),
      fetchSearchRows(
        (offset, pageEnd) =>
          supabase
            .from(TRIO_WEAPON_SEARCH_TABLE)
            .select(SEARCH_SELECT)
            .eq("third_char", char1)
            .range(offset, pageEnd),
        PARALLEL_FETCH_LIMIT
      ),
    ]);
    rows = results.flat();
    const seen = new Set<string>();
    rows = rows.filter((row) => {
      const k = searchRowKey(row);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } else {
    rows = await fetchSearchRows(
      (offset, pageEnd) =>
        supabase
          .from(TRIO_WEAPON_SEARCH_TABLE)
          .select(SEARCH_SELECT)
          .order("total_games", { ascending: false })
          .range(offset, pageEnd),
      FULL_FETCH_LIMIT
    );
  }

  const filteredRows = rows.filter((row) => !hasExcludedCharacter(row));

  return aggregateByTrio(filteredRows);
}

/**
 * L1 캐시 래퍼 — 키는 정규화된 (char1, char2) 만 사용. sortBy/limit 은 키에서 제외.
 * tag 무효화: ERmangho 수집 webhook → revalidateTag("trios") | revalidateTag(`trios:char:${n}`)
 */
function getCachedAggregatedTrios(
  char1: number | null,
  char2: number | null
): Promise<AggregatedTrio[]> {
  const c1Key = char1 == null ? "none" : String(char1);
  const c2Key = char2 == null ? "none" : String(char2);
  const tags = ["trios"];
  if (char1 != null) tags.push(`trios:char:${char1}`);
  if (char2 != null) tags.push(`trios:char:${char2}`);

  return unstable_cache(
    () => fetchAndAggregateTrios(char1, char2),
    ["trios-aggregated", TRIOS_CACHE_VERSION, c1Key, c2Key],
    {
      revalidate: L1_REVALIDATE_SEC,
      tags,
    }
  )();
}

function sortAggregated(aggregated: AggregatedTrio[], sortBy: SortBy): void {
  if (sortBy === "recommended") {
    const globalAvgRP =
      aggregated.length > 0
        ? aggregated.reduce((sum, r) => sum + r.averageRP, 0) / aggregated.length
        : 0;
    const rpValues = aggregated.map((r) => r.averageRP);
    const rpRange = {
      min: rpValues.length > 0 ? Math.min(...rpValues) : 0,
      max: rpValues.length > 0 ? Math.max(...rpValues) : 0,
    };
    aggregated.sort(
      (a, b) =>
        recommendedScore(b, globalAvgRP, rpRange) - recommendedScore(a, globalAvgRP, rpRange)
    );
    return;
  }
  aggregated.sort((a, b) => {
    if (sortBy === "averageRP") return b.averageRP - a.averageRP;
    if (sortBy === "winRate") return b.winRate - a.winRate;
    if (sortBy === "averageRank") return a.averageRank - b.averageRank;
    return b.totalGames - a.totalGames;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sortByParam = (searchParams.get("sortBy") ?? "averageRP") as SortBy;
  const limitParam = searchParams.get("limit");

  const rawChar1 = parseIntOrNull(searchParams.get("character1"));
  const rawChar2 = parseIntOrNull(searchParams.get("character2"));

  // character2만 단독 전달 금지
  if (rawChar2 != null && rawChar1 == null) {
    return NextResponse.json(
      { error: "character2는 character1 없이 사용할 수 없습니다." },
      { status: 400 }
    );
  }

  // 동일 캐릭터 금지
  if (rawChar1 != null && rawChar2 != null && rawChar1 === rawChar2) {
    return NextResponse.json(
      { error: "character1과 character2는 달라야 합니다." },
      { status: 400 }
    );
  }

  // 제외 캐릭터 선택 시 빈 결과
  if (
    (rawChar1 != null && EXCLUDED_CHARACTER_CODES.has(rawChar1)) ||
    (rawChar2 != null && EXCLUDED_CHARACTER_CODES.has(rawChar2))
  ) {
    return NextResponse.json({ results: [] }, { headers: getCacheHeaders("frequent") });
  }

  // (char1, char2) 정규화 — 캐시 키 카디널리티 절반으로 축소
  let char1 = rawChar1;
  let char2 = rawChar2;
  if (char1 != null && char2 != null && char1 > char2) {
    [char1, char2] = [char2, char1];
  }

  // limit 보정 (1~200, 기본 100)
  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 200) limit = 200;

  try {
    const t0 = Date.now();
    const aggregated = await getCachedAggregatedTrios(char1, char2);
    const latencyMs = Date.now() - t0;
    // 원본 캐시 mutate 방지를 위해 복사 후 정렬
    const sorted = [...aggregated];
    sortAggregated(sorted, sortByParam);

    return NextResponse.json(
      { results: sorted.slice(0, limit) },
      { headers: withCacheObservability(getCacheHeaders("frequent"), latencyMs) }
    );
  } catch (err) {
    console.error("[stats/trios] 예외:", err);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
