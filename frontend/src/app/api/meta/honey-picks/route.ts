import { NextRequest, NextResponse } from "next/server";
import { getAllPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 1800; // L1: 30분 서버 캐시

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];

// 비교 대상에서 제외할 패치 (시즌 종료 직전 패치 등 표본/메타가 왜곡된 패치)
const SKIP_COMPARISON_PATCHES = new Set(["11.0"]);

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
  const tierOrder = [requestedTier, ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier)];
  for (const tier of tierOrder) {
    const rows = data.filter((r) => r.tier === tier);
    if (rows.length > 0) return { rows, usedTier: tier };
  }
  return { rows: [], usedTier: requestedTier };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patchVersion = searchParams.get("patchVersion") ?? getAllPatchVersions()[0];
  const requestedTier = searchParams.get("tier") ?? "DIAMOND";

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
    let previousPatch: string | null = null;
    if (currentIndex >= 0) {
      for (let i = currentIndex + 1; i < patchList.length; i++) {
        if (!SKIP_COMPARISON_PATCHES.has(patchList[i])) {
          previousPatch = patchList[i];
          break;
        }
      }
    }

    if (!previousPatch) {
      return NextResponse.json({
        picks: [],
        patchVersion,
        previousPatch: null,
        tier: requestedTier,
      });
    }

    // 현재 + 이전 패치 데이터 조회 (v2 → old fallback)
    const selectCols =
      "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,tier,patchVersion";
    let { data, error } = await supabase
      .from("v2_CharacterStats")
      .select(selectCols)
      .in("patchVersion", [patchVersion, previousPatch])
      .in("tier", TIER_FALLBACK_ORDER);

    // v2에 이전 패치 데이터 없으면 old 테이블 fallback
    if (data && previousPatch) {
      const hasV2Prev = data.some(
        (r: { patchVersion: string }) => r.patchVersion === previousPatch
      );
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

    // 꿀챔 필터: 승률 ↑ 필수 (픽률은 무관), 소표본 제외
    const MIN_GAMES_CURRENT = 20;
    const MIN_GAMES_PREV = 10;
    const honeyPicks: HoneyPickData[] = [];
    for (const curr of currentRates) {
      if (curr.totalGames < MIN_GAMES_CURRENT) continue;
      const prev = prevMap.get(curr.characterNum);
      if (!prev || prev.totalGames < MIN_GAMES_PREV) continue;

      const pickRateDelta = curr.pickRate - prev.pickRate;
      const winRateDelta = curr.winRate - prev.winRate;

      if (winRateDelta > 0) {
        const rpBonus = curr.averageRP > 0 ? 1 + curr.averageRP / 100 : 1;
        // 픽률 상승 시 가산, 하락 시 승률 변화만으로 스코어 산정
        const pickFactor = pickRateDelta > 0 ? 1 + pickRateDelta : 1;
        honeyPicks.push({
          characterNum: curr.characterNum,
          bestWeapon: curr.bestWeapon,
          pickRate: curr.pickRate,
          winRate: curr.winRate,
          averageRP: curr.averageRP,
          pickRateDelta,
          winRateDelta,
          averageRPDelta: curr.averageRP - prev.averageRP,
          honeyScore: winRateDelta * pickFactor * rpBonus,
        });
      }
    }

    // honeyScore 내림차순 정렬, 상위 5개
    honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);
    const top5 = honeyPicks.slice(0, 10);

    return NextResponse.json(
      {
        picks: top5,
        patchVersion,
        previousPatch,
        tier: usedTier,
      },
      { headers: getCacheHeaders("daily") }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[honey-picks] 예외:", message);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
