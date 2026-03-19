import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { fetchRankingData } from "@/lib/ranking";

export type { CharacterRankingData } from "@/lib/ranking";

export const revalidate = 1800; // L1: 30분 서버 캐시

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? "10.5";
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  console.log("[mithril-rp-ranking] params:", { patchVersion, requestedTier });

  try {
    const result = await fetchRankingData(patchVersion, requestedTier);

    console.log("[mithril-rp-ranking] 최종 응답:", {
      usedTier: result.tier,
      patchVersion: result.patchVersion,
      previousPatch: result.previousPatch,
      rankingCount: result.rankings.length,
      previousRankingCount: result.previousRankings.length,
    });

    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mithril-rp-ranking] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
