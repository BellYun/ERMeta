import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { getCachedCharacterStats, type CharacterStatsResponse } from "@/lib/characterStats";
import { DEFAULT_CHARACTER_ANALYSIS_TIER } from "@/lib/characterTier";
import { getPatches } from "@/lib/getPatches";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { getUnsupportedPatchResponse } from "@/lib/server/publicPatchRequest";

export type { CharacterStatsResponse, WeaponStatItem } from "@/lib/characterStats";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterCode: string }> }
) {
  const { characterCode: characterCodeStr } = await params;
  const { searchParams } = request.nextUrl;
  const requestedPatch = searchParams.get("patchVersion");
  const unsupportedPatch = getUnsupportedPatchResponse(requestedPatch);
  if (unsupportedPatch) return unsupportedPatch;

  const characterCode = Number(characterCodeStr);

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ error: "Invalid characterCode" }, { status: 400 });
  }

  const tier = searchParams.get("tier") ?? DEFAULT_CHARACTER_ANALYSIS_TIER;
  const patchVersion = requestedPatch ?? (await getPatches())[0];

  try {
    if (patchVersion) {
      const proxied = await tryNestApiProxy(
        request,
        `/character/stats/${characterCodeStr}`,
        patchVersion
      );
      if (proxied) return proxied;
    }
    const t0 = Date.now();
    const stats = await getCachedCharacterStats(characterCode, patchVersion, tier);
    const latencyMs = Date.now() - t0;
    if (!stats) {
      throw new Error("Failed to load cached character stats");
    }
    return NextResponse.json(stats satisfies CharacterStatsResponse, {
      headers: withCacheObservability(getCacheHeaders("character-stats"), latencyMs),
    });
  } catch (err) {
    console.error("[character/stats] request failed:", err);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
