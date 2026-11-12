import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { comparePatchVersionsDescending, isPublicPatchVersion } from "@/lib/publicPatchVersion";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 3600; // L1: 1시간 서버 캐시

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);
  const includeInactive = searchParams.get("includeInactive") === "true";

  try {
    const supabase = createServerClient();

    // 1차: PatchVersion 테이블 조회
    let query = supabase
      .from("PatchVersion")
      .select("version,startDate,isActive")
      .order("startDate", { ascending: false })
      .limit(50);

    if (!includeInactive) {
      query = query.eq("isActive", true);
    }

    const { data, error } = await query;
    const publicPatches = (data ?? []).filter((patch) => isPublicPatchVersion(patch.version));

    if (!error && publicPatches.length > 0) {
      const patches = publicPatches.slice(0, limit).map((patch) => patch.version);
      const latestStartDate = publicPatches[0].startDate ?? null;
      return NextResponse.json({ patches, latestStartDate }, { headers: getCacheHeaders("slow") });
    }

    // 2차 fallback: CharacterStats에서 distinct patchVersion
    const { data: statsData, error: statsError } = await supabase
      .from("v2_CharacterStats")
      .select("patchVersion")
      .in("patchVersion", getStatsPatchVersions());

    if (statsError) {
      console.error("[patches/history] fallback failed:", statsError);
      return NextResponse.json({ patches: [] });
    }

    const patches = [...new Set((statsData ?? []).map((r) => r.patchVersion as string))]
      .filter(isPublicPatchVersion)
      .sort(comparePatchVersionsDescending)
      .slice(0, limit);

    return NextResponse.json({ patches }, { headers: getCacheHeaders("slow") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[patches/history] request failed:", message);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
