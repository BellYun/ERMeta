import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getCacheHeaders } from "@/lib/cache"

export const revalidate = 1800 // L1: 30분 서버 캐시

export interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number  // mainCore 그룹 내 비율
  winRate: number
}

export interface TraitCoreGroup {
  mainCore: number | null
  totalGames: number
  groupPickRate: number  // 전체 대비
  groupWinRate: number
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  sub3Options: TraitSubOption[]
  sub4Options: TraitSubOption[]
}

type TraitGroupRow = {
  sub1: number | null
  sub2: number | null
  sub3: number | null
  sub4: number | null
  totalGames: number
  totalWins: number
}

type TraitSubKey = "sub1" | "sub2" | "sub3" | "sub4"

function aggregateSubOptions(
  rows: TraitGroupRow[],
  subKey: TraitSubKey,
  groupTotalGames: number,
  options: { excludeNull?: boolean; limit?: number } = {}
): TraitSubOption[] {
  const { excludeNull = false, limit = 5 } = options
  const subMap = new Map<string, { code: number | null; games: number; wins: number }>()

  for (const row of rows) {
    const code = row[subKey]

    if (excludeNull && code == null) {
      continue
    }

    const key = String(code ?? "null")
    const existing = subMap.get(key)

    if (existing) {
      existing.games += row.totalGames
      existing.wins += row.totalWins
    } else {
      subMap.set(key, { code, games: row.totalGames, wins: row.totalWins })
    }
  }

  return [...subMap.values()]
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((o) => ({
      code: o.code,
      totalGames: o.games,
      pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
      winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
    }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const characterCode = Number(searchParams.get("characterCode"))
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? "10.4"
  const bestWeapon = searchParams.get("bestWeapon")

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ builds: [] })
  }

  try {
    const supabase = createServerClient()

    let query = supabase
      .from("CharacterTraitBuildStats")
      .select("*")
      .eq("characterNum", characterCode)
      .eq("patchVersion", patchVersion)
      .eq("tier", tier)
      .order("totalGames", { ascending: false })
      .limit(50)

    if (bestWeapon) {
      query = query.eq("bestWeapon", Number(bestWeapon))
    }

    const { data, error } = await query

    if (error) {
      console.error("[builds/traits/main] DB error:", error)
      return NextResponse.json({ builds: [] })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ builds: [] })
    }

    const grandTotal = data.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0),
      0
    )

    // mainCore 기준 그룹화
    const coreMap = new Map<string, {
      mainCore: number | null
      rows: TraitGroupRow[]
    }>()

    for (const r of data as Record<string, unknown>[]) {
      const mainCore = (r.mainCore as number | null | undefined) ?? null
      const sub1 = (r.sub1 as number | null | undefined) ?? null
      const sub2 = (r.sub2 as number | null | undefined) ?? null
      const sub3 = (r.sub3 as number | null | undefined) ?? null
      const sub4 = (r.sub4 as number | null | undefined) ?? null
      const totalGames = (r.totalGames as number) ?? 0
      const totalWins = (r.totalWins as number) ?? 0

      const key = String(mainCore ?? "null")
      const existing = coreMap.get(key)
      if (existing) {
        existing.rows.push({ sub1, sub2, sub3, sub4, totalGames, totalWins })
      } else {
        coreMap.set(key, { mainCore, rows: [{ sub1, sub2, sub3, sub4, totalGames, totalWins }] })
      }
    }

    const builds: TraitCoreGroup[] = []

    for (const group of coreMap.values()) {
      const groupTotalGames = group.rows.reduce((s, r) => s + r.totalGames, 0)
      const groupTotalWins = group.rows.reduce((s, r) => s + r.totalWins, 0)

      const sub1Options = aggregateSubOptions(group.rows, "sub1", groupTotalGames)
      const sub2Options = aggregateSubOptions(group.rows, "sub2", groupTotalGames)
      const sub3Options = aggregateSubOptions(group.rows, "sub3", groupTotalGames, { excludeNull: true })
      const sub4Options = aggregateSubOptions(group.rows, "sub4", groupTotalGames, { excludeNull: true })

      builds.push({
        mainCore: group.mainCore,
        totalGames: groupTotalGames,
        groupPickRate: grandTotal > 0 ? (groupTotalGames / grandTotal) * 100 : 0,
        groupWinRate: groupTotalGames > 0 ? (groupTotalWins / groupTotalGames) * 100 : 0,
        sub1Options,
        sub2Options,
        sub3Options,
        sub4Options,
      })
    }

    // totalGames 내림차순, max 5
    builds.sort((a, b) => b.totalGames - a.totalGames)
    return NextResponse.json({ builds: builds.slice(0, 5) }, { headers: getCacheHeaders("daily") })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/traits/main] 예외:", message)
    return NextResponse.json({ builds: [] })
  }
}
