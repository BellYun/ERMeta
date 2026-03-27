"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { getCharacterName } from "@/lib/characterMap"
import { analytics } from "@/lib/analytics"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { VirtualCharacterGrid } from "@/components/ui/VirtualCharacterGrid"

interface CharacterGridProps {
  selectedCode: number
  onSelect: (code: number) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  filteredCodes: number[]
  selectedRef: React.RefObject<HTMLButtonElement | null>
  searchTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>
}

export function CharacterGrid({
  selectedCode,
  onSelect,
  searchQuery,
  setSearchQuery,
  filteredCodes,
  selectedRef,
  searchTimerRef,
}: CharacterGridProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const handleSelect = React.useCallback(
    (code: number) => {
      onSelect(code)
      setSearchQuery("")
      const params = new URLSearchParams(searchParams.toString())
      params.set("character", String(code))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      analytics.characterViewed(code, getCharacterName(code))
    },
    [onSelect, setSearchQuery, searchParams, router, pathname]
  )

  const isSelected = React.useCallback(
    (code: number) => selectedCode === code,
    [selectedCode]
  )

  const getName = React.useCallback(
    (code: number) => getCharacterName(code),
    []
  )

  return (
    <div className="w-full lg:w-[260px] lg:shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[var(--color-border)]/60">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className="text-xs font-semibold text-[var(--color-foreground)]">캐릭터 선택</span>
          <span className="ml-auto text-[10px] text-[var(--color-muted-foreground)]">{filteredCodes.length}명</span>
        </div>
      </div>

      <div className="p-2">
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
              if (e.target.value.trim()) {
                searchTimerRef.current = setTimeout(() => {
                  analytics.characterSearched(e.target.value.trim())
                }, 800)
              }
            }}
            placeholder="캐릭터 검색"
            className="w-full rounded-lg bg-[var(--color-surface-2)] pl-8 pr-8 py-2 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <VirtualCharacterGrid
          codes={filteredCodes}
          getCharName={getName}
          isSelected={isSelected}
          onSelect={handleSelect}
          className="max-h-[280px] sm:max-h-[320px] lg:max-h-[620px]"
          scrollToCode={selectedCode}
        />
      </div>
    </div>
  )
}
