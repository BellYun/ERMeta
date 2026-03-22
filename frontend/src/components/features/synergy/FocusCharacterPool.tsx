"use client"

import * as React from "react"
import Image from "next/image"
import { X, Search, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap"
import { useL10n } from "@/components/L10nProvider"
const VirtualCharacterGrid = React.lazy(() =>
  import("@/components/ui/VirtualCharacterGrid").then((m) => ({ default: m.VirtualCharacterGrid }))
)
import { useFocusCharacters } from "@/hooks/useFocusCharacters"
import { getAllCharacterCodes, getFallbackMap } from "./constants"
import { matchesChosungSearch } from "./utils"

/**
 * 내 캐릭터 풀 Island — localStorage 기반 독립 Client Component
 * 다른 Island(SynergyResults)과 useFocusCharacters 훅으로 상태 공유
 */
export function FocusCharacterPool() {
  const { l10n } = useL10n()
  const { focusCharacters, setFocusCharacters, toggleFocus } = useFocusCharacters()
  const [isFocusExpanded, setIsFocusExpanded] = React.useState(false)
  const [focusSearch, setFocusSearch] = React.useState("")

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  )

  const deferredSearch = React.useDeferredValue(focusSearch)

  const filteredFocusCodes = React.useMemo(() => {
    if (!deferredSearch.trim()) return getAllCharacterCodes()
    const q = deferredSearch.trim()
    return getAllCharacterCodes().filter((code) =>
      matchesChosungSearch(getCharName(code), q)
    )
  }, [deferredSearch, getCharName])

  const isSelected = React.useCallback(
    (code: number) => focusCharacters.includes(code),
    [focusCharacters]
  )

  return (
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
                  src={getCharacterMiniWebpUrl(code)}
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

      {/* 펼친 상태: 검색 + 가상화 그리드 */}
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

          <React.Suspense fallback={<div className="h-[300px] rounded-lg bg-[var(--color-surface-2)] animate-pulse" />}>
            <VirtualCharacterGrid
              codes={filteredFocusCodes}
              getCharName={getCharName}
              isSelected={isSelected}
              onSelect={toggleFocus}
              maxHeight="300px"
            />
          </React.Suspense>
        </div>
      )}
    </div>
  )
}
