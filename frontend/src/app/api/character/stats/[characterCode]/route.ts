import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { getCachedCharacterStats, type CharacterStatsResponse } from "@/lib/characterStats";
import { tryNestApiProxy } from "@/lib/server/nestProxy";

export type { CharacterStatsResponse, WeaponStatItem } from "@/lib/characterStats";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterCode: string }> }
) {
  const { characterCode: characterCodeStr } = await params;
  const proxied = await tryNestApiProxy(request, `/character/stats/${characterCodeStr}`);
  if (proxied) return proxied;

  const characterCode = Number(characterCodeStr);

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ error: "Invalid characterCode" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = searchParams.get("patchVersion") ?? getStatsPatchVersions()[0];

  try {
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
    console.error("[character/stats] 예외:", err);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
