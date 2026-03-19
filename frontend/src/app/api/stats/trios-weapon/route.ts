import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { TierGroup } from "@/utils/tier"
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache"

export const revalidate = 3600

const DIAMOND_PLUS_TIERS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
]
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999])

type SortBy = "averageRP" | "winRate" | "totalGames" | "recommended"

// ─── 추천 점수 계산 (trios와 동일) ─────────────────────────────────────────────

const BAYESIAN_K = 50

function bayesianRP(averageRP: number, totalGames: number, globalAvgRP: number): number {
  return (totalGames * averageRP + BAYESIAN_K * globalAvgRP) / (totalGames + BAYESIAN_K)
}

function wilsonLower(winRatePct: number, totalGames: number): number {
  if (totalGames === 0) return 0
  const p = winRatePct / 100
  const z = 1.645
  const n = totalGames
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  const denominator = 1 + (z * z) / n
  return Math.max(0, numerator / denominator)
}

function rankScore(averageRank: number): number {
  return Math.max(0, Math.min(1, (8 - averageRank) / 7))
}

function recommendedScore(
  rec: AggregatedTrioWeapon,
  globalAvgRP: number,
  rpRange: { min: number; max: number }
): number {
  const bRP = bayesianRP(rec.averageRP, rec.totalGames, globalAvgRP)
  const span = rpRange.max - rpRange.min || 1
  const normalizedRP = Math.max(0, Math.min(1, (bRP - rpRange.min) / span))
  const wilson = wilsonLower(rec.winRate, rec.totalGames)
  const rScore = rankScore(rec.averageRank)
  return 0.60 * normalizedRP + 0.30 * wilson + 0.10 * rScore
}

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface TrioWeaponRow {
  character1: number
  weapon_type1: number
  character2: number
  weapon_type2: number
  character3: number
  weapon_type3: number
  main_core1: number | null
  main_core2: number | null
  main_core3: number | null
  total_games: number
  total_wins: number
  total_rp: number
  rank_sum: number
}

interface AggregatedTrioWeapon {
  character1: number
  weaponType1: number
  character2: number
  weaponType2: number
  character3: number
  weaponType3: number
  mainCore1: number | null
  mainCore2: number | null
  mainCore3: number | null
  totalGames: number
  winRate: number
  averageRP: number
  averageRank: number
}

// ─── 티어 간 집계 (가중 평균) ──────────────────────────────────────────────────

function aggregateByTrioWeapon(rows: TrioWeaponRow[]): AggregatedTrioWeapon[] {
  const map = new Map<string, {
    c1: number; w1: number; c2: number; w2: number; c3: number; w3: number
    mc1: number | null; mc2: number | null; mc3: number | null
    totalGames: number; totalWins: number; totalRP: number; rankSum: number
  }>()

  for (const row of rows) {
    const key = `${row.character1}-${row.weapon_type1}-${row.character2}-${row.weapon_type2}-${row.character3}-${row.weapon_type3}-${row.main_core1 ?? 0}-${row.main_core2 ?? 0}-${row.main_core3 ?? 0}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        c1: row.character1, w1: row.weapon_type1,
        c2: row.character2, w2: row.weapon_type2,
        c3: row.character3, w3: row.weapon_type3,
        mc1: row.main_core1, mc2: row.main_core2, mc3: row.main_core3,
        totalGames: row.total_games, totalWins: row.total_wins,
        totalRP: row.total_rp, rankSum: row.rank_sum,
      })
    } else {
      existing.totalGames += row.total_games
      existing.totalWins += row.total_wins
      existing.totalRP += row.total_rp
      existing.rankSum += row.rank_sum
    }
  }

  return Array.from(map.values()).map((v) => ({
    character1: v.c1, weaponType1: v.w1,
    character2: v.c2, weaponType2: v.w2,
    character3: v.c3, weaponType3: v.w3,
    mainCore1: v.mc1, mainCore2: v.mc2, mainCore3: v.mc3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? (v.totalWins / v.totalGames) * 100 : 0,
    averageRP: v.totalGames > 0 ? v.totalRP / v.totalGames / 3 : 0,
    averageRank: v.totalGames > 0 ? v.rankSum / v.totalGames : 0,
  }))
}

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sortByParam = (searchParams.get("sortBy") ?? "recommended") as SortBy
  const limitParam = searchParams.get("limit")
  const char1Param = searchParams.get("character1")
  const char2Param = searchParams.get("character2")
  const weapon1Param = searchParams.get("weapon1")
  const weapon2Param = searchParams.get("weapon2")

  const char1 = char1Param !== null ? parseInt(char1Param, 10) : null
  const char2 = char2Param !== null ? parseInt(char2Param, 10) : null
  const weapon1 = weapon1Param !== null ? parseInt(weapon1Param, 10) : null
  const weapon2 = weapon2Param !== null ? parseInt(weapon2Param, 10) : null

  if (char2 !== null && char1 === null) {
    return NextResponse.json({ error: "character2는 character1 없이 사용할 수 없습니다." }, { status: 400 })
  }
  if (char1 !== null && char2 !== null && char1 === char2) {
    return NextResponse.json({ error: "character1과 character2는 달라야 합니다." }, { status: 400 })
  }
  if ((char1 !== null && EXCLUDED_CHARACTER_CODES.has(char1)) || (char2 !== null && EXCLUDED_CHARACTER_CODES.has(char2))) {
    return NextResponse.json({ results: [] })
  }

  let limit = limitParam ? parseInt(limitParam, 10) : 100
  if (isNaN(limit) || limit < 1) limit = 1
  if (limit > 200) limit = 200

  try {
    const supabase = createServerClient()
    const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from("v2_CharacterTrioWeapon")
      .select("character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,main_core1,main_core2,main_core3,total_games,total_wins,total_rp,rank_sum")
      .in("tier", DIAMOND_PLUS_TIERS)
      .gte("last_updated", TWO_WEEKS_AGO)
      .order("total_games", { ascending: false })
      .limit(5000)

    if (char1 !== null && char2 !== null) {
      const [low, high] = [char1, char2].sort((a, b) => a - b)
      query = query.or([
        `and(character1.eq.${low},character2.eq.${high})`,
        `and(character1.eq.${low},character3.eq.${high})`,
        `and(character2.eq.${low},character3.eq.${high})`,
      ].join(","))
    } else if (char1 !== null) {
      query = query.or(`character1.eq.${char1},character2.eq.${char1},character3.eq.${char1}`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[stats/trios-weapon] Supabase error:", error)
      return NextResponse.json(
        { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    // 무기 필터 (JS-side): 선택된 캐릭터의 무기 타입 매칭
    const filteredRows = ((data ?? []) as TrioWeaponRow[]).filter((row) => {
      if (EXCLUDED_CHARACTER_CODES.has(row.character1) ||
          EXCLUDED_CHARACTER_CODES.has(row.character2) ||
          EXCLUDED_CHARACTER_CODES.has(row.character3)) return false

      // 무기 필터링: 각 ally의 charCode가 row의 어떤 position에 매칭되는지 찾아서 weapon 비교
      if (char1 !== null && weapon1 !== null) {
        const matched =
          (row.character1 === char1 && row.weapon_type1 === weapon1) ||
          (row.character2 === char1 && row.weapon_type2 === weapon1) ||
          (row.character3 === char1 && row.weapon_type3 === weapon1)
        if (!matched) return false
      }
      if (char2 !== null && weapon2 !== null) {
        const matched =
          (row.character1 === char2 && row.weapon_type1 === weapon2) ||
          (row.character2 === char2 && row.weapon_type2 === weapon2) ||
          (row.character3 === char2 && row.weapon_type3 === weapon2)
        if (!matched) return false
      }

      return true
    })

    const aggregated = aggregateByTrioWeapon(filteredRows)

    if (sortByParam === "recommended") {
      const globalAvgRP = aggregated.length > 0
        ? aggregated.reduce((sum, r) => sum + r.averageRP, 0) / aggregated.length
        : 0
      const rpValues = aggregated.map((r) => r.averageRP)
      const rpRange = { min: Math.min(...rpValues), max: Math.max(...rpValues) }
      aggregated.sort((a, b) => recommendedScore(b, globalAvgRP, rpRange) - recommendedScore(a, globalAvgRP, rpRange))
    } else {
      aggregated.sort((a, b) => {
        if (sortByParam === "averageRP") return b.averageRP - a.averageRP
        if (sortByParam === "winRate") return b.winRate - a.winRate
        return b.totalGames - a.totalGames
      })
    }

    return NextResponse.json({ results: aggregated.slice(0, limit) }, { headers: getCacheHeaders("frequent") })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[stats/trios-weapon] 예외:", message)
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
