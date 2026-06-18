import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 3600; // L1: 1시간 서버 캐시

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/patches/history");
  if (proxied) return proxied;

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
      .limit(limit);

    if (!includeInactive) {
      query = query.eq("isActive", true);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const patches = data.map((p) => p.version);
      const latestStartDate = (data[0] as { startDate?: string }).startDate ?? null;
      return NextResponse.json({ patches, latestStartDate }, { headers: getCacheHeaders("slow") });
    }

    // 2차 fallback: CharacterStats에서 distinct patchVersion
    const { data: statsData, error: statsError } = await supabase
      .from("v2_CharacterStats")
      .select("patchVersion");

    if (statsError) {
      console.error("[patches/history] fallback failed:", statsError);
      return NextResponse.json({ patches: [] });
    }

    const patches = [...new Set((statsData ?? []).map((r) => r.patchVersion as string))]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
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
