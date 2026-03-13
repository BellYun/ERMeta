import { buildFallbackMap } from "@/lib/characterMap"
import type { SortBy } from "./types"

export const FALLBACK_MAP = buildFallbackMap()
export const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]) // Dr. 하나, 나쟈

export const ALL_CHARACTER_CODES: number[] = Array.from(FALLBACK_MAP.keys())
  .filter((code) => !EXCLUDED_CHARACTER_CODES.has(code))
  .sort((a, b) =>
    (FALLBACK_MAP.get(a) ?? "").localeCompare(FALLBACK_MAP.get(b) ?? "", "ko")
  )

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "averageRP", label: "평균 RP" },
  { value: "winRate", label: "승률" },
  { value: "totalGames", label: "게임 수" },
]
