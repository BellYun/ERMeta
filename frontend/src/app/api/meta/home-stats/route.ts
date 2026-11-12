import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { getUnsupportedPatchResponse } from "@/lib/server/publicPatchRequest";

export async function GET(request: NextRequest) {
  const requestedPatch = request.nextUrl.searchParams.get("patchVersion");
  const unsupportedPatch = getUnsupportedPatchResponse(requestedPatch);
  if (unsupportedPatch) return unsupportedPatch;

  try {
    const patchVersion = requestedPatch ?? (await getPatches())[0];

    if (!patchVersion) {
      return NextResponse.json(
        { patchVersion: "", previousPatch: null, rows: [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const proxied = await tryNestApiProxy(request, "/meta/home-stats", patchVersion);
    if (proxied) return proxied;

    const result = await getCachedHomeMetaStats(patchVersion);
    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[home-stats] request failed:", message);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
