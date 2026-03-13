"use client"

import * as React from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { X, Users, Loader2, Info, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultErrorBoundary } from "@/components/features/ResultErrorBoundary"
import { useL10n } from "@/components/L10nProvider"
import { resolveCharacterName } from "@/lib/characterMap"
import { analytics } from "@/lib/analytics"
import type { TrioResult, SortBy } from "./types"
import { ALL_CHARACTER_CODES, FALLBACK_MAP, SORT_OPTIONS } from "./constants"
import { matchesChosungSearch, getSortValue, getThirdCharacter, deduplicateResults } from "./utils"
import { FocusCharacterPool } from "./FocusCharacterPool"
import { AllySelector } from "./AllySelector"
import { ComboCard } from "./ComboCard"

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
  const [copied, setCopied] = React.useState(false)

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
      <FocusCharacterPool
        focusCharacters={focusCharacters}
        toggleFocus={toggleFocus}
        setFocusCharacters={setFocusCharacters}
        getCharName={getCharName}
        filteredFocusCodes={filteredFocusCodes}
        focusSearch={focusSearch}
        setFocusSearch={setFocusSearch}
        isFocusExpanded={isFocusExpanded}
        setIsFocusExpanded={setIsFocusExpanded}
      />

      {/* STEP 2: 아군 선택 */}
      <AllySelector
        selectedAllies={selectedAllies}
        getCharName={getCharName}
        removeAlly={removeAlly}
        toggleAlly={toggleAlly}
        filteredAllyCodes={filteredAllyCodes}
        allySearch={allySearch}
        setAllySearch={setAllySearch}
      />

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
                type="button"
                onClick={() => {
                  const url = window.location.href
                  const title = selectedAllies.length === 2
                    ? `${getCharName(selectedAllies[0])} + ${getCharName(selectedAllies[1])} 조합 추천`
                    : `${getCharName(selectedAllies[0])} 포함 추천 조합`
                  if (typeof navigator.share === "function") {
                    navigator.share({ title, text: `${title} - 이리와지지 ER&GG`, url }).catch(() => {})
                    return
                  }
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/50 transition-colors"
              >
                <Share2 className="h-3 w-3" />
                {copied ? "복사됨!" : "공유"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedAllies([])}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border-light)] transition-colors"
              >
                <X className="h-3 w-3" />
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
