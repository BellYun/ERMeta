import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";

export const revalidate = 3600; // L1: 1시간 서버 캐시

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);
  const includeInactive = searchParams.get("includeInactive") === "true";

  console.log("[patches/history] params:", { limit, includeInactive });

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

    console.log("[patches/history] PatchVersion 조회 결과:", { data, error });

    if (!error && data && data.length > 0) {
      const patches = data.map((p) => p.version);
      console.log("[patches/history] 응답 (PatchVersion):", patches);
      return NextResponse.json({ patches }, { headers: getCacheHeaders("slow") });
    }

    // 2차 fallback: CharacterStats에서 distinct patchVersion
    console.log("[patches/history] PatchVersion 결과 없음 → CharacterStats fallback");
    const { data: statsData, error: statsError } = await supabase
      .from("v2_CharacterStats")
      .select("patchVersion");

    console.log("[patches/history] CharacterStats fallback 결과:", {
      rowCount: statsData?.length ?? 0,
      error: statsError,
    });

    if (statsError) {
      console.error("[patches/history] fallback 실패:", statsError);
      return NextResponse.json({ patches: [] });
    }

    const patches = [
      ...new Set((statsData ?? []).map((r) => r.patchVersion as string)),
    ]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .slice(0, limit);

    console.log("[patches/history] 응답 (fallback):", patches);
    return NextResponse.json({ patches }, { headers: getCacheHeaders("slow") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[patches/history] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
