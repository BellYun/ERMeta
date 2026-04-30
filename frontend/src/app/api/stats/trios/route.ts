import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";
import { TierGroup } from "@/utils/tier";

export const revalidate = 3600; // L1: 1시간 서버 캐시

// 다이아 이상 티어 전체
const DIAMOND_PLUS_TIERS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
];
const TRIO_MEMBER_COUNT = 3;
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]); // Dr. 하나, 나쟈

// .or() 한 번에 character1/2/3 세 컬럼 OR 절을 던지면 인기 캐릭(예: 자히르=1)에서
// PostgREST statement_timeout 초과 → 500. 컬럼당 단일 인덱스만 쓰는 .eq() 3쿼리
// Promise.all 병렬로 분해.
const PARALLEL_FETCH_LIMIT = 2000;
const FULL_FETCH_LIMIT = 5000;

type SortBy = "averageRP" | "winRate" | "totalGames" | "recommended";

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

interface TrioRow {
  tier: string;
  character1: number;
  character2: number;
  character3: number;
  winRate: number;
  averageRP: number;
  totalGames: number;
  averageRank: number;
}

interface AggregatedTrio {
  character1: number;
  character2: number;
  character3: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

function aggregateByTrio(rows: TrioRow[]): AggregatedTrio[] {
  const map = new Map<
    string,
    {
      c1: number;
      c2: number;
      c3: number;
      totalGames: number;
      winRateWeighted: number;
      avgRPWeighted: number;
      avgRankWeighted: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.character1}-${row.character2}-${row.character3}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        c1: row.character1,
        c2: row.character2,
        c3: row.character3,
        totalGames: row.totalGames,
        winRateWeighted: row.winRate * row.totalGames,
        avgRPWeighted: row.averageRP * row.totalGames,
        avgRankWeighted: row.averageRank * row.totalGames,
      });
    } else {
      existing.totalGames += row.totalGames;
      existing.winRateWeighted += row.winRate * row.totalGames;
      existing.avgRPWeighted += row.averageRP * row.totalGames;
      existing.avgRankWeighted += row.averageRank * row.totalGames;
    }
  }

  return Array.from(map.values()).map((v) => ({
    character1: v.c1,
    character2: v.c2,
    character3: v.c3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? v.winRateWeighted / v.totalGames : 0,
    averageRP: v.totalGames > 0 ? v.avgRPWeighted / v.totalGames / TRIO_MEMBER_COUNT : 0,
    averageRank: v.totalGames > 0 ? v.avgRankWeighted / v.totalGames : 0,
  }));
}

function rowKey(row: TrioRow): string {
  return `${row.tier}|${row.character1}|${row.character2}|${row.character3}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sortByParam = (searchParams.get("sortBy") ?? "recommended") as SortBy;
  const limitParam = searchParams.get("limit");

  const char1 = parseIntOrNull(searchParams.get("character1"));
  const char2 = parseIntOrNull(searchParams.get("character2"));

  // character2만 단독 전달 금지
  if (char2 != null && char1 == null) {
    return NextResponse.json(
      { error: "character2는 character1 없이 사용할 수 없습니다." },
      { status: 400 }
    );
  }

  // 동일 캐릭터 금지
  if (char1 != null && char2 != null && char1 === char2) {
    return NextResponse.json(
      { error: "character1과 character2는 달라야 합니다." },
      { status: 400 }
    );
  }

  // 제외 캐릭터 선택 시 빈 결과
  if (
    (char1 != null && EXCLUDED_CHARACTER_CODES.has(char1)) ||
    (char2 != null && EXCLUDED_CHARACTER_CODES.has(char2))
  ) {
    return NextResponse.json({ results: [] });
  }

  // limit 보정 (1~200, 기본 100)
  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 200) limit = 200;

  try {
    const supabase = createServerClient();
    const select = "tier,character1,character2,character3,winRate,averageRP,totalGames,averageRank";

    const baseQuery = (perQueryLimit: number) =>
      supabase
        .from("v2_CharacterTrio")
        .select(select)
        .in("tier", DIAMOND_PLUS_TIERS)
        .order("totalGames", { ascending: false })
        .limit(perQueryLimit);

    let rows: TrioRow[] = [];

    if (char1 != null && char2 != null) {
      const [low, high] = [char1, char2].sort((a, b) => a - b);
      const results = await Promise.all([
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character1", low).eq("character2", high),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character1", low).eq("character3", high),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character2", low).eq("character3", high),
      ]);
      for (const r of results) {
        if (r.error) {
          console.error("[stats/trios] v2 Supabase error:", r.error);
          return NextResponse.json(
            { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
        rows.push(...((r.data ?? []) as TrioRow[]));
      }
      const seen = new Set<string>();
      rows = rows.filter((row) => {
        const k = rowKey(row);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else if (char1 != null) {
      const results = await Promise.all([
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character1", char1),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character2", char1),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character3", char1),
      ]);
      for (const r of results) {
        if (r.error) {
          console.error("[stats/trios] v2 Supabase error:", r.error);
          return NextResponse.json(
            { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
        rows.push(...((r.data ?? []) as TrioRow[]));
      }
      const seen = new Set<string>();
      rows = rows.filter((row) => {
        const k = rowKey(row);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else {
      const { data, error } = await baseQuery(FULL_FETCH_LIMIT);
      if (error) {
        console.error("[stats/trios] v2 Supabase error:", error);
        return NextResponse.json(
          { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }
      rows = (data ?? []) as TrioRow[];
    }

    const filteredRows = rows.filter(
      (row) =>
        !EXCLUDED_CHARACTER_CODES.has(row.character1) &&
        !EXCLUDED_CHARACTER_CODES.has(row.character2) &&
        !EXCLUDED_CHARACTER_CODES.has(row.character3)
    );

    // 티어 간 집계 (가중 평균)
    const aggregated = aggregateByTrio(filteredRows);

    // 집계 후 정렬
    if (sortByParam === "recommended") {
      const globalAvgRP =
        aggregated.length > 0
          ? aggregated.reduce((sum, r) => sum + r.averageRP, 0) / aggregated.length
          : 0;
      const rpValues = aggregated.map((r) => r.averageRP);
      const rpRange = {
        min: Math.min(...rpValues),
        max: Math.max(...rpValues),
      };
      aggregated.sort(
        (a, b) =>
          recommendedScore(b, globalAvgRP, rpRange) - recommendedScore(a, globalAvgRP, rpRange)
      );
    } else {
      aggregated.sort((a, b) => {
        if (sortByParam === "averageRP") return b.averageRP - a.averageRP;
        if (sortByParam === "winRate") return b.winRate - a.winRate;
        return b.totalGames - a.totalGames;
      });
    }

    return NextResponse.json(
      { results: aggregated.slice(0, limit) },
      { headers: getCacheHeaders("frequent") }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stats/trios] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
