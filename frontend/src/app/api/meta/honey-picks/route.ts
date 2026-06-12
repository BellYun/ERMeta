import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getCachedHoneyPicks } from "@/lib/honeyPicks";
import { tryNestApiProxy } from "@/lib/server/nestProxy";

export type { HoneyPickData, HoneyPicksResult } from "@/lib/honeyPicks";

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/meta/honey-picks");
  if (proxied) return proxied;

  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? getStatsPatchVersions()[0];
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  try {
    const result = await getCachedHoneyPicks(patchVersion, requestedTier);
    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[honey-picks] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
