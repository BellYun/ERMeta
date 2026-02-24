import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { TierGroup } from "@/utils/tier";

export const dynamic = "force-dynamic";

// 다이아 이상 티어 전체
const DIAMOND_PLUS_TIERS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
];

type SortBy = "averageRP" | "winRate" | "totalGames";

interface TrioRow {
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
    averageRP: v.totalGames > 0 ? v.avgRPWeighted / v.totalGames : 0,
    averageRank: v.totalGames > 0 ? v.avgRankWeighted / v.totalGames : 0,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sortByParam = (searchParams.get("sortBy") ?? "totalGames") as SortBy;
  const limitParam = searchParams.get("limit");
  const char1Param = searchParams.get("character1");
  const char2Param = searchParams.get("character2");

  // character 코드 파싱
  const char1 = char1Param !== null ? parseInt(char1Param, 10) : null;
  const char2 = char2Param !== null ? parseInt(char2Param, 10) : null;

  // character2만 단독 전달 금지
  if (char2 !== null && char1 === null) {
    return NextResponse.json(
      { error: "character2는 character1 없이 사용할 수 없습니다." },
      { status: 400 }
    );
  }

  // 동일 캐릭터 금지
  if (char1 !== null && char2 !== null && char1 === char2) {
    return NextResponse.json(
      { error: "character1과 character2는 달라야 합니다." },
      { status: 400 }
    );
  }

  // limit 보정 (1~200, 기본 100)
  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 200) limit = 200;

  try {
    const supabase = createServerClient();

    // 다이아 이상 전 티어를 한 번에 조회 (집계 후 정렬을 위해 DB 정렬/limit 미적용)
    let query = supabase
      .from("CharacterTrio")
      .select("character1,character2,character3,winRate,averageRP,totalGames,averageRank")
      .in("tier", DIAMOND_PLUS_TIERS)
      .limit(5000); // 집계 전 최대 수집 행수

    if (char1 !== null && char2 !== null) {
      // 2명 선택: 오름차순 정렬 후 character1/character2 고정 조회
      const [low, high] = [char1, char2].sort((a, b) => a - b);
      query = query.eq("character1", low).eq("character2", high);
    } else if (char1 !== null) {
      // 1명 선택: 3개 컬럼 OR 조회
      query = query.or(
        `character1.eq.${char1},character2.eq.${char1},character3.eq.${char1}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[stats/trios] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 티어 간 집계 (가중 평균)
    const aggregated = aggregateByTrio((data ?? []) as TrioRow[]);

    // 집계 후 정렬
    aggregated.sort((a, b) => {
      if (sortByParam === "averageRP") return b.averageRP - a.averageRP;
      if (sortByParam === "winRate") return b.winRate - a.winRate;
      return b.totalGames - a.totalGames; // totalGames (기본)
    });

    return NextResponse.json({ results: aggregated.slice(0, limit) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stats/trios] 예외:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
