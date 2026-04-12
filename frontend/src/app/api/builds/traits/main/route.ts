import { NextRequest, NextResponse } from "next/server"
import { getCacheHeaders } from "@/lib/cache"
import { createServerClient } from "@/lib/supabase"
import { getTraitGroup, TRAIT_CORES, TRAIT_SUBS_SLOT1, TRAIT_SUBS_SLOT2, type TraitGroup } from "@/utils/traitCodes"

export const revalidate = 1800 // L1: 30분 서버 캐시

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number
  winRate: number
}

export interface TraitSecondaryInfo {
  secGroup: TraitGroup
  totalGames: number
  pickRate: number   // 주특성 그룹 내 비율
  winRate: number
  optionTrait1Options: TraitSubOption[]
  optionTrait2Options: TraitSubOption[]
}

export interface TraitMainGroup {
  mainGroup: TraitGroup
  totalGames: number
  groupPickRate: number   // 전체 대비
  groupWinRate: number
  mainCoreOptions: TraitSubOption[]
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  secondaries: TraitSecondaryInfo[]
}

type RawRow = {
  mainCore: number | null
  sub1: number | null
  sub2: number | null
  optionTrait1: number | null
  optionTrait2: number | null
  totalGames: number
  totalWins: number
}

type AggKey = keyof Pick<RawRow, "mainCore" | "sub1" | "sub2" | "optionTrait1" | "optionTrait2">

function aggregateOptions(
  rows: RawRow[],
  keys: AggKey | AggKey[],
  groupTotal: number,
  options: { excludeNull?: boolean; allCodes?: number[] } = {}
): TraitSubOption[] {
  const { excludeNull = false, allCodes } = options
  const codeSet = allCodes ? new Set(allCodes.map(String)) : null
  const map = new Map<string, { code: number | null; games: number; wins: number }>()

  // 전체 코드 목록이 주어지면 0으로 초기화
  if (allCodes) {
    for (const code of allCodes) {
      map.set(String(code), { code, games: 0, wins: 0 })
    }
  }

  const keyList = Array.isArray(keys) ? keys : [keys]

  for (const row of rows) {
    for (const key of keyList) {
      const code = row[key]
      if (excludeNull && code === null) continue

      const k = String(code ?? "null")
      // allCodes가 있으면 해당 슬롯 코드만 집계
      if (codeSet && !codeSet.has(k)) continue

      const existing = map.get(k)
      if (existing) {
        existing.games += row.totalGames
        existing.wins += row.totalWins
      } else if (!codeSet) {
        map.set(k, { code, games: row.totalGames, wins: row.totalWins })
      }
    }
  }

  return [...map.values()].map((o) => ({
    code: o.code,
    totalGames: o.games,
    pickRate: groupTotal > 0 ? (o.games / groupTotal) * 100 : 0,
    winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
  }))
}

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const characterCode = Number(searchParams.get("characterCode"))
  const tier = searchParams.get("tier") ?? "DIAMOND"
  const patchVersion = searchParams.get("patchVersion") ?? "10.6"
  const bestWeapon = searchParams.get("bestWeapon")

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ builds: [] })
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

    // 1차: 주특성 그룹별로 모으기
    const mainMap = new Map<TraitGroup, RawRow[]>()

    for (const r of data as Record<string, unknown>[]) {
      const row: RawRow = {
        mainCore: (r.mainCore as number | null) ?? null,
        sub1: (r.sub1 as number | null) ?? null,
        sub2: (r.sub2 as number | null) ?? null,
        optionTrait1: (r.optionTrait1 as number | null) ?? null,
        optionTrait2: (r.optionTrait2 as number | null) ?? null,
        totalGames: (r.totalGames as number) ?? 0,
        totalWins: (r.totalWins as number) ?? 0,
      }

      const mg = getTraitGroup(row.mainCore)
      const existing = mainMap.get(mg)
      if (existing) existing.push(row)
      else mainMap.set(mg, [row])
    }

    // 2차: 각 주특성 내에서 부특성 그룹별 세부 집계
    const builds: TraitMainGroup[] = []

    for (const [mainGroup, rows] of mainMap) {
      const mainTotal = rows.reduce((s, r) => s + r.totalGames, 0)
      const mainWins = rows.reduce((s, r) => s + r.totalWins, 0)

      // 부특성별 분류
      const secMap = new Map<TraitGroup, RawRow[]>()
      for (const row of rows) {
        const sg = getTraitGroup(row.optionTrait1)
        const existing = secMap.get(sg)
        if (existing) existing.push(row)
        else secMap.set(sg, [row])
      }

      // 모든 부특성 그룹을 포함 (데이터 없어도 빈 항목)
      const ALL_GROUPS: TraitGroup[] = (["havoc", "fortification", "support", "chaos"] as TraitGroup[]).filter(g => g !== mainGroup)
      const secondaries: TraitSecondaryInfo[] = []

      for (const secGroup of ALL_GROUPS) {
        const secRows = secMap.get(secGroup)
        if (secRows && secRows.length > 0) {
          const secTotal = secRows.reduce((s, r) => s + r.totalGames, 0)
          const secWins = secRows.reduce((s, r) => s + r.totalWins, 0)
          secondaries.push({
            secGroup,
            totalGames: secTotal,
            pickRate: mainTotal > 0 ? (secTotal / mainTotal) * 100 : 0,
            winRate: secTotal > 0 ? (secWins / secTotal) * 100 : 0,
            optionTrait1Options: aggregateOptions(secRows, ["optionTrait1", "optionTrait2"], secTotal, { excludeNull: true, allCodes: TRAIT_SUBS_SLOT1[secGroup] }),
            optionTrait2Options: aggregateOptions(secRows, ["optionTrait1", "optionTrait2"], secTotal, { excludeNull: true, allCodes: TRAIT_SUBS_SLOT2[secGroup] }),
          })
        } else {
          secondaries.push({
            secGroup,
            totalGames: 0,
            pickRate: 0,
            winRate: 0,
            optionTrait1Options: [],
            optionTrait2Options: [],
          })
        }
      }

      builds.push({
        mainGroup,
        totalGames: mainTotal,
        groupPickRate: grandTotal > 0 ? (mainTotal / grandTotal) * 100 : 0,
        groupWinRate: mainTotal > 0 ? (mainWins / mainTotal) * 100 : 0,
        mainCoreOptions: aggregateOptions(rows, "mainCore", mainTotal, { allCodes: TRAIT_CORES[mainGroup] }),
        sub1Options: aggregateOptions(rows, ["sub1", "sub2"], mainTotal, { allCodes: TRAIT_SUBS_SLOT1[mainGroup] }),
        sub2Options: aggregateOptions(rows, ["sub1", "sub2"], mainTotal, { allCodes: TRAIT_SUBS_SLOT2[mainGroup] }),
        secondaries,
      })
    }

    return NextResponse.json({ builds: builds.slice(0, 5) }, { headers: getCacheHeaders("daily") })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[builds/traits/main] 예외:", message)
    return NextResponse.json({ builds: [] })
  }
}
