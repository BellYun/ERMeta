"use client"

import { Search } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as React from "react"
import { analytics } from "@/lib/analytics"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import { cn } from "@/lib/utils"
import { CHARACTER_CODES } from "./constants"

// ── 초성 검색 유틸 ──
const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
const CHOSUNG_SET = new Set(CHOSUNG)

function getChosung(str: string): string {
  return [...str]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00
      if (code < 0 || code > 11171) return ch
      return CHOSUNG[Math.floor(code / 588)]
    })
    .join("")
}

function isChosungOnly(str: string): boolean {
  return [...str].every((ch) => CHOSUNG_SET.has(ch))
}

function matchesQuery(name: string, q: string): boolean {
  if (isChosungOnly(q)) {
    return getChosung(name).includes(q)
  }
  return name.includes(q)
}

const sortedCodes = [...CHARACTER_CODES].sort((a, b) =>
  getCharacterName(a).localeCompare(getCharacterName(b), "ko")
)

interface CharacterPickerProps {
  code: number
  currentPatch: string | null
}

export function CharacterPicker({ code }: CharacterPickerProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [highlightIndex, setHighlightIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim()
    if (!q) return sortedCodes
    return sortedCodes.filter((c) => matchesQuery(getCharacterName(c), q))
  }, [query])

  const select = React.useCallback(
    (c: number) => {
      setQuery("")
      setOpen(false)
      setHighlightIndex(-1)
      inputRef.current?.blur()
      router.push(`/character/${c}`, { scroll: false })
      analytics.characterViewed(c, getCharacterName(c))
    },
    [router],
  )

  // 외부 클릭 닫기
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // 하이라이트 스크롤
  React.useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== "Escape") {
      setOpen(true)
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          select(filtered[highlightIndex])
        } else if (filtered.length === 1) {
          select(filtered[0])
        }
        break
      case "Escape":
        setOpen(false)
        setHighlightIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-[320px] ml-auto">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlightIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="캐릭터 검색 (초성 가능)"
          className={cn(
            "w-full rounded-xl border bg-[var(--color-surface)]/80 pl-9 pr-4 py-2.5 text-sm text-[var(--color-foreground)]",
            "placeholder:text-[var(--color-muted-foreground)]",
            "outline-none transition-all",
            open
              ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30 rounded-b-none"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50",
          )}
        />
      </div>

      {/* 자동완성 드롭다운 */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 top-full right-0 w-full max-h-[280px] overflow-y-auto rounded-b-xl border border-t-0 border-[var(--color-primary)] bg-[var(--color-surface)] shadow-2xl"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[var(--color-muted-foreground)]">
              일치하는 캐릭터가 없습니다
            </div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(c)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                  c === code && "bg-[var(--color-primary)]/5",
                  highlightIndex === i
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                )}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                  <Image
                    src={getCharacterImageUrl(c)}
                    alt={getCharacterName(c)}
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized
                  />
                </div>
                <span className={cn(
                  "font-medium",
                  c === code && "text-[var(--color-primary)]",
                )}>
                  {getCharacterName(c)}
                </span>
                {c === code && (
                  <span className="ml-auto text-[10px] text-[var(--color-primary)] font-medium">현재</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
