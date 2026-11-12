import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders } from "@/lib/cache";
import { getPatches } from "@/lib/getPatches";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { getUnsupportedPatchResponse } from "@/lib/server/publicPatchRequest";
import { createServerClient } from "@/lib/supabase";
import { buildTraitMainGroups } from "@/lib/traitBuildStats";
import { expandCumulativeTier } from "@/utils/tier";

export const revalidate = 1800; // L1: 30분 서버 캐시

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type { TraitMainGroup, TraitSecondaryInfo, TraitSubOption } from "@/lib/traitBuildStats";

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedPatch = searchParams.get("patchVersion");
  const unsupportedPatch = getUnsupportedPatchResponse(requestedPatch);
  if (unsupportedPatch) return unsupportedPatch;

  const proxied = await tryNestApiProxy(request, "/builds/traits/main");
  if (proxied) return proxied;

  const characterCode = Number(searchParams.get("characterCode"));
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = requestedPatch ?? (await getPatches())[0];
  const bestWeapon = searchParams.get("bestWeapon");

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ builds: [] });
  }

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("v2_CharacterTraitBuildStats")
      .select("*")
      .eq("characterNum", characterCode)
      .eq("patchVersion", patchVersion)
      // 누적(+) tier: 후처리에서 mainGroup/secGroup/option 별로 합산되므로
      // .in 만으로 multiple tier rows 자동 통합.
      .in("tier", expandCumulativeTier(tier))
      .order("totalGames", { ascending: false });

    if (bestWeapon) {
      query = query.eq("bestWeapon", Number(bestWeapon));
    }

    const { data, error } = await query;

    if (error) {
      console.error("[builds/traits/main] DB error:", error);
      return NextResponse.json({ builds: [] });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ builds: [] });
    }

    return NextResponse.json(
      { builds: buildTraitMainGroups(data) },
      { headers: getCacheHeaders("daily") }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[builds/traits/main] request failed:", message);
    return NextResponse.json({ builds: [] });
  }
}
