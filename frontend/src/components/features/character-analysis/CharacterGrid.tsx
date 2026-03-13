"use client"

import * as React from "react"
import Image from "next/image"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import { analytics } from "@/lib/analytics"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

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

      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-3 gap-1 max-h-[320px] lg:max-h-[620px] overflow-y-auto pr-0.5">
        {filteredCodes.length === 0 ? (
          <p className="col-span-5 sm:col-span-6 lg:col-span-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
            검색 결과 없음
          </p>
        ) : null}
        {filteredCodes.map((code) => (
          <button
            key={code}
            ref={selectedCode === code ? selectedRef : undefined}
            onClick={() => {
              onSelect(code)
              setSearchQuery("")
              const params = new URLSearchParams(searchParams.toString())
              params.set("character", String(code))
              router.replace(`${pathname}?${params.toString()}`, { scroll: false })
              analytics.characterViewed(code, getCharacterName(code))
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
              selectedCode === code
                ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                : "hover:bg-[var(--color-surface-2)]"
            )}
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
              <Image
                src={getCharacterImageUrl(code)}
                alt={getCharacterName(code)}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            </div>
            <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
              {getCharacterName(code)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
