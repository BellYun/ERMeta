import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { getCachedHoneyPicks } from "@/lib/honeyPicks";
import { tryNestApiProxy } from "@/lib/server/nestProxy";

export type { HoneyPickData, HoneyPicksResult } from "@/lib/honeyPicks";

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/meta/honey-picks");
  if (proxied) return proxied;

  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? (await getPatches())[0];
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  try {
    const result = await getCachedHoneyPicks(patchVersion, requestedTier);
    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[honey-picks] request failed:", message);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
