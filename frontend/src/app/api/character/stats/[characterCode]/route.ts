import { NextRequest, NextResponse } from "next/server";
import { getAllPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getCachedCharacterStats, type CharacterStatsResponse } from "@/lib/characterStats";

export type { CharacterStatsResponse, WeaponStatItem } from "@/lib/characterStats";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterCode: string }> }
) {
  const { characterCode: characterCodeStr } = await params;
  const characterCode = Number(characterCodeStr);

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ error: "Invalid characterCode" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = searchParams.get("patchVersion") ?? getAllPatchVersions()[0];

  try {
    const stats = await getCachedCharacterStats(characterCode, patchVersion, tier);
    if (!stats) {
      throw new Error("Failed to load cached character stats");
    }
    return NextResponse.json(stats satisfies CharacterStatsResponse, {
      headers: getCacheHeaders("daily"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[character/stats] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
