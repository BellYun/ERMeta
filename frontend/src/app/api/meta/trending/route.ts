import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface StatRow {
  characterNum: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
}

interface CharacterAggregate {
  characterNum: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
}

export interface CharacterTrend {
  characterNum: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  trendScore: number;
}

function aggregateByCharacter(rows: StatRow[]): CharacterAggregate[] {
  const map = new Map<
    number,
    { totalGames: number; totalWins: number; totalRP: number }
  >();
  let grandTotal = 0;

  for (const row of rows) {
    const cur = map.get(row.characterNum) ?? {
      totalGames: 0,
      totalWins: 0,
      totalRP: 0,
    };
    cur.totalGames += row.totalGames ?? 0;
    cur.totalWins += row.totalWins ?? 0;
    cur.totalRP += row.totalRP ?? 0;
    map.set(row.characterNum, cur);
    grandTotal += row.totalGames ?? 0;
  }

  const result: CharacterAggregate[] = [];
  for (const [characterNum, stats] of map.entries()) {
    result.push({
      characterNum,
      totalGames: stats.totalGames,
      pickRate: grandTotal > 0 ? (stats.totalGames / grandTotal) * 100 : 0,
      winRate:
        stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0,
      averageRP: stats.totalGames > 0 ? stats.totalRP / stats.totalGames : 0,
    });
  }
  return result;
}

async function fetchPatchStats(
  supabase: ReturnType<typeof import("@/lib/supabase").createServerClient>,
  patchVersion: string,
  tier: string
): Promise<CharacterAggregate[]> {
  console.log(`[trending] CharacterStats 조회: patchVersion=${patchVersion}, tier=${tier}`);

  const { data, error } = await supabase
    .from("CharacterStats")
    .select("characterNum,totalGames,totalWins,totalRP,totalTop3")
    .eq("patchVersion", patchVersion)
    .eq("tier", tier);

  console.log(`[trending] CharacterStats 결과 (patch=${patchVersion}, tier=${tier}):`, {
    rowCount: data?.length ?? 0,
    error,
    sample: data?.slice(0, 3),
  });

  if (error || !data) return [];
  return aggregateByCharacter(data as StatRow[]);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const currentPatch = searchParams.get("currentPatch") ?? "10.3";
  const previousPatch = searchParams.get("previousPatch") ?? "10.2";
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const limit = Math.min(Number(searchParams.get("limit") ?? "4"), 20);

  console.log("[trending] params:", { currentPatch, previousPatch, tier, limit });

  try {
    const supabase = createServerClient();

    const [currentStats, previousStats] = await Promise.all([
      fetchPatchStats(supabase, currentPatch, tier),
      fetchPatchStats(supabase, previousPatch, tier),
    ]);

    console.log("[trending] 집계 결과:", {
      currentCharCount: currentStats.length,
      previousCharCount: previousStats.length,
    });

    const previousMap = new Map(
      previousStats.map((c) => [c.characterNum, c])
    );

    const trends: CharacterTrend[] = currentStats.map((cur) => {
      const prev = previousMap.get(cur.characterNum);
      const trendScore = cur.averageRP - (prev?.averageRP ?? 0);
      return {
        characterNum: cur.characterNum,
        pickRate: cur.pickRate,
        winRate: cur.winRate,
        averageRP: cur.averageRP,
        trendScore,
      };
    });

    trends.sort((a, b) => b.trendScore - a.trendScore);

    const rising = trends.slice(0, limit);
    const falling = [...trends].reverse().slice(0, limit);

    console.log("[trending] rising:", rising);
    console.log("[trending] falling:", falling);

    return NextResponse.json({ rising, falling });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[trending] 예외:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
