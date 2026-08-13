import { unstable_cache } from "next/cache";
import { STATS_EXCLUDED_PATCHES } from "@/data/patch-notes";
import { createServerClient } from "@/lib/supabase";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { expandCumulativeTier } from "@/utils/tier";

/**
 * 꿀챔 데이터 서버 직접 fetch — API Route 경유 없이 Supabase 직접 쿼리
 *
 * 기존: Server Component → fetch("/api/meta/honey-picks") → API Route → Supabase
 * 개선: Server Component → fetchHoneyPicksServer() → Supabase (네트워크 홉 1회 제거)
 */

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];
const PLAYERS_PER_MATCH = 24;
const CURRENT_PATCH_MIN_MATCH_RATIO = 0.1;
const HONEY_PICK_SCORE_WEIGHTS = {
  winRate: 0.5,
  pickRate: 0.3,
  averageRP: 0.2,
} as const;

// 비교 대상에서 제외할 패치 (표본/메타가 왜곡된 프리시즌 등) — 통계 공통 상수 사용
const SKIP_COMPARISON_PATCHES = STATS_EXCLUDED_PATCHES;

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

interface ComputedRate {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
}

export interface HoneyPicksResult {
  picks: HoneyPickData[];
  patchVersion: string;
  previousPatch: string | null;
  tier: string;
}

function getHoneyPickKey(characterNum: number, bestWeapon: number) {
  return `${characterNum}:${bestWeapon}`;
}

function computeCurrentPatchMinGames(rows: StatRow[]): number {
  const currentTotalGames = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
  const estimatedMatchCount = currentTotalGames / PLAYERS_PER_MATCH;
  return Math.ceil(estimatedMatchCount * CURRENT_PATCH_MIN_MATCH_RATIO);
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

function aggregateAcrossTiers(rows: StatRow[]): StatRow[] {
  const map = new Map<string, StatRow>();
  for (const r of rows) {
    const key = `${r.characterNum}|${r.bestWeapon ?? "null"}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, {
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames ?? 0,
        totalWins: r.totalWins ?? 0,
        totalRP: r.totalRP ?? 0,
        totalTop3: r.totalTop3 ?? 0,
        tier: r.tier,
        patchVersion: r.patchVersion,
      });
    } else {
      ex.totalGames += r.totalGames ?? 0;
      ex.totalWins += r.totalWins ?? 0;
      ex.totalRP += r.totalRP ?? 0;
      ex.totalTop3 += r.totalTop3 ?? 0;
    }
  }
  return Array.from(map.values());
}

function selectTierRows(
  data: StatRow[],
  requestedTier: string
): { rows: StatRow[]; usedTier: string } {
  // 누적(+) tier: 요청 tier 와 그 위 모든 tier 의 row 를 합산.
  const cumulativeTiers = new Set(expandCumulativeTier(requestedTier));
  const filtered = data.filter((r) => cumulativeTiers.has(r.tier));
  if (filtered.length === 0) return { rows: [], usedTier: requestedTier };
  return { rows: aggregateAcrossTiers(filtered), usedTier: requestedTier };
}

export async function fetchHoneyPicksServer(
  patchVersion: string,
  requestedTier: string
): Promise<HoneyPicksResult> {
  const empty: HoneyPicksResult = {
    picks: [],
    patchVersion,
    previousPatch: null,
    tier: requestedTier,
  };

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

    if (!previousPatch) return empty;

    // 현재 + 이전 패치 데이터 조회 (v2 → old fallback)
    const selectCols =
      "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,tier,patchVersion";
    const queryResult = await supabase
      .from("v2_CharacterStats")
      .select(selectCols)
      .in("patchVersion", [patchVersion, previousPatch])
      .in("tier", TIER_FALLBACK_ORDER);
    const { error } = queryResult;
    let { data } = queryResult;

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

    if (error || !data) return empty;

    const typedData = data as StatRow[];
    // selectTierRows 가 cumulative tier filter + (characterNum, bestWeapon) 합산 후,
    // 무기 무관 실험체(알렉스 등) collapse 는 마지막에 한 번.
    const { rows: currentMerged, usedTier } = selectTierRows(
      typedData.filter((r) => r.patchVersion === patchVersion),
      requestedTier
    );
    const { rows: prevMerged } = selectTierRows(
      typedData.filter((r) => r.patchVersion === previousPatch),
      usedTier
    );
    const currentRows = collapseWeaponAgnosticRows(currentMerged);
    const prevRows = collapseWeaponAgnosticRows(prevMerged);

    if (currentRows.length === 0 || prevRows.length === 0) {
      return { ...empty, previousPatch, tier: usedTier };
    }

    const currentRates = computeRates(currentRows);
    const prevRates = computeRates(prevRows);
    const prevMap = new Map(
      prevRates.map((r) => [getHoneyPickKey(r.characterNum, r.bestWeapon), r])
    );
    const minCurrentGames = computeCurrentPatchMinGames(currentRows);

    // 꿀챔 필터: 현재 패치 동적 소표본 컷 + 승률/픽률/RP 상승
    const honeyPicks: HoneyPickData[] = [];
    for (const curr of currentRates) {
      if (curr.totalGames < minCurrentGames) continue;
      const prev = prevMap.get(getHoneyPickKey(curr.characterNum, curr.bestWeapon));
      if (!prev) continue;

      const pickRateDelta = curr.pickRate - prev.pickRate;
      const winRateDelta = curr.winRate - prev.winRate;
      const averageRPDelta = curr.averageRP - prev.averageRP;

      if (winRateDelta > 0 && pickRateDelta > 0 && averageRPDelta > 0) {
        const honeyScore =
          HONEY_PICK_SCORE_WEIGHTS.winRate * winRateDelta +
          HONEY_PICK_SCORE_WEIGHTS.pickRate * pickRateDelta +
          HONEY_PICK_SCORE_WEIGHTS.averageRP * averageRPDelta;

        honeyPicks.push({
          characterNum: curr.characterNum,
          bestWeapon: curr.bestWeapon,
          pickRate: curr.pickRate,
          winRate: curr.winRate,
          averageRP: curr.averageRP,
          pickRateDelta,
          winRateDelta,
          averageRPDelta,
          honeyScore,
        });
      }
    }

    honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);

    return {
      picks: honeyPicks.slice(0, 10),
      patchVersion,
      previousPatch,
      tier: usedTier,
    };
  } catch (err) {
    console.error("[honeyPicks] server fetch failed:", err);
    return empty;
  }
}

export async function getCachedHoneyPicks(
  patchVersion: string,
  requestedTier: string
): Promise<HoneyPicksResult> {
  return unstable_cache(
    async () => fetchHoneyPicksServer(patchVersion, requestedTier),
    ["honey-picks", patchVersion, requestedTier],
    {
      revalidate: 21600,
      tags: ["honey-picks", `honey-picks:${patchVersion}`, `honey-picks:tier:${requestedTier}`],
    }
  )();
}
