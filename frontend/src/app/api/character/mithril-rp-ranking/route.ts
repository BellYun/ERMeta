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

function selectRankings(
  data: (StatRow & { tier: string })[],
  requestedTier: string
): { rankings: CharacterRankingData[]; usedTier: string } {
  const tierOrder = [
    requestedTier,
    ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
  ];

  for (const tier of tierOrder) {
    const rows = data.filter((r) => r.tier === tier);
    if (rows.length > 0) {
      return { rankings: buildRankings(rows), usedTier: tier };
    }
  }

  return { rankings: [], usedTier: requestedTier };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? "10.4";
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  console.log("[mithril-rp-ranking] params:", { patchVersion, requestedTier });

  try {
    const supabase = createServerClient();

    // 이전 패치 버전 조회
    const { data: patches } = await supabase
      .from("PatchVersion")
      .select("version")
      .order("startDate", { ascending: false })
      .limit(50);

    const patchList = (patches ?? []).map((p: { version: string }) => p.version);
    const currentIndex = patchList.indexOf(patchVersion);
    const previousPatch = currentIndex >= 0 && currentIndex + 1 < patchList.length
      ? patchList[currentIndex + 1]
      : null;

    // 현재 + 이전 패치 데이터를 한번에 조회
    const patchVersions = previousPatch
      ? [patchVersion, previousPatch]
      : [patchVersion];

    const { data, error } = await supabase
      .from("CharacterStats")
      .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier,patchVersion")
      .in("patchVersion", patchVersions)
      .in("tier", TIER_FALLBACK_ORDER);

    if (error || !data) {
      return NextResponse.json({ rankings: [], previousRankings: [], patchVersion, previousPatch: null, tier: requestedTier });
    }

    const typedData = data as (StatRow & { tier: string; patchVersion: string })[];
    const currentData = typedData.filter((r) => r.patchVersion === patchVersion);
    const prevData = previousPatch
      ? typedData.filter((r) => r.patchVersion === previousPatch)
      : [];

    const { rankings, usedTier } = selectRankings(currentData, requestedTier);
    const { rankings: previousRankings } = prevData.length > 0
      ? selectRankings(prevData, usedTier)
      : { rankings: [] };

    console.log("[mithril-rp-ranking] 최종 응답:", {
      usedTier,
      patchVersion,
      previousPatch,
      rankingCount: rankings.length,
      previousRankingCount: previousRankings.length,
    });

    return NextResponse.json({
      rankings,
      previousRankings,
      patchVersion,
      previousPatch,
      tier: usedTier,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mithril-rp-ranking] 예외:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
