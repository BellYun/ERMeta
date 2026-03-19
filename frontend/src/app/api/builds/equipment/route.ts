import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getCacheHeaders } from "@/lib/cache"
import weaponItemTypeMap from "@/../const/weaponItemTypeMap.json"

const WEAPON_ITEM_TYPE = weaponItemTypeMap as Record<string, number>

export const revalidate = 1800 // L1: 30분 서버 캐시

export interface BuildSummary {
  mainCore: number | null
  weapon: number | null
  chest: number | null
  head: number | null
  arm: number | null
  leg: number | null
  totalGames: number
  pickRate: number
  winRate: number
  averageRank: number
  averageRP: number
}

export interface SlotItem {
  code: number
  totalGames: number
  pickRate: number
  winRate: number
}

export interface CoreItem {
  code: number
  totalGames: number
  pickRate: number
  winRate: number
}

export interface EquipmentBuildResult {
  topBuilds: BuildSummary[]
  slotPopularity: {
    weapon: SlotItem[]
    chest: SlotItem[]
    head: SlotItem[]
    arm: SlotItem[]
    leg: SlotItem[]
  }
  coreItems: CoreItem[]
}

type EquipmentRow = {
  mainCore: number | null
  weapon: number | null
  chest: number | null
  head: number | null
  arm: number | null
  leg: number | null
  totalGames: number
  totalWins: number
  rankSum: number
  totalRP: number
}

function aggregateSlot(
  rows: EquipmentRow[],
  slot: keyof Pick<EquipmentRow, "weapon" | "chest" | "head" | "arm" | "leg">,
  slotTotal: number,
  limit = 5
): SlotItem[] {
  const map = new Map<number, { games: number; wins: number }>()
  for (const row of rows) {
    const code = row[slot]
    if (code == null) continue
    const existing = map.get(code)
    if (existing) {
      existing.games += row.totalGames
      existing.wins += row.totalWins
    } else {
      map.set(code, { games: row.totalGames, wins: row.totalWins })
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, limit)
    .map(([code, { games, wins }]) => ({
      code,
      totalGames: games,
      pickRate: slotTotal > 0 ? (games / slotTotal) * 100 : 0,
      winRate: games > 0 ? (wins / games) * 100 : 0,
    }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const characterCode = Number(searchParams.get("characterCode"))
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? ""
  const mainCoreParam = searchParams.get("mainCore")
  const bestWeaponParam = searchParams.get("bestWeapon")

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json<EquipmentBuildResult>({
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    })
  }

  try {
    const supabase = createServerClient()

    let query = supabase
      .from("v2_CharacterEquipmentBuildStats")
      .select("mainCore, weapon, chest, head, arm, leg, totalGames, totalWins, rankSum, totalRP")
      .eq("characterNum", characterCode)
      .eq("tier", tier)
      .eq("patchVersion", patchVersion)

    if (mainCoreParam != null) {
      if (mainCoreParam === "null") {
        query = query.is("mainCore", null) as typeof query
      } else {
        query = query.eq("mainCore", Number(mainCoreParam)) as typeof query
      }
    }

    const { data, error } = await query
      .order("totalGames", { ascending: false })
      .limit(200)

    if (error) {
      console.error("[builds/equipment] DB error:", error)
      return NextResponse.json<EquipmentBuildResult>({
        topBuilds: [],
        slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
        coreItems: [],
      })
    }

    if (!data || data.length === 0) {
      return NextResponse.json<EquipmentBuildResult>({
        topBuilds: [],
        slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
        coreItems: [],
      })
    }

    let rows = data as EquipmentRow[]

    // bestWeapon 파라미터가 있으면 weapon 아이템 코드 → 무기 타입 매핑으로 필터
    if (bestWeaponParam != null) {
      const targetType = Number(bestWeaponParam)
      rows = rows.filter((r) => {
        if (r.weapon == null) return false
        return WEAPON_ITEM_TYPE[String(r.weapon)] === targetType
      })
    }

    if (rows.length === 0) {
      return NextResponse.json<EquipmentBuildResult>({
        topBuilds: [],
        slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
        coreItems: [],
      })
    }

    const grandTotal = rows.reduce((s, r) => s + r.totalGames, 0)

    // ① topBuilds — mainCore+weapon+chest+head+arm+leg 조합 그룹화
    const buildMap = new Map<string, {
      mainCore: number | null
      weapon: number | null; chest: number | null; head: number | null
      arm: number | null; leg: number | null
      games: number; wins: number; rankSum: number; rpSum: number
    }>()

    for (const row of rows) {
      const key = `${row.mainCore ?? ""}|${row.weapon ?? ""}|${row.chest ?? ""}|${row.head ?? ""}|${row.arm ?? ""}|${row.leg ?? ""}`
      const existing = buildMap.get(key)
      if (existing) {
        existing.games += row.totalGames
        existing.wins += row.totalWins
        existing.rankSum += row.rankSum
        existing.rpSum += row.totalRP
      } else {
        buildMap.set(key, {
          mainCore: row.mainCore,
          weapon: row.weapon, chest: row.chest, head: row.head, arm: row.arm, leg: row.leg,
          games: row.totalGames, wins: row.totalWins, rankSum: row.rankSum, rpSum: row.totalRP,
        })
      }
    }

    const topBuilds: BuildSummary[] = [...buildMap.values()]
      .sort((a, b) => b.games - a.games)
      .slice(0, 5)
      .map((b) => ({
        mainCore: b.mainCore,
        weapon: b.weapon, chest: b.chest, head: b.head, arm: b.arm, leg: b.leg,
        totalGames: b.games,
        pickRate: grandTotal > 0 ? (b.games / grandTotal) * 100 : 0,
        winRate: b.games > 0 ? (b.wins / b.games) * 100 : 0,
        averageRank: b.games > 0 ? b.rankSum / b.games : 0,
        averageRP: b.games > 0 ? b.rpSum / b.games : 0,
      }))

    // ② slotPopularity
    const slots = ["weapon", "chest", "head", "arm", "leg"] as const
    const slotPopularity = {} as EquipmentBuildResult["slotPopularity"]
    for (const slot of slots) {
      const slotTotal = rows.reduce((s, r) => s + (r[slot] != null ? r.totalGames : 0), 0)
      slotPopularity[slot] = aggregateSlot(rows, slot, slotTotal)
    }

    // ③ coreItems — 5슬롯 전체에서 itemCode 집계
    const coreMap = new Map<number, { games: number; wins: number }>()
    for (const row of rows) {
      for (const slot of slots) {
        const code = row[slot]
        if (code == null) continue
        const existing = coreMap.get(code)
        if (existing) {
          existing.games += row.totalGames
          existing.wins += row.totalWins
        } else {
          coreMap.set(code, { games: row.totalGames, wins: row.totalWins })
        }
      }
    }

    const coreItems: CoreItem[] = [...coreMap.entries()]
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 5)
      .map(([code, { games, wins }]) => ({
        code,
        totalGames: games,
        pickRate: grandTotal > 0 ? (games / grandTotal) * 100 : 0,
        winRate: games > 0 ? (wins / games) * 100 : 0,
      }))

    return NextResponse.json<EquipmentBuildResult>({ topBuilds, slotPopularity, coreItems }, { headers: getCacheHeaders("daily") })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/equipment] 예외:", message)
    return NextResponse.json<EquipmentBuildResult>({
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    })
  }
}
