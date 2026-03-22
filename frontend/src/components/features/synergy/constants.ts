import { buildFallbackMap } from "@/lib/characterMap"
import type { SortBy } from "./types"

export const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]) // Dr. 하나, 나쟈

/**
 * 지연 초기화 (lazy singleton) — 모듈 로드 시 즉시 실행하지 않고 첫 접근 시에만 생성
 * buildFallbackMap() + localeCompare("ko") 정렬이 하이드레이션을 블로킹하던 문제 해소
 */
let _fallbackMap: Map<number, string> | null = null
export function getFallbackMap(): Map<number, string> {
  if (!_fallbackMap) _fallbackMap = buildFallbackMap()
  return _fallbackMap
}

let _allCodes: number[] | null = null
export function getAllCharacterCodes(): number[] {
  if (!_allCodes) {
    const map = getFallbackMap()
    _allCodes = Array.from(map.keys())
      .filter((code) => !EXCLUDED_CHARACTER_CODES.has(code))
      .sort((a, b) =>
        (map.get(a) ?? "").localeCompare(map.get(b) ?? "", "ko")
      )
  }
  return _allCodes
}

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "averageRP", label: "평균 RP" },
  { value: "winRate", label: "승률" },
  { value: "totalGames", label: "게임 수" },
]
