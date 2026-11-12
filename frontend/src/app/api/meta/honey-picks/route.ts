import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { getCachedHoneyPicks } from "@/lib/honeyPicks";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { getUnsupportedPatchResponse } from "@/lib/server/publicPatchRequest";

export type { HoneyPickData, HoneyPicksResult } from "@/lib/honeyPicks";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedPatch = searchParams.get("patchVersion");
  const unsupportedPatch = getUnsupportedPatchResponse(requestedPatch);
  if (unsupportedPatch) return unsupportedPatch;

  const patchVersion = requestedPatch ?? (await getPatches())[0];
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

  try {
    if (patchVersion) {
      const proxied = await tryNestApiProxy(request, "/meta/honey-picks", patchVersion);
      if (proxied) return proxied;
    }
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
