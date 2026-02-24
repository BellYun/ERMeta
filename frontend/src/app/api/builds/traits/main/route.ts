import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const characterCode = Number(searchParams.get("characterCode"))
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? "10.3"
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
      rows: Array<{
        sub1: number | null
        sub2: number | null
        sub3: number | null
        sub4: number | null
        totalGames: number
        totalWins: number
      }>
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

      // sub1 옵션 집계
      const sub1Map = new Map<string, { code: number | null; games: number; wins: number }>()
      for (const r of group.rows) {
        const key = String(r.sub1 ?? "null")
        const existing = sub1Map.get(key)
        if (existing) {
          existing.games += r.totalGames
          existing.wins += r.totalWins
        } else {
          sub1Map.set(key, { code: r.sub1, games: r.totalGames, wins: r.totalWins })
        }
      }
      const sub1Options: TraitSubOption[] = [...sub1Map.values()]
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)
        .map((o) => ({
          code: o.code,
          totalGames: o.games,
          pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
          winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
        }))

      // sub2 옵션 집계
      const sub2Map = new Map<string, { code: number | null; games: number; wins: number }>()
      for (const r of group.rows) {
        const key = String(r.sub2 ?? "null")
        const existing = sub2Map.get(key)
        if (existing) {
          existing.games += r.totalGames
          existing.wins += r.totalWins
        } else {
          sub2Map.set(key, { code: r.sub2, games: r.totalGames, wins: r.totalWins })
        }
      }
      const sub2Options: TraitSubOption[] = [...sub2Map.values()]
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)
        .map((o) => ({
          code: o.code,
          totalGames: o.games,
          pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
          winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
        }))

      // sub3 옵션 집계
      const sub3Map = new Map<string, { code: number | null; games: number; wins: number }>()
      for (const r of group.rows) {
        const key = String(r.sub3 ?? "null")
        const existing = sub3Map.get(key)
        if (existing) {
          existing.games += r.totalGames
          existing.wins += r.totalWins
        } else {
          sub3Map.set(key, { code: r.sub3, games: r.totalGames, wins: r.totalWins })
        }
      }
      const sub3Options: TraitSubOption[] = [...sub3Map.values()]
        .filter((o) => o.code != null)
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)
        .map((o) => ({
          code: o.code,
          totalGames: o.games,
          pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
          winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
        }))

      // sub4 옵션 집계
      const sub4Map = new Map<string, { code: number | null; games: number; wins: number }>()
      for (const r of group.rows) {
        const key = String(r.sub4 ?? "null")
        const existing = sub4Map.get(key)
        if (existing) {
          existing.games += r.totalGames
          existing.wins += r.totalWins
        } else {
          sub4Map.set(key, { code: r.sub4, games: r.totalGames, wins: r.totalWins })
        }
      }
      const sub4Options: TraitSubOption[] = [...sub4Map.values()]
        .filter((o) => o.code != null)
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)
        .map((o) => ({
          code: o.code,
          totalGames: o.games,
          pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
          winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
        }))

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
    return NextResponse.json({ builds: builds.slice(0, 5) })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/traits/main] 예외:", message)
    return NextResponse.json({ builds: [] })
  }
}
