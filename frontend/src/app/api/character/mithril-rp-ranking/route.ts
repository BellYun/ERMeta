import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";


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
  const patchVersion = searchParams.get("patchVersion") ?? "10.4";
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  console.log("[mithril-rp-ranking] params:", { patchVersion, requestedTier });

  try {
    const supabase = createServerClient();

    // 모든 tier를 단일 쿼리로 조회 후 JS에서 우선순위 선택 (최대 4회 → 1회)
    const { data, error } = await supabase
      .from("CharacterStats")
      .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier")
      .eq("patchVersion", patchVersion)
      .in("tier", TIER_FALLBACK_ORDER);

    if (error || !data) {
      return NextResponse.json({ rankings: [], patchVersion, tier: requestedTier });
    }

    const tierOrder = [
      requestedTier,
      ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
    ];

    let rankings: CharacterRankingData[] = [];
    let usedTier = requestedTier;

    for (const tier of tierOrder) {
      const rows = (data as (StatRow & { tier: string })[]).filter((r) => r.tier === tier);
      if (rows.length > 0) {
        rankings = buildRankings(rows);
        usedTier = tier;
        break;
      }
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
