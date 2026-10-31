import { NextRequest, NextResponse } from "next/server";
import itemGradeMap from "@/../const/itemGradeMap.json";
import weaponItemTypeMap from "@/../const/weaponItemTypeMap.json";
import {
  buildEquipmentStats,
  type EquipmentRow,
  type EquipmentBuildResult,
} from "@/domain/equipmentStats";
import { getCacheHeaders } from "@/lib/cache";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { createServerClient } from "@/lib/supabase";
import { expandCumulativeTier } from "@/utils/tier";

const ITEM_GRADE = itemGradeMap as Record<string, string>;
const WEAPON_ITEM_TYPE = weaponItemTypeMap as Record<string, number>;

export const revalidate = 1800; // L1: 30분 서버 캐시

// 기존 타입 import 경로를 사용하는 UI와의 호환성을 유지한다.
export type {
  BuildSummary,
  SlotItem,
  CoreItem,
  EquipmentBuildResult,
} from "@/domain/equipmentStats";

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/builds/equipment");
  if (proxied) return proxied;

  const { searchParams } = new URL(request.url);
  const characterCode = Number(searchParams.get("characterCode"));
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = searchParams.get("patchVersion") ?? "";
  const mainCoreParam = searchParams.get("mainCore");
  const bestWeaponParam = searchParams.get("bestWeapon");
  const legendOnly = searchParams.get("legendOnly") === "1";

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json<EquipmentBuildResult>({
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    });
  }

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("v2_CharacterEquipmentBuildStats")
      .select("mainCore, weapon, chest, head, arm, leg, totalGames, totalWins, rankSum, totalRP")
      .eq("characterNum", characterCode)
      // 누적(+) tier: 요청 tier 와 그 위 모든 tier row 를 가져와 buildMap 으로 자동 합산.
      .in("tier", expandCumulativeTier(tier))
      .eq("patchVersion", patchVersion);

    if (mainCoreParam != null) {
      if (mainCoreParam === "null") {
        query = query.is("mainCore", null) as typeof query;
      } else {
        query = query.eq("mainCore", Number(mainCoreParam)) as typeof query;
      }
    }

    const { data, error } = await query
      .order("totalGames", { ascending: false })
      .limit(legendOnly ? 1000 : 200);

    if (error) {
      console.error("[builds/equipment] DB error:", error);
      return NextResponse.json<EquipmentBuildResult>({
        topBuilds: [],
        slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
        coreItems: [],
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json<EquipmentBuildResult>({
        topBuilds: [],
        slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
        coreItems: [],
      });
    }

    const result = buildEquipmentStats(data as EquipmentRow[], {
      patchVersion,
      tier,
      bestWeapon: bestWeaponParam == null ? null : Number(bestWeaponParam),
      legendOnly,
      itemGrades: ITEM_GRADE,
      weaponItemTypes: WEAPON_ITEM_TYPE,
    });

    // 필터 후 빈 결과는 기존과 같이 캐시 헤더 없이 반환한다.
    if (result.topBuilds.length === 0) {
      return NextResponse.json<EquipmentBuildResult>(result);
    }

    return NextResponse.json<EquipmentBuildResult>(result, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[builds/equipment] request failed:", message);
    return NextResponse.json<EquipmentBuildResult>({
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    });
  }
}
