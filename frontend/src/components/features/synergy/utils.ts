import type { TrioResult, SortBy } from "./types"

// ─── 초성 검색 ──────────────────────────────────────────────────────────────────

export const CHOSUNG = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
]

export function getChosung(char: string): string | null {
  const code = char.charCodeAt(0)
  if (code < 0xAC00 || code > 0xD7A3) return null
  return CHOSUNG[Math.floor((code - 0xAC00) / (21 * 28))]
}

export function isChosung(char: string): boolean {
  return CHOSUNG.includes(char)
}

export function matchesChosungSearch(name: string, query: string): boolean {
  const q = query.toLowerCase()
  // 일반 검색 먼저
  if (name.toLowerCase().includes(q)) return true
  // 초성 검색: 쿼리가 모두 초성인 경우
  if ([...q].every(isChosung)) {
    const nameChosungs = [...name].map((c) => getChosung(c) ?? c)
    for (let i = 0; i <= nameChosungs.length - q.length; i++) {
      if ([...q].every((ch, j) => nameChosungs[i + j] === ch)) return true
    }
  }
  return false
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

export function getSortValue(rec: TrioResult, sortBy: SortBy, serverIndex?: number): number {
  if (sortBy === "averageRP") return rec.averageRP
  if (sortBy === "winRate") return rec.winRate
  if (sortBy === "recommended") return serverIndex !== undefined ? -serverIndex : rec.averageRP
  return rec.totalGames
}

export function getThirdCharacter(
  rec: TrioResult,
  allyA: number,
  allyB: number
): number | null {
  const third = [rec.character1, rec.character2, rec.character3].filter(
    (c) => c !== allyA && c !== allyB
  )
  return third.length === 1 ? third[0] : null
}

export function deduplicateResults(
  results: TrioResult[],
  selectedAllies: number[],
  sortBy: SortBy
): TrioResult[] {
  if (selectedAllies.length === 2) {
    const [allyA, allyB] = selectedAllies
    // 2명 고정 시 3번째 캐릭터 기준으로 중복 제거 (서버 인덱스 기준 최우선)
    const map = new Map<number, { rec: TrioResult; idx: number }>()
    for (let i = 0; i < results.length; i++) {
      const rec = results[i]
      const key = getThirdCharacter(rec, allyA, allyB)
      if (key === null) continue
      const existing = map.get(key)
      if (!existing || getSortValue(rec, sortBy, i) > getSortValue(existing.rec, sortBy, existing.idx)) {
        map.set(key, { rec, idx: i })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => getSortValue(b.rec, sortBy, b.idx) - getSortValue(a.rec, sortBy, a.idx))
      .map((v) => v.rec)
  }

  if (selectedAllies.length === 1) {
    const selected = selectedAllies[0]
    // 나머지 두 캐릭터 쌍(min-max) 기준 중복 제거 (서버 인덱스 기준 최우선)
    const map = new Map<string, { rec: TrioResult; idx: number }>()
    for (let i = 0; i < results.length; i++) {
      const rec = results[i]
      const others = [rec.character1, rec.character2, rec.character3].filter(
        (c) => c !== selected
      )
      if (others.length !== 2) continue
      const key = `${Math.min(...others)}-${Math.max(...others)}`
      const existing = map.get(key)
      if (!existing || getSortValue(rec, sortBy, i) > getSortValue(existing.rec, sortBy, existing.idx)) {
        map.set(key, { rec, idx: i })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => getSortValue(b.rec, sortBy, b.idx) - getSortValue(a.rec, sortBy, a.idx))
      .map((v) => v.rec)
  }

  return results
}
