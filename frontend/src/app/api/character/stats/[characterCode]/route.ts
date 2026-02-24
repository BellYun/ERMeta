import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

interface StatRow {
  characterNum: number
  bestWeapon: number | null
  totalGames: number
  totalWins: number
  totalRP: number
  totalTop3: number
  averageRank: number
}

export interface CharacterStatsResponse {
  characterNum: number
  patchVersion: string
  tier: string
  totalGames: number
  pickRate: number
  winRate: number
  averageRank: number
  averageRP: number
  top3Rate: number
  weapons: WeaponStatItem[]
}

export interface WeaponStatItem {
  bestWeapon: number | null
  totalGames: number
  pickRate: number // 캐릭터 내 비율
  winRate: number
  averageRank: number
  averageRP: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterCode: string }> }
) {
  const { characterCode: characterCodeStr } = await params
  const characterCode = Number(characterCodeStr)

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ error: "Invalid characterCode" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? "10.3"

  const emptyResponse: CharacterStatsResponse = {
    characterNum: characterCode,
    patchVersion,
    tier,
    totalGames: 0,
    pickRate: 0,
    winRate: 0,
    averageRank: 0,
    averageRP: 0,
    top3Rate: 0,
    weapons: [],
  }

  try {
    const supabase = createServerClient()

    // 해당 캐릭터의 무기별 행 조회
    const { data, error } = await supabase
      .from("CharacterStats")
      .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank")
      .eq("characterNum", characterCode)
      .eq("patchVersion", patchVersion)
      .eq("tier", tier)

    if (error || !data || data.length === 0) {
      return NextResponse.json(emptyResponse)
    }

    const rows = data as StatRow[]

    // 전체 픽률 계산용: 해당 패치+티어의 grandTotal
    const { data: allRows } = await supabase
      .from("CharacterStats")
      .select("totalGames")
      .eq("patchVersion", patchVersion)
      .eq("tier", tier)

    const grandTotal = (allRows ?? []).reduce((sum, r) => sum + (r.totalGames ?? 0), 0)

    // 캐릭터 집계
    const totalGames = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0)
    const totalWins = rows.reduce((sum, r) => sum + (r.totalWins ?? 0), 0)
    const totalRP = rows.reduce((sum, r) => sum + (r.totalRP ?? 0), 0)
    const totalTop3 = rows.reduce((sum, r) => sum + (r.totalTop3 ?? 0), 0)

    // 가중 평균 순위
    const weightedAvgRank =
      totalGames > 0
        ? rows.reduce((sum, r) => sum + (r.averageRank ?? 0) * (r.totalGames ?? 0), 0) / totalGames
        : 0

    // 무기별 통계 (내림차순 정렬)
    const weapons: WeaponStatItem[] = rows
      .map((r) => ({
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames ?? 0,
        pickRate: totalGames > 0 ? ((r.totalGames ?? 0) / totalGames) * 100 : 0,
        winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
        averageRank: r.averageRank ?? 0,
        averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
      }))
      .sort((a, b) => b.totalGames - a.totalGames)

    return NextResponse.json({
      characterNum: characterCode,
      patchVersion,
      tier,
      totalGames,
      pickRate: grandTotal > 0 ? (totalGames / grandTotal) * 100 : 0,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      averageRank: weightedAvgRank,
      averageRP: totalGames > 0 ? totalRP / totalGames : 0,
      top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
      weapons,
    } satisfies CharacterStatsResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[character/stats] 예외:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
