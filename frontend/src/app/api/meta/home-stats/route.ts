import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latestPatch = (await getPatches())[0] ?? "";
  const patchVersion = searchParams.get("patchVersion") ?? latestPatch;

  if (!patchVersion) {
    return NextResponse.json(
      { patchVersion: "", previousPatch: null, rows: [] },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const result = await getCachedHomeMetaStats(patchVersion);
    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[home-stats] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
