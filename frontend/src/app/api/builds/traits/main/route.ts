import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export interface TraitBuildItem {
  traits: number[]
  totalGames: number
  pickRate: number
  winRate: number
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
      .limit(10)

    // bestWeapon 지정 시 해당 무기 데이터 우선, 없으면 null 행
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

    const grandTotal = data.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0), 0)

    const builds: TraitBuildItem[] = data.map((r: Record<string, unknown>) => {
      const traits: number[] = []
      const mainCore = r.mainCore as number | null | undefined
      if (mainCore) traits.push(mainCore)
      for (let i = 1; i <= 4; i++) {
        const code = r[`sub${i}`] as number | null | undefined
        if (code) traits.push(code)
      }
      const totalGames = (r.totalGames as number) ?? 0
      const totalWins = (r.totalWins as number) ?? 0
      return {
        traits,
        totalGames,
        pickRate: grandTotal > 0 ? (totalGames / grandTotal) * 100 : 0,
        winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      }
    })

    return NextResponse.json({ builds })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/traits/main] 예외:", message)
    return NextResponse.json({ builds: [] })
  }
}
