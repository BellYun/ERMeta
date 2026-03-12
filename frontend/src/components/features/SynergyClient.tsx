"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { X, Users, Loader2, Search, ChevronDown, ChevronUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultErrorBoundary } from "@/components/features/ResultErrorBoundary"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"
import { analytics } from "@/lib/analytics"

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface TrioResult {
  character1: number
  character2: number
  character3: number
  winRate: number
  averageRP: number
  totalGames: number
  averageRank: number
}

type SortBy = "averageRP" | "winRate" | "totalGames" | "recommended"

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const FALLBACK_MAP = buildFallbackMap()
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]) // Dr. 하나, 나쟈

const ALL_CHARACTER_CODES: number[] = Array.from(FALLBACK_MAP.keys())
  .filter((code) => !EXCLUDED_CHARACTER_CODES.has(code))
  .sort((a, b) =>
    (FALLBACK_MAP.get(a) ?? "").localeCompare(FALLBACK_MAP.get(b) ?? "", "ko")
  )

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "averageRP", label: "평균 RP" },
  { value: "winRate", label: "승률" },
  { value: "totalGames", label: "게임 수" },
]

// ─── 초성 검색 ──────────────────────────────────────────────────────────────────

const CHOSUNG = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
]

function getChosung(char: string): string | null {
  const code = char.charCodeAt(0)
  if (code < 0xAC00 || code > 0xD7A3) return null
  return CHOSUNG[Math.floor((code - 0xAC00) / (21 * 28))]
}

function isChosung(char: string): boolean {
  return CHOSUNG.includes(char)
}

function matchesChosungSearch(name: string, query: string): boolean {
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

function getSortValue(rec: TrioResult, sortBy: SortBy, serverIndex?: number): number {
  if (sortBy === "averageRP") return rec.averageRP
  if (sortBy === "winRate") return rec.winRate
  if (sortBy === "recommended") return serverIndex !== undefined ? -serverIndex : rec.averageRP
  return rec.totalGames
}

function getThirdCharacter(
  rec: TrioResult,
  allyA: number,
  allyB: number
): number | null {
  const third = [rec.character1, rec.character2, rec.character3].filter(
    (c) => c !== allyA && c !== allyB
  )
  return third.length === 1 ? third[0] : null
}

function deduplicateResults(
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

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function SlotEmpty({ index }: { index: number }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-border)]">
        <Users className="h-5 w-5" />
      </div>
      <span className="text-sm text-[var(--color-border)]">
        아군 캐릭터 {index + 1} 선택
      </span>
    </div>
  )
}

function SlotFilled({
  code,
  name,
  onRemove,
}: {
  code: number
  name: string
  onRemove: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-4 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterImageUrl(code)}
          alt={name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">
        {name}
      </span>
      <button
        onClick={onRemove}
        className="rounded-md p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function ComboCard({
  rec,
  rank,
  getCharName,
  selectedAllies,
  compact = false,
  onNavigateAnalysis,
}: {
  rec: TrioResult
  rank: number
  getCharName: (code: number) => string
  selectedAllies: number[]
  compact?: boolean
  onNavigateAnalysis?: (code: number) => void
}) {
  // 선택한 아군을 앞에, 추천 캐릭터를 마지막에 표시
  const allChars = [rec.character1, rec.character2, rec.character3]
  const allies: number[] = []
  const rest: number[] = []
  for (const code of allChars) {
    if (selectedAllies.includes(code) && allies.length < selectedAllies.length) {
      allies.push(code)
    } else {
      rest.push(code)
    }
  }
  // 선택 순서 유지
  allies.sort((a, b) => selectedAllies.indexOf(a) - selectedAllies.indexOf(b))
  const chars = [...allies, ...rest]
  const isSmallSample = rec.totalGames <= 10

  return (
    <div className="group flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2.5 hover:bg-[var(--color-primary)]/[0.04] hover:border-[var(--color-primary)]/20 transition-all duration-200">
      {/* 순위 */}
      <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]">
        {rank}
      </span>

      {/* 3캐릭터 */}
      <div className="flex items-center gap-1">
        {chars.map((code, i) => {
          const isRecommended = !selectedAllies.includes(code)
          const charContent = (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]",
                  isRecommended && "ring-2 ring-[var(--color-accent-gold)]",
                  isRecommended && "group-hover/char:ring-[var(--color-primary)] transition-all"
                )}
              >
                <Image
                  src={getCharacterImageUrl(code)}
                  alt={getCharName(code)}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              {!compact && (
                <span className={cn(
                  "w-10 truncate text-center text-[9px]",
                  isRecommended
                    ? "text-[var(--color-accent-gold)] group-hover/char:text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)]"
                )}>
                  {getCharName(code)}
                </span>
              )}
            </div>
          )
          return (
            <React.Fragment key={code}>
              {isRecommended && onNavigateAnalysis ? (
                <button
                  type="button"
                  onClick={() => onNavigateAnalysis(code)}
                  className="group/char relative z-10 cursor-pointer flex items-center gap-1"
                  title={`${getCharName(code)} 분석 보기`}
                >
                  {charContent}
                  {rest.length === 1 && (
                    <span className="rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-primary)] group-hover/char:bg-[var(--color-primary)]/20 group-hover/char:border-[var(--color-primary)]/50 transition-colors whitespace-nowrap">
                      분석보기
                    </span>
                  )}
                </button>
              ) : (
                charContent
              )}
              {i < 2 && (
                <span className="text-[10px] text-[var(--color-border)]">+</span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* 소표본 배지 */}
      {isSmallSample && (
        <span className="text-[9px] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded shrink-0">
          소표본
        </span>
      )}

      {/* 스탯 */}
      {compact ? (
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "text-xs font-semibold",
              rec.winRate >= 60
                ? "text-[var(--color-accent-gold)]"
                : rec.winRate >= 55
                ? "text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)]"
            )}
          >
            {rec.winRate.toFixed(1)}%
          </span>
          <span className={cn(
            "text-[10px]",
            rec.averageRP > 0
              ? "text-[var(--color-accent-gold)]"
              : rec.averageRP < 0
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-muted-foreground)]"
          )}>
            {rec.averageRP > 0 ? "+" : ""}{rec.averageRP.toFixed(1)} RP
          </span>
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-3 sm:gap-6 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
            <span
              className={cn(
                "text-sm font-semibold",
                rec.winRate >= 60
                  ? "text-[var(--color-accent-gold)]"
                  : rec.winRate >= 55
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {rec.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</span>
            <span className={cn(
              "text-sm font-semibold",
              rec.averageRP > 0
                ? "text-[var(--color-accent-gold)]"
                : rec.averageRP < 0
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-muted-foreground)]"
            )}>
              {rec.averageRP > 0 ? "+" : ""}{rec.averageRP.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">게임 수</span>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {rec.totalGames.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              #{rec.averageRank.toFixed(1)}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function SynergyClient({ compact = false }: { compact?: boolean }) {
  const { l10n } = useL10n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL 쿼리 파라미터에서 초기 아군 읽기
  const initialAllies = React.useMemo(() => {
    const allies: number[] = []
    const a1 = searchParams.get("ally1")
    const a2 = searchParams.get("ally2")
    if (a1) {
      const code = parseInt(a1, 10)
      if (!isNaN(code) && ALL_CHARACTER_CODES.includes(code)) allies.push(code)
    }
    if (a2) {
      const code = parseInt(a2, 10)
      if (!isNaN(code) && ALL_CHARACTER_CODES.includes(code) && !allies.includes(code)) allies.push(code)
    }
    return allies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [selectedAllies, setSelectedAllies] = React.useState<number[]>(initialAllies)
  const [focusCharacters, setFocusCharacters] = React.useState<number[]>([])
  // isFocusExpanded: 관심 캐릭터 그리드 접기/펼치기 (true = 펼침)
  const [isFocusExpanded, setIsFocusExpanded] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortBy>("recommended")
  const [allySearch, setAllySearch] = React.useState("")
  const [focusSearch, setFocusSearch] = React.useState("")

  // 아군 선택 변경 시 URL 쿼리 파라미터 동기화
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (selectedAllies[0] !== undefined) params.set("ally1", String(selectedAllies[0]))
    if (selectedAllies[1] !== undefined) params.set("ally2", String(selectedAllies[1]))

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAllies, pathname, router])

  const [trioResults, setTrioResults] = React.useState<TrioResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  // API 호출: 아군 선택 / 정렬 변경 시 (300ms 디바운스 + AbortController)
  React.useEffect(() => {
    if (selectedAllies.length === 0) {
      setTrioResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const timerId = setTimeout(() => {
      const params = new URLSearchParams({
        sortBy,
        limit: "100",
      })
      if (selectedAllies[0] !== undefined) {
        params.set("character1", String(selectedAllies[0]))
      }
      if (selectedAllies[1] !== undefined) {
        params.set("character2", String(selectedAllies[1]))
      }

      setError(null)

      // 10초 타임아웃 + AbortController 병합
      const timeout = AbortSignal.timeout(10_000)
      const signal = AbortSignal.any([controller.signal, timeout])

      fetch(`/api/stats/trios?${params.toString()}`, { signal })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? "API 오류")
          setTrioResults(data.results ?? [])
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return
          if (err instanceof Error && err.name === "TimeoutError") {
            setError("요청 시간이 초과되었습니다. 다시 시도해주세요.")
            return
          }
          setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
        })
        .finally(() => {
          setLoading(false)
        })
    }, 300)

    setLoading(true)

    return () => {
      clearTimeout(timerId)
      controller.abort()
      setLoading(false)
    }
  }, [selectedAllies, sortBy])

  // 아군 검색 필터 (초성 검색 지원)
  const filteredAllyCodes = React.useMemo(() => {
    if (!allySearch.trim()) return ALL_CHARACTER_CODES
    const q = allySearch.trim()
    return ALL_CHARACTER_CODES.filter((code) =>
      matchesChosungSearch(getCharName(code), q)
    )
  }, [allySearch, getCharName])

  // 관심 캐릭터 검색 필터 (초성 검색 지원)
  const filteredFocusCodes = React.useMemo(() => {
    if (!focusSearch.trim()) return ALL_CHARACTER_CODES
    const q = focusSearch.trim()
    return ALL_CHARACTER_CODES.filter((code) =>
      matchesChosungSearch(getCharName(code), q)
    )
  }, [focusSearch, getCharName])

  const toggleAlly = (code: number) => {
    setSelectedAllies((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code)
      if (prev.length >= 2) return prev
      const slot = prev.length === 0 ? "A" : "B"
      // analytics를 setState 밖에서 호출 (React updater는 순수 함수여야 함)
      queueMicrotask(() => analytics.synergyAllySelected(slot, code, getCharName(code)))
      return [...prev, code]
    })
  }

  const removeAlly = (code: number) =>
    setSelectedAllies((prev) => prev.filter((c) => c !== code))

  const toggleFocus = (code: number) => {
    setFocusCharacters((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const recommendations = React.useMemo(() => {
    if (selectedAllies.length === 0) return []

    let scopedResults = trioResults
    if (focusCharacters.length > 0) {
      const focusSet = new Set(focusCharacters)
      if (selectedAllies.length === 2) {
        // 2명 선택: 3번째 캐릭터가 관심 캐릭터인 조합만
        const [allyA, allyB] = selectedAllies
        scopedResults = trioResults.filter((rec) => {
          const third = getThirdCharacter(rec, allyA, allyB)
          return third !== null && focusSet.has(third)
        })
      } else if (selectedAllies.length === 1) {
        // 1명 선택: 나머지 2명 중 하나 이상이 관심 캐릭터인 조합만
        const selected = selectedAllies[0]
        scopedResults = trioResults.filter((rec) => {
          const others = [rec.character1, rec.character2, rec.character3].filter(
            (c) => c !== selected
          )
          return others.some((c) => focusSet.has(c))
        })
      }
    }

    const deduped = deduplicateResults(scopedResults, selectedAllies, sortBy)
    // 추천순: 10판 이하 & 평균 RP 음수 조합은 후순위
    const sorted = sortBy === "recommended"
      ? [
          ...deduped.filter((r) => r.totalGames > 10 && r.averageRP >= 0),
          ...deduped.filter((r) => r.totalGames > 10 && r.averageRP < 0),
          ...deduped.filter((r) => r.totalGames <= 10),
        ]
      : [
          ...deduped.filter((r) => r.averageRP >= 0),
          ...deduped.filter((r) => r.averageRP < 0),
        ]
    return sorted.slice(0, 20)
  }, [trioResults, selectedAllies, focusCharacters, sortBy])

  return (
    <div className="flex flex-col gap-4">
      {/* STEP 1: 관심 캐릭터 설정 (내가 플레이 가능한 캐릭터 풀) */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
        {/* 접이식 헤더 */}
        <button
          onClick={() => setIsFocusExpanded((prev) => !prev)}
          aria-expanded={isFocusExpanded}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-foreground)]">
              내 캐릭터 풀
            </span>
            {focusCharacters.length > 0 && (
              <span className="rounded-full bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                {focusCharacters.length}명
              </span>
            )}
            {focusCharacters.length === 0 && (
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                내가 플레이 가능한 캐릭터를 미리 설정하세요
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {focusCharacters.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFocusCharacters([])
                }}
                className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-2)]"
              >
                초기화
              </button>
            )}
            {isFocusExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            )}
          </div>
        </button>

        {/* 접힌 상태: 선택된 캐릭터 칩 표시 */}
        {!isFocusExpanded && focusCharacters.length > 0 && (
          <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
            {focusCharacters.map((code) => (
              <button
                key={`focus-chip-${code}`}
                onClick={() => toggleFocus(code)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] text-[var(--color-foreground)] hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
                  <Image
                    src={getCharacterImageUrl(code)}
                    alt={getCharName(code)}
                    fill
                    className="object-cover"
                    sizes="16px"
                  />
                </span>
                <span className="max-w-16 truncate">{getCharName(code)}</span>
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        )}

        {/* 펼친 상태: 검색 + 그리드 */}
        {isFocusExpanded && (
          <div className="border-t border-[var(--color-border)] p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <input
                value={focusSearch}
                onChange={(e) => setFocusSearch(e.target.value)}
                placeholder="캐릭터 검색 (초성 가능: ㅎㅇ)"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              {focusSearch && (
                <button
                  onClick={() => setFocusSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {filteredFocusCodes.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                검색 결과 없음
              </p>
            ) : (
              <div data-sr-block className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
                {filteredFocusCodes.map((code) => {
                  const isSelected = focusCharacters.includes(code)
                  const name = getCharName(code)
                  return (
                    <button
                      key={`focus-${code}`}
                      onClick={() => toggleFocus(code)}
                      title={name}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                        isSelected
                          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                          : "hover:bg-[var(--color-surface-2)]"
                      )}
                    >
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                        <Image
                          src={getCharacterImageUrl(code)}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
                        {name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: 아군 선택 */}
      <div className="flex gap-3">
        {selectedAllies[0] !== undefined ? (
          <SlotFilled
            code={selectedAllies[0]}
            name={getCharName(selectedAllies[0])}
            onRemove={() => removeAlly(selectedAllies[0])}
          />
        ) : (
          <SlotEmpty index={0} />
        )}
        {selectedAllies[1] !== undefined ? (
          <SlotFilled
            code={selectedAllies[1]}
            name={getCharName(selectedAllies[1])}
            onRemove={() => removeAlly(selectedAllies[1])}
          />
        ) : (
          <SlotEmpty index={1} />
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">
          아군 선택 (최대 2명)
        </p>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={allySearch}
            onChange={(e) => setAllySearch(e.target.value)}
            placeholder="아군 검색 (초성 가능: ㅎㅇ)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          {allySearch && (
            <button
              onClick={() => setAllySearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {filteredAllyCodes.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
            검색 결과 없음
          </p>
        ) : (
          <div data-sr-block className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
            {filteredAllyCodes.map((code) => {
              const isSelected = selectedAllies.includes(code)
              const isDisabled = !isSelected && selectedAllies.length >= 2
              const name = getCharName(code)
              return (
                <button
                  key={`ally-${code}`}
                  onClick={() => toggleAlly(code)}
                  disabled={isDisabled}
                  title={name}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                    isSelected
                      ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                      : isDisabled
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-[var(--color-surface-2)]"
                  )}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                    <Image
                      src={getCharacterImageUrl(code)}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
                    {name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* STEP 3: 정렬 기준 + 결과 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setSortBy(value); analytics.synergySortChanged(value) }}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                sortBy === value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedAllies.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                {selectedAllies.length === 1
                  ? `${getCharName(selectedAllies[0])} 포함 추천 조합`
                  : `${getCharName(selectedAllies[0])} + ${getCharName(selectedAllies[1])} 조합`}
                {focusCharacters.length > 0
                  ? ` (내 풀 ${focusCharacters.length}명 필터)`
                  : ""}
              </h2>
              <button
                onClick={() => setSelectedAllies([])}
                className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
              >
                초기화
              </button>
            </>
          )}
        </div>
      </div>

      {/* 결과 목록 */}
      <ResultErrorBoundary>
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              아군의 픽에 맞춰 최선의 조합을 찾아보세요
            </p>
            <div className="flex flex-col gap-1 mt-3 text-xs text-[var(--color-muted-foreground)]">
              <span>1. 내 캐릭터 풀을 설정하세요 (선택사항)</span>
              <span>2. 아군의 캐릭터를 1~2명 선택하세요</span>
              <span>3. 내가 할 수 있는 것 중 최선의 조합을 추천합니다</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              조합 데이터 로딩 중...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div data-sr-block className="flex flex-col gap-2">
            {selectedAllies.length === 1 && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)] bg-[var(--color-surface-2)] px-3 py-2 rounded-lg">
                <Info className="h-3.5 w-3.5 shrink-0" />
                1명 더 선택하면 더 정확한 추천을 받을 수 있어요
              </p>
            )}
            {recommendations.map((rec, i) => (
              <ComboCard
                key={`${rec.character1}-${rec.character2}-${rec.character3}`}
                rec={rec}
                rank={i + 1}
                getCharName={getCharName}
                selectedAllies={selectedAllies}
                compact={compact}
                onNavigateAnalysis={(code) => router.push(`/character-analysis?character=${code}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {focusCharacters.length > 0
                ? "내 캐릭터 풀에 해당하는 조합이 없습니다. 캐릭터 풀을 넓혀보세요."
                : "해당 조합 데이터가 없습니다"}
            </p>
            <button
              onClick={() => setSelectedAllies([])}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              아군 초기화하기
            </button>
          </div>
        )}
      </ResultErrorBoundary>
    </div>
  )
}
