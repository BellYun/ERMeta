import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";
import { tryNestApiProxy } from "@/lib/server/nestProxy";

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/meta/home-stats");
  if (proxied) return proxied;

  try {
    const { searchParams } = new URL(request.url);
    const latestPatch = (await getPatches())[0] ?? "";
    const patchVersion = searchParams.get("patchVersion") ?? latestPatch;

    if (!patchVersion) {
      return NextResponse.json(
        { patchVersion: "", previousPatch: null, rows: [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

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
