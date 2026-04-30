import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";
import { TierGroup } from "@/utils/tier";

export const revalidate = 3600;

const DIAMOND_PLUS_TIERS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
];
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);

// .or() 한 번에 character1/2/3 세 컬럼 OR 절을 던지면 인기 캐릭(예: 자히르=1)에서
// PostgREST statement_timeout(~3s) 초과 → 500. 컬럼당 단일 인덱스만 쓰는 .eq() 3쿼리
// Promise.all 병렬로 분해하여 각 쿼리는 인덱스 1개만 타도록 한다.
const PARALLEL_FETCH_LIMIT = 2000;
const FULL_FETCH_LIMIT = 5000;

type SortBy = "averageRP" | "winRate" | "totalGames" | "recommended";

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
    const key = `${row.character1}-${row.weapon_type1}-${row.character2}-${row.weapon_type2}-${row.character3}-${row.weapon_type3}-${row.main_core1 ?? 0}-${row.main_core2 ?? 0}-${row.main_core3 ?? 0}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        c1: row.character1,
        w1: row.weapon_type1,
        c2: row.character2,
        w2: row.weapon_type2,
        c3: row.character3,
        w3: row.weapon_type3,
        mc1: row.main_core1,
        mc2: row.main_core2,
        mc3: row.main_core3,
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

function rowKey(row: TrioWeaponRow): string {
  return `${row.tier}|${row.character1}|${row.weapon_type1}|${row.character2}|${row.weapon_type2}|${row.character3}|${row.weapon_type3}|${row.main_core1 ?? "n"}|${row.main_core2 ?? "n"}|${row.main_core3 ?? "n"}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortByParam = (searchParams.get("sortBy") ?? "recommended") as SortBy;
  const limitParam = searchParams.get("limit");

  const char1 = parseIntOrNull(searchParams.get("character1"));
  const char2 = parseIntOrNull(searchParams.get("character2"));
  const weapon1 = parseIntOrNull(searchParams.get("weapon1"));
  const weapon2 = parseIntOrNull(searchParams.get("weapon2"));

  if (char2 != null && char1 == null) {
    return NextResponse.json(
      { error: "character2는 character1 없이 사용할 수 없습니다." },
      { status: 400 }
    );
  }
  if (char1 != null && char2 != null && char1 === char2) {
    return NextResponse.json(
      { error: "character1과 character2는 달라야 합니다." },
      { status: 400 }
    );
  }
  if (
    (char1 != null && EXCLUDED_CHARACTER_CODES.has(char1)) ||
    (char2 != null && EXCLUDED_CHARACTER_CODES.has(char2))
  ) {
    return NextResponse.json({ results: [] });
  }

  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 200) limit = 200;

  try {
    const supabase = createServerClient();
    const select =
      "tier,character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,main_core1,main_core2,main_core3,total_games,total_wins,total_rp,rank_sum";

    const baseQuery = (perQueryLimit: number) =>
      supabase
        .from("v2_CharacterTrioWeapon")
        .select(select)
        .in("tier", DIAMOND_PLUS_TIERS)
        .order("total_games", { ascending: false })
        .limit(perQueryLimit);

    let rows: TrioWeaponRow[] = [];

    if (char1 != null && char2 != null) {
      const [low, high] = [char1, char2].sort((a, b) => a - b);
      const results = await Promise.all([
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character1", low).eq("character2", high),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character1", low).eq("character3", high),
        baseQuery(PARALLEL_FETCH_LIMIT).eq("character2", low).eq("character3", high),
      ]);
      for (const r of results) {
        if (r.error) {
          console.error("[stats/trios-weapon] Supabase error:", r.error);
          return NextResponse.json(
            { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
        rows.push(...((r.data ?? []) as TrioWeaponRow[]));
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
          console.error("[stats/trios-weapon] Supabase error:", r.error);
          return NextResponse.json(
            { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
        rows.push(...((r.data ?? []) as TrioWeaponRow[]));
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
        console.error("[stats/trios-weapon] Supabase error:", error);
        return NextResponse.json(
          { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }
      rows = (data ?? []) as TrioWeaponRow[];
    }

    // 무기 필터 (JS-side): 선택된 캐릭터의 무기 타입 매칭
    const filteredRows = rows.filter((row) => {
      if (
        EXCLUDED_CHARACTER_CODES.has(row.character1) ||
        EXCLUDED_CHARACTER_CODES.has(row.character2) ||
        EXCLUDED_CHARACTER_CODES.has(row.character3)
      )
        return false;

      if (char1 != null && weapon1 != null) {
        const matched =
          (row.character1 === char1 && row.weapon_type1 === weapon1) ||
          (row.character2 === char1 && row.weapon_type2 === weapon1) ||
          (row.character3 === char1 && row.weapon_type3 === weapon1);
        if (!matched) return false;
      }
      if (char2 != null && weapon2 != null) {
        const matched =
          (row.character1 === char2 && row.weapon_type1 === weapon2) ||
          (row.character2 === char2 && row.weapon_type2 === weapon2) ||
          (row.character3 === char2 && row.weapon_type3 === weapon2);
        if (!matched) return false;
      }

      return true;
    });

    const aggregated = aggregateByTrioWeapon(filteredRows);

    if (sortByParam === "recommended") {
      const globalAvgRP =
        aggregated.length > 0
          ? aggregated.reduce((sum, r) => sum + r.averageRP, 0) / aggregated.length
          : 0;
      const rpValues = aggregated.map((r) => r.averageRP);
      const rpRange = { min: Math.min(...rpValues), max: Math.max(...rpValues) };
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
    console.error("[stats/trios-weapon] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
