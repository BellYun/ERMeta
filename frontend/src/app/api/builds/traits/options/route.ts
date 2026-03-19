import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getCacheHeaders } from "@/lib/cache"

export const revalidate = 1800 // L1: 30분 서버 캐시

export interface TraitOptionItem {
  traits: number[]
  totalGames: number
  pickRate: number
  winRate: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const characterCode = Number(searchParams.get("characterCode"))
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? "10.5"
  const bestWeapon = searchParams.get("bestWeapon")

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ options: [] })
  }

  try {
    const supabase = createServerClient()

    let query = supabase
      .from("v2_CharacterTraitBuildStats")
      .select("*")
      .eq("characterNum", characterCode)
      .eq("patchVersion", patchVersion)
      .eq("tier", tier)
      .order("totalGames", { ascending: false })
      .limit(10)

    if (bestWeapon) {
      query = query.eq("bestWeapon", Number(bestWeapon))
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return NextResponse.json({ options: [] })
    }

    const grandTotal = data.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0), 0)

    const options: TraitOptionItem[] = data.map((r: Record<string, unknown>) => {
      const traits: number[] = []
      for (let i = 1; i <= 4; i++) {
        const code = r[`optionTrait${i}`] as number | null | undefined
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

    return NextResponse.json({ options }, { headers: getCacheHeaders("daily") })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/traits/options] 예외:", message)
    return NextResponse.json({ options: [] })
  }
}
