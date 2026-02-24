import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];

interface StatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

export interface CharacterRankingData {
  rank: number;
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  top3Rate: number;
}

async function fetchRankingStats(
  supabase: ReturnType<typeof import("@/lib/supabase").createServerClient>,
  patchVersion: string,
  tier: string
): Promise<StatRow[]> {
  console.log(`[mithril-rp-ranking] CharacterStats 조회: patchVersion=${patchVersion}, tier=${tier}`);

  const { data, error } = await supabase
    .from("CharacterStats")
    .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank")
    .eq("patchVersion", patchVersion)
    .eq("tier", tier);

  console.log(`[mithril-rp-ranking] 결과 (patch=${patchVersion}, tier=${tier}):`, {
    rowCount: data?.length ?? 0,
    error,
    sample: data?.slice(0, 3),
  });

  if (error || !data) return [];
  return data as StatRow[];
}

function buildRankings(rows: StatRow[]): CharacterRankingData[] {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);

  const rankings = rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
    top3Rate: r.totalGames > 0 ? ((r.totalTop3 ?? 0) / r.totalGames) * 100 : 0,
  }));

  rankings.sort((a, b) => b.averageRP - a.averageRP);

  return rankings.map((c, i) => ({ rank: i + 1, ...c }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? "10.3";
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  console.log("[mithril-rp-ranking] params:", { patchVersion, requestedTier });

  try {
    const supabase = createServerClient();

    const tierOrder = [
      requestedTier,
      ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
    ];

    let rankings: CharacterRankingData[] = [];
    let usedTier = requestedTier;

    for (const tier of tierOrder) {
      const rows = await fetchRankingStats(supabase, patchVersion, tier);
      if (rows.length > 0) {
        rankings = buildRankings(rows);
        usedTier = tier;
        console.log(`[mithril-rp-ranking] 데이터 확인 (tier=${tier}), 조합 수:`, rankings.length);
        break;
      }
      console.log(`[mithril-rp-ranking] tier=${tier} 데이터 없음, 다음 fallback 시도`);
    }

    console.log("[mithril-rp-ranking] 최종 응답:", {
      usedTier,
      patchVersion,
      rankingCount: rankings.length,
      top3: rankings.slice(0, 3),
    });

    return NextResponse.json({ rankings, patchVersion, tier: usedTier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mithril-rp-ranking] 예외:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
