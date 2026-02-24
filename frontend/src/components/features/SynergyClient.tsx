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

type SortBy = "averageRP" | "winRate" | "totalGames"

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const FALLBACK_MAP = buildFallbackMap()

const ALL_CHARACTER_CODES: number[] = Array.from(FALLBACK_MAP.keys()).sort(
  (a, b) => a - b
)

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "averageRP", label: "평균 RP" },
  { value: "winRate", label: "승률" },
  { value: "totalGames", label: "게임 수" },
]

// ─── 헬퍼: 중복 제거 ──────────────────────────────────────────────────────────

function getSortValue(rec: TrioResult, sortBy: SortBy): number {
  if (sortBy === "averageRP") return rec.averageRP
  if (sortBy === "winRate") return rec.winRate
  return rec.totalGames
}

function deduplicateResults(
  results: TrioResult[],
  selectedCodes: number[],
  sortBy: SortBy
): TrioResult[] {
  if (selectedCodes.length === 2) {
    // character3 기준 중복 제거: 같은 character3면 지표가 더 좋은 1건만 유지
    const map = new Map<number, TrioResult>()
    for (const rec of results) {
      const key = rec.character3
      const existing = map.get(key)
      if (!existing || getSortValue(rec, sortBy) > getSortValue(existing, sortBy)) {
        map.set(key, rec)
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy)
    )
  }

  if (selectedCodes.length === 1) {
    const selected = selectedCodes[0]
    // 나머지 두 캐릭터 쌍(min-max) 기준 중복 제거
    const map = new Map<string, TrioResult>()
    for (const rec of results) {
      const others = [rec.character1, rec.character2, rec.character3].filter(
        (c) => c !== selected
      )
      const key = `${Math.min(...others)}-${Math.max(...others)}`
      const existing = map.get(key)
      if (!existing || getSortValue(rec, sortBy) > getSortValue(existing, sortBy)) {
        map.set(key, rec)
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy)
    )
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
      <span className="text-sm text-[var(--color-border)]">캐릭터 {index + 1} 선택</span>
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
  sortBy,
  getCharName,
}: {
  rec: TrioResult
  rank: number
  sortBy: SortBy
  getCharName: (code: number) => string
}) {
  const chars = [rec.character1, rec.character2, rec.character3]
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
      {/* 순위 */}
      <span className="w-6 shrink-0 text-center text-sm font-medium text-[var(--color-muted-foreground)]">
        {rank}
      </span>

      {/* 3캐릭터 */}
      <div className="flex items-center gap-1.5">
        {chars.map((code, i) => (
          <React.Fragment key={code}>
            <div className="flex flex-col items-center gap-1">
              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                <Image
                  src={getCharacterImageUrl(code)}
                  alt={getCharName(code)}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <span className="w-12 truncate text-center text-[10px] text-[var(--color-muted-foreground)]">
                {getCharName(code)}
              </span>
            </div>
            {i < 2 && (
              <span className="mb-3 text-xs text-[var(--color-border)]">+</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 스탯 */}
      <div className="ml-auto flex items-center gap-6 text-right">
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
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {rec.averageRP.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">게임 수</span>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {rec.totalGames.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            #{rec.averageRank.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function SynergyClient() {
  const { l10n } = useL10n()

  const [selectedCodes, setSelectedCodes] = React.useState<number[]>([])
  const [sortBy, setSortBy] = React.useState<SortBy>("totalGames")
  const [search, setSearch] = React.useState("")

  const [trioResults, setTrioResults] = React.useState<TrioResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  // API 호출: 선택 캐릭터 / 티어 / 정렬 변경 시
  React.useEffect(() => {
    if (selectedCodes.length === 0) {
      setTrioResults([])
      return
    }

    const params = new URLSearchParams({
      sortBy,
      limit: "100",
    })
    if (selectedCodes[0] !== undefined) {
      params.set("character1", String(selectedCodes[0]))
    }
    if (selectedCodes[1] !== undefined) {
      params.set("character2", String(selectedCodes[1]))
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
  }, [selectedCodes, sortBy])

  // 중복 제거 후 상위 20개
  const recommendations = React.useMemo(() => {
    if (selectedCodes.length === 0) return []
    const deduped = deduplicateResults(trioResults, selectedCodes, sortBy)
    return deduped.slice(0, 20)
  }, [trioResults, selectedCodes, sortBy])

  // 캐릭터 검색 필터
  const filteredCodes = React.useMemo(() => {
    if (!search.trim()) return ALL_CHARACTER_CODES
    const q = search.trim().toLowerCase()
    return ALL_CHARACTER_CODES.filter((code) =>
      getCharName(code).toLowerCase().includes(q)
    )
  }, [search, getCharName])

  const toggle = (code: number) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code))
    } else if (selectedCodes.length < 2) {
      setSelectedCodes([...selectedCodes, code])
    }
  }

  const remove = (code: number) =>
    setSelectedCodes(selectedCodes.filter((c) => c !== code))

  return (
    <div className="flex gap-4 items-start">
      {/* 좌측: 캐릭터 그리드 */}
      <div className="w-[228px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">
          캐릭터 선택 (최대 2명)
        </p>

        {/* 검색 */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="캐릭터 검색"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-1 max-h-[480px] overflow-y-auto">
          {filteredCodes.map((code) => {
            const isSelected = selectedCodes.includes(code)
            const isDisabled = !isSelected && selectedCodes.length >= 2
            const name = getCharName(code)
            return (
              <button
                key={code}
                onClick={() => toggle(code)}
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

      {/* 우측: 선택 슬롯 + 필터 + 결과 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 선택 슬롯 */}
        <div className="flex gap-3">
          {selectedCodes[0] !== undefined ? (
            <SlotFilled
              code={selectedCodes[0]}
              name={getCharName(selectedCodes[0])}
              onRemove={() => remove(selectedCodes[0])}
            />
          ) : (
            <SlotEmpty index={0} />
          )}
          {selectedCodes[1] !== undefined ? (
            <SlotFilled
              code={selectedCodes[1]}
              name={getCharName(selectedCodes[1])}
              onRemove={() => remove(selectedCodes[1])}
            />
          ) : (
            <SlotEmpty index={1} />
          )}
        </div>

        {/* 정렬 기준 */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 self-start">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
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
            {selectedCodes.length === 0
              ? "캐릭터를 선택하면 조합이 표시됩니다"
              : selectedCodes.length === 1
              ? `${getCharName(selectedCodes[0])} 포함 추천 조합`
              : `${getCharName(selectedCodes[0])} + ${getCharName(selectedCodes[1])} 조합`}
          </h2>
          {selectedCodes.length > 0 && (
            <button
              onClick={() => setSelectedCodes([])}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        {/* 결과 목록 */}
        {selectedCodes.length === 0 ? (
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
                sortBy={sortBy}
                getCharName={getCharName}
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
              onClick={() => setSelectedCodes([])}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              초기화하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
