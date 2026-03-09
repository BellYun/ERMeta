"use client"

import * as React from "react"
import Image from "next/image"
import { X, Users, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
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
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3">
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
  compact = false,
}: {
  rec: TrioResult
  rank: number
  getCharName: (code: number) => string
  compact?: boolean
}) {
  const chars = [rec.character1, rec.character2, rec.character3]
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 hover:bg-[var(--color-surface-2)] transition-colors">
      {/* 순위 */}
      <span className="w-5 shrink-0 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
        {rank}
      </span>

      {/* 3캐릭터 */}
      <div className="flex items-center gap-1">
        {chars.map((code, i) => (
          <React.Fragment key={code}>
            <div className="flex flex-col items-center gap-0.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]">
                <Image
                  src={getCharacterImageUrl(code)}
                  alt={getCharName(code)}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              {!compact && (
                <span className="w-10 truncate text-center text-[9px] text-[var(--color-muted-foreground)]">
                  {getCharName(code)}
                </span>
              )}
            </div>
            {i < 2 && (
              <span className="text-[10px] text-[var(--color-border)]">+</span>
            )}
          </React.Fragment>
        ))}
      </div>

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
          <div className="hidden sm:flex flex-col">
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

  const [selectedAllies, setSelectedAllies] = React.useState<number[]>([])
  const [focusCharacters, setFocusCharacters] = React.useState<number[]>([])
  const [isFocusFilterEnabled, setIsFocusFilterEnabled] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortBy>("recommended")
  const [allySearch, setAllySearch] = React.useState("")
  const [focusSearch, setFocusSearch] = React.useState("")

  const [trioResults, setTrioResults] = React.useState<TrioResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  // API 호출: 아군 선택 / 정렬 변경 시
  React.useEffect(() => {
    if (selectedAllies.length === 0) {
      setTrioResults([])
      return
    }

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

    setLoading(true)
    setError(null)

    fetch(`/api/stats/trios?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "API 오류")
        setTrioResults(data.results ?? [])
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      )
      .finally(() => setLoading(false))
  }, [selectedAllies, sortBy])

  // 아군 검색 필터
  const filteredAllyCodes = React.useMemo(() => {
    if (!allySearch.trim()) return ALL_CHARACTER_CODES
    const q = allySearch.trim().toLowerCase()
    return ALL_CHARACTER_CODES.filter((code) =>
      getCharName(code).toLowerCase().includes(q)
    )
  }, [allySearch, getCharName])

  // 관심 캐릭터 검색 필터
  const filteredFocusCodes = React.useMemo(() => {
    if (!focusSearch.trim()) return ALL_CHARACTER_CODES
    const q = focusSearch.trim().toLowerCase()
    return ALL_CHARACTER_CODES.filter((code) =>
      getCharName(code).toLowerCase().includes(q)
    )
  }, [focusSearch, getCharName])

  const toggleAlly = (code: number) => {
    setSelectedAllies((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code)
      if (prev.length >= 2) return prev
      const slot = prev.length === 0 ? "A" : "B"
      analytics.synergyAllySelected(slot, code, getCharName(code))
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
    if (
      selectedAllies.length === 2 &&
      isFocusFilterEnabled &&
      focusCharacters.length > 0
    ) {
      const [allyA, allyB] = selectedAllies
      const focusSet = new Set(focusCharacters)
      scopedResults = trioResults.filter((rec) => {
        const third = getThirdCharacter(rec, allyA, allyB)
        return third !== null && focusSet.has(third)
      })
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
  }, [trioResults, selectedAllies, focusCharacters, isFocusFilterEnabled, sortBy])

  return (
    <div className={cn(compact ? "flex flex-col gap-4" : "flex flex-col lg:flex-row gap-4 items-start")}>
      {/* 상단(모바일) / 좌측(데스크탑): 아군/관심 캐릭터 선택 */}
      <div className={cn(compact ? "w-full" : "w-full lg:w-[240px] lg:shrink-0", "flex flex-col gap-3")}>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
          <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">
            아군 선택 (최대 2명)
          </p>

          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <input
              value={allySearch}
              onChange={(e) => setAllySearch(e.target.value)}
              placeholder="아군 검색"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div className={cn("grid gap-1 max-h-[200px] lg:max-h-[300px] overflow-y-auto", compact ? "grid-cols-5 sm:grid-cols-6" : "grid-cols-5 sm:grid-cols-6 lg:grid-cols-3")}>
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
        </div>

        {isFocusFilterEnabled && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                관심 캐릭터 필터 (다중)
              </p>
              {focusCharacters.length > 0 && (
                <button
                  onClick={() => setFocusCharacters([])}
                  className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  초기화
                </button>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <input
                value={focusSearch}
                onChange={(e) => setFocusSearch(e.target.value)}
                placeholder="관심 캐릭터 검색"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div className={cn("grid gap-1 max-h-[200px] lg:max-h-[300px] overflow-y-auto", compact ? "grid-cols-5 sm:grid-cols-6" : "grid-cols-5 sm:grid-cols-6 lg:grid-cols-3")}>
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
          </div>
        )}
      </div>

      {/* 우측: 선택 슬롯 + 필터 + 결과 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 선택 슬롯 */}
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

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-foreground)]">
                관심 캐릭터 필터
              </p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                내가 플레이 가능한 캐릭터를 선택해 최선의 조합을 찾아보세요
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFocusFilterEnabled && focusCharacters.length > 0 && (
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {focusCharacters.length}명 선택됨
                </span>
              )}
              <button
                onClick={() => setIsFocusFilterEnabled((prev) => !prev)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                  isFocusFilterEnabled
                    ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                )}
              >
                {isFocusFilterEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>
          {!isFocusFilterEnabled && (
            <p className="mt-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              ON으로 전환하면 플레이 가능한 캐릭터를 선택해 그 캐릭터가 포함된 조합만 볼 수 있습니다.
            </p>
          )}
        </div>

        {isFocusFilterEnabled && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                관심 캐릭터 필터
              </p>
              {focusCharacters.length > 0 && (
                <button
                  onClick={() => setFocusCharacters([])}
                  className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
            {focusCharacters.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {focusCharacters.map((code) => (
                  <button
                    key={`focus-chip-${code}`}
                    onClick={() => toggleFocus(code)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] text-[var(--color-foreground)] hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded">
                      <Image
                        src={getCharacterImageUrl(code)}
                        alt={getCharName(code)}
                        fill
                        className="object-cover"
                        sizes="20px"
                      />
                    </span>
                    <span className="max-w-24 truncate">{getCharName(code)}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
                좌측에서 내가 플레이 가능한 캐릭터를 선택하세요. 아군 2명 확정 시 선택한 캐릭터가 3번째 멤버인 조합만 표시됩니다.
              </p>
            )}
          </div>
        )}

        {/* 정렬 기준 */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 self-start">
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

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            {selectedAllies.length === 0
              ? "캐릭터를 선택하면 조합이 표시됩니다"
              : selectedAllies.length === 1
              ? `${getCharName(selectedAllies[0])} 포함 추천 조합`
              : `${getCharName(selectedAllies[0])} + ${getCharName(selectedAllies[1])} 조합${
                  isFocusFilterEnabled && focusCharacters.length > 0
                    ? ` (관심 캐릭터 ${focusCharacters.length}명 필터 적용)`
                    : ""
                }`}
          </h2>
          {selectedAllies.length > 0 && (
            <button
              onClick={() => setSelectedAllies([])}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              아군 초기화
            </button>
          )}
        </div>

        {/* 결과 목록 */}
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              캐릭터를 1~2명 선택하세요
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              조합 데이터 로딩 중...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recommendations.map((rec, i) => (
              <ComboCard
                key={`${rec.character1}-${rec.character2}-${rec.character3}`}
                rec={rec}
                rank={i + 1}
                getCharName={getCharName}
                compact={compact}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              해당 조합 데이터가 없습니다
            </p>
            <button
              onClick={() => setSelectedAllies([])}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              아군 초기화하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
