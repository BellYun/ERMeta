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
    <div className="w-full lg:w-[260px] lg:shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-2">
      {/* 검색 */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)] pointer-events-none" />
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
          className="w-full rounded bg-[var(--color-surface-2)] pl-7 pr-7 py-1.5 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-primary)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
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
  )
}
