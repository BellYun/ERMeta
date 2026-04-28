import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { fetchRankingData } from "@/lib/ranking";

export type { CharacterRankingData } from "@/lib/ranking";

export const revalidate = 1800; // L1: 30분 서버 캐시

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latestPatch = (await getPatches())[0] ?? "";
  const patchVersion = searchParams.get("patchVersion") ?? latestPatch;
  const requestedTier = searchParams.get("tier") ?? "MITHRIL";

  if (!patchVersion) {
    return NextResponse.json(
      {
        rankings: [],
        previousRankings: [],
        patchVersion: "",
        previousPatch: null,
        tier: requestedTier,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const result = await fetchRankingData(patchVersion, requestedTier);

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
