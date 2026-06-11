import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { getCachedCharacterStats, type CharacterStatsResponse } from "@/lib/characterStats";

interface CharacterStatsHistoryResponse {
  characterCode: number;
  tier: string;
  patches: string[];
  stats: Array<CharacterStatsResponse | null>;
}

function parseRequestedPatches(raw: string | null): string[] {
  const allowed = new Set(getStatsPatchVersions());
  if (!raw) return getStatsPatchVersions();

  const requested = Array.from(
    new Set(
      raw
        .split(",")
        .map((patch) => patch.trim())
        .filter((patch) => allowed.has(patch))
    )
  );

  return requested.length > 0 ? requested : getStatsPatchVersions();
}

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
  const patches = parseRequestedPatches(searchParams.get("patchVersions"));

  try {
    const t0 = Date.now();
    const stats = await Promise.all(
      patches.map((patchVersion) => getCachedCharacterStats(characterCode, patchVersion, tier))
    );
    const latencyMs = Date.now() - t0;

    return NextResponse.json(
      {
        characterCode,
        tier,
        patches,
        stats,
      } satisfies CharacterStatsHistoryResponse,
      {
        headers: withCacheObservability(getCacheHeaders("character-stats"), latencyMs),
      }
    );
  } catch (err) {
    console.error("[character/stats-history] 예외:", err);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
