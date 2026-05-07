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
const TRIO_WEAPON_SEARCH_P10_TABLE = "v2_CharacterTrioWeaponSearch_p10";

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

function searchRowKey(row: TrioWeaponSearchRow): string {
  return [
    row.ally1_char,
    row.ally1_weapon,
    row.ally1_core ?? 0,
    row.ally2_char,
    row.ally2_weapon,
    row.ally2_core ?? 0,
    row.third_char,
    row.third_weapon,
    row.third_core ?? 0,
  ].join("|");
}

function normalizeSelectedPair(
  char1: number,
  weapon1: number | null,
  char2: number,
  weapon2: number | null
) {
  if (char1 < char2) {
    return {
      ally1Char: char1,
      ally1Weapon: weapon1,
      ally2Char: char2,
      ally2Weapon: weapon2,
    };
  }

  return {
    ally1Char: char2,
    ally1Weapon: weapon2,
    ally2Char: char1,
    ally2Weapon: weapon1,
  };
}

function mapSearchRowToAggregated(row: TrioWeaponSearchRow): AggregatedTrioWeapon {
  return {
    character1: row.ally1_char,
    weaponType1: row.ally1_weapon,
    character2: row.ally2_char,
    weaponType2: row.ally2_weapon,
    character3: row.third_char,
    weaponType3: row.third_weapon,
    mainCore1: row.ally1_core,
    mainCore2: row.ally2_core,
    mainCore3: row.third_core,
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
    const rpRange = { min: Math.min(...rpValues), max: Math.max(...rpValues) };
    results.sort(
      (a, b) =>
        recommendedScore(b, globalAvgRP, rpRange) - recommendedScore(a, globalAvgRP, rpRange)
    );
    return;
  }

  results.sort((a, b) => {
    if (sortByParam === "averageRP") return b.averageRP - a.averageRP;
    if (sortByParam === "winRate") return b.winRate - a.winRate;
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
  if (limit > 1000) limit = 1000;

  try {
    const supabase = createServerClient();
    const select =
      "tier,character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,main_core1,main_core2,main_core3,total_games,total_wins,total_rp,rank_sum";

    if (char1 != null && char2 != null) {
      const normalized = normalizeSelectedPair(char1, weapon1, char2, weapon2);
      let searchQuery = supabase
        .from(TRIO_WEAPON_SEARCH_P10_TABLE)
        .select(
          "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum"
        )
        .eq("ally1_char", normalized.ally1Char)
        .eq("ally2_char", normalized.ally2Char)
        .order("total_games", { ascending: false })
        .limit(FULL_FETCH_LIMIT);

      if (normalized.ally1Weapon != null) {
        searchQuery = searchQuery.eq("ally1_weapon", normalized.ally1Weapon);
      }
      if (normalized.ally2Weapon != null) {
        searchQuery = searchQuery.eq("ally2_weapon", normalized.ally2Weapon);
      }

      const { data: searchRows, error: searchError } = await searchQuery;

      if (searchError) {
        console.error("[stats/trios-weapon] Supabase error:", searchError);
        return NextResponse.json(
          { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      const aggregated = aggregateSearchRows((searchRows ?? []) as TrioWeaponSearchRow[]);
      sortAggregatedResults(aggregated, sortByParam);

      return NextResponse.json(
        { results: aggregated.slice(0, limit) },
        { headers: getCacheHeaders("stats-long") }
      );
    }

    if (char1 != null) {
      // 단일 캐릭터 — p10 테이블에서 ally1/ally2/third 3 위치별 fetch 후 trio 단위 dedup
      const searchSelect =
        "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum";
      const p10Q = () =>
        supabase
          .from(TRIO_WEAPON_SEARCH_P10_TABLE)
          .select(searchSelect)
          .order("total_games", { ascending: false })
          .limit(PARALLEL_FETCH_LIMIT);
      const results = await Promise.all([
        p10Q().eq("ally1_char", char1),
        p10Q().eq("ally2_char", char1),
        p10Q().eq("third_char", char1),
      ]);
      const allSearchRows: TrioWeaponSearchRow[] = [];
      for (const r of results) {
        if (r.error) {
          console.error("[stats/trios-weapon] Supabase error:", r.error);
          return NextResponse.json(
            { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
        allSearchRows.push(...((r.data ?? []) as TrioWeaponSearchRow[]));
      }
      // dedup: 같은 trio가 ally1/ally2/third 3 위치에서 동시 매칭됨. 정렬된 (char, weapon, core) tuple을 키로.
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

      const aggregated = aggregateSearchRows(dedupedRows);

      // 무기 필터: char1 위치 weapon이 weapon1과 일치
      const filtered = aggregated.filter((row) => {
        if (
          EXCLUDED_CHARACTER_CODES.has(row.character1) ||
          EXCLUDED_CHARACTER_CODES.has(row.character2) ||
          EXCLUDED_CHARACTER_CODES.has(row.character3)
        )
          return false;
        if (weapon1 != null) {
          const matched =
            (row.character1 === char1 && row.weaponType1 === weapon1) ||
            (row.character2 === char1 && row.weaponType2 === weapon1) ||
            (row.character3 === char1 && row.weaponType3 === weapon1);
          if (!matched) return false;
        }
        return true;
      });

      sortAggregatedResults(filtered, sortByParam);
      return NextResponse.json(
        { results: filtered.slice(0, limit) },
        { headers: getCacheHeaders("stats-long") }
      );
    }

    const baseQuery = (perQueryLimit: number) =>
      supabase
        .from("v2_CharacterTrioWeapon")
        .select(select)
        .in("tier", DIAMOND_PLUS_TIERS)
        .order("total_games", { ascending: false })
        .limit(perQueryLimit);

    let rows: TrioWeaponRow[] = [];

    {
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
    sortAggregatedResults(aggregated, sortByParam);

    return NextResponse.json(
      { results: aggregated.slice(0, limit) },
      { headers: getCacheHeaders("stats-long") }
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
