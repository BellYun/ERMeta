import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";

export const revalidate = 1800; // L1: 30분 서버 캐시

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];

interface StatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  tier: string;
  patchVersion: string;
}

export interface HoneyPickData {
  characterNum: number;
  bestWeapon: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  pickRateDelta: number;
  winRateDelta: number;
  averageRPDelta: number;
  honeyScore: number;
}

interface ComputedRate {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
}

function computeRates(rows: StatRow[]): ComputedRate[] {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
  return rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
  }));
}

function selectTierRows(
  data: StatRow[],
  requestedTier: string
): { rows: StatRow[]; usedTier: string } {
  const tierOrder = [
    requestedTier,
    ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
  ];
  for (const tier of tierOrder) {
    const rows = data.filter((r) => r.tier === tier);
    if (rows.length > 0) return { rows, usedTier: tier };
  }
  return { rows: [], usedTier: requestedTier };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? "10.5";
  const requestedTier = searchParams.get("tier") ?? "MITHRIL";

  try {
    const supabase = createServerClient();

    // 패치 목록 조회
    const { data: patches } = await supabase
      .from("PatchVersion")
      .select("version")
      .order("startDate", { ascending: false })
      .limit(50);

    const patchList = (patches ?? []).map((p: { version: string }) => p.version);
    const currentIndex = patchList.indexOf(patchVersion);
    const previousPatch =
      currentIndex >= 0 && currentIndex + 1 < patchList.length
        ? patchList[currentIndex + 1]
        : null;

    if (!previousPatch) {
      return NextResponse.json({
        picks: [],
        patchVersion,
        previousPatch: null,
        tier: requestedTier,
      });
    }

    // 현재 + 이전 패치 데이터 조회 (v2 → old fallback)
    const selectCols = "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,tier,patchVersion"
    let { data, error } = await supabase
      .from("v2_CharacterStats")
      .select(selectCols)
      .in("patchVersion", [patchVersion, previousPatch])
      .in("tier", TIER_FALLBACK_ORDER);

    // v2에 이전 패치 데이터 없으면 old 테이블 fallback
    if (data && previousPatch) {
      const hasV2Prev = data.some((r: { patchVersion: string }) => r.patchVersion === previousPatch)
      if (!hasV2Prev) {
        const { data: oldData } = await supabase
          .from("CharacterStats")
          .select(selectCols)
          .eq("patchVersion", previousPatch)
          .in("tier", TIER_FALLBACK_ORDER);
        if (oldData && oldData.length > 0) {
          data = [...data, ...oldData];
        }
      }
    }

    if (error || !data) {
      return NextResponse.json({
        picks: [],
        patchVersion,
        previousPatch,
        tier: requestedTier,
      });
    }

    const typedData = data as StatRow[];
    const currentData = typedData.filter((r) => r.patchVersion === patchVersion);
    const prevData = typedData.filter((r) => r.patchVersion === previousPatch);

    const { rows: currentRows, usedTier } = selectTierRows(currentData, requestedTier);
    const { rows: prevRows } = selectTierRows(prevData, usedTier);

    if (currentRows.length === 0 || prevRows.length === 0) {
      return NextResponse.json({
        picks: [],
        patchVersion,
        previousPatch,
        tier: usedTier,
      });
    }

    const currentRates = computeRates(currentRows);
    const prevRates = computeRates(prevRows);

    // 이전 패치 데이터를 characterNum 기준 Map
    const prevMap = new Map(prevRates.map((r) => [r.characterNum, r]));

    // 꿀챔 필터: 픽률 ↑ AND 승률 ↑
    const honeyPicks: HoneyPickData[] = [];
    for (const curr of currentRates) {
      const prev = prevMap.get(curr.characterNum);
      if (!prev) continue;

      const pickRateDelta = curr.pickRate - prev.pickRate;
      const winRateDelta = curr.winRate - prev.winRate;

      // 픽률과 승률 모두 상승한 캐릭터만
      if (pickRateDelta > 0 && winRateDelta > 0) {
        // 꿀챔 점수: 픽률 상승폭 × 승률 상승폭 + 평균 RP 보너스
        const rpBonus = curr.averageRP > 0 ? 1 + curr.averageRP / 100 : 1;
        honeyPicks.push({
          characterNum: curr.characterNum,
          bestWeapon: curr.bestWeapon,
          pickRate: curr.pickRate,
          winRate: curr.winRate,
          averageRP: curr.averageRP,
          pickRateDelta,
          winRateDelta,
          averageRPDelta: curr.averageRP - prev.averageRP,
          honeyScore: pickRateDelta * winRateDelta * rpBonus,
        });
      }
    }

    // honeyScore 내림차순 정렬, 상위 5개
    honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);
    const top5 = honeyPicks.slice(0, 5);

    return NextResponse.json({
      picks: top5,
      patchVersion,
      previousPatch,
      tier: usedTier,
    }, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[honey-picks] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
