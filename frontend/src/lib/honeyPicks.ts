import { createServerClient } from "@/lib/supabase"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"

/**
 * 꿀챔 데이터 서버 직접 fetch — API Route 경유 없이 Supabase 직접 쿼리
 *
 * 기존: Server Component → fetch("/api/meta/honey-picks") → API Route → Supabase
 * 개선: Server Component → fetchHoneyPicksServer() → Supabase (네트워크 홉 1회 제거)
 */

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"]

interface StatRow {
  characterNum: number
  bestWeapon: number
  totalGames: number
  totalWins: number
  totalRP: number
  totalTop3: number
  tier: string
  patchVersion: string
}

interface ComputedRate {
  characterNum: number
  bestWeapon: number
  totalGames: number
  pickRate: number
  winRate: number
  averageRP: number
}

interface HoneyPicksResult {
  picks: HoneyPickData[]
  patchVersion: string
  previousPatch: string | null
  tier: string
}

function computeRates(rows: StatRow[]): ComputedRate[] {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0)
  return rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
  }))
}

function selectTierRows(
  data: StatRow[],
  requestedTier: string
): { rows: StatRow[]; usedTier: string } {
  const tierOrder = [
    requestedTier,
    ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
  ]
  for (const tier of tierOrder) {
    const rows = data.filter((r) => r.tier === tier)
    if (rows.length > 0) return { rows, usedTier: tier }
  }
  return { rows: [], usedTier: requestedTier }
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
  }

  try {
    const supabase = createServerClient()

    // 패치 목록 조회
    const { data: patches } = await supabase
      .from("PatchVersion")
      .select("version")
      .order("startDate", { ascending: false })
      .limit(50)

    const patchList = (patches ?? []).map((p: { version: string }) => p.version)
    const currentIndex = patchList.indexOf(patchVersion)
    const previousPatch =
      currentIndex >= 0 && currentIndex + 1 < patchList.length
        ? patchList[currentIndex + 1]
        : null

    if (!previousPatch) return empty

    // 현재 + 이전 패치 데이터 조회 (v2 → old fallback)
    const selectCols =
      "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,tier,patchVersion"
    let { data, error } = await supabase
      .from("v2_CharacterStats")
      .select(selectCols)
      .in("patchVersion", [patchVersion, previousPatch])
      .in("tier", TIER_FALLBACK_ORDER)

    // v2에 이전 패치 데이터 없으면 old 테이블 fallback
    if (data && previousPatch) {
      const hasV2Prev = data.some(
        (r: { patchVersion: string }) => r.patchVersion === previousPatch
      )
      if (!hasV2Prev) {
        const { data: oldData } = await supabase
          .from("CharacterStats")
          .select(selectCols)
          .eq("patchVersion", previousPatch)
          .in("tier", TIER_FALLBACK_ORDER)
        if (oldData && oldData.length > 0) {
          data = [...data, ...oldData]
        }
      }
    }

    if (error || !data) return empty

    const typedData = data as StatRow[]
    const currentData = typedData.filter((r) => r.patchVersion === patchVersion)
    const prevData = typedData.filter((r) => r.patchVersion === previousPatch)

    const { rows: currentRows, usedTier } = selectTierRows(currentData, requestedTier)
    const { rows: prevRows } = selectTierRows(prevData, usedTier)

    if (currentRows.length === 0 || prevRows.length === 0) {
      return { ...empty, previousPatch, tier: usedTier }
    }

    const currentRates = computeRates(currentRows)
    const prevRates = computeRates(prevRows)
    const prevMap = new Map(prevRates.map((r) => [r.characterNum, r]))

    // 꿀챔 필터: 픽률 ↑ AND 승률 ↑
    const honeyPicks: HoneyPickData[] = []
    for (const curr of currentRates) {
      const prev = prevMap.get(curr.characterNum)
      if (!prev) continue

      const pickRateDelta = curr.pickRate - prev.pickRate
      const winRateDelta = curr.winRate - prev.winRate

      if (pickRateDelta > 0 && winRateDelta > 0) {
        const rpBonus = curr.averageRP > 0 ? 1 + curr.averageRP / 100 : 1
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
        })
      }
    }

    honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore)

    return {
      picks: honeyPicks.slice(0, 5),
      patchVersion,
      previousPatch,
      tier: usedTier,
    }
  } catch (err) {
    console.error("[honeyPicks] 서버 fetch 예외:", err)
    return empty
  }
}
