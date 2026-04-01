"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getCharacterMiniWebpUrl } from "@/lib/characterMap"

const CELL_MIN_WIDTH = 72
const ROW_HEIGHT = 82

export interface CharacterCellStats {
  tier: string
  winRate: number
}

interface VirtualCharacterGridProps {
  codes: number[]
  getCharName: (code: number) => string
  isSelected: (code: number) => boolean
  isDisabled?: (code: number) => boolean
  onSelect: (code: number) => void
  maxHeight?: string
  className?: string
  emptyMessage?: string
  scrollToCode?: number
  statsMap?: Map<number, CharacterCellStats>
}

const TIER_COLOR_MAP: Record<string, string> = {
  S: "var(--color-tier-s)",
  A: "var(--color-tier-a)",
  B: "var(--color-tier-b)",
  C: "var(--color-tier-c)",
  D: "var(--color-tier-d)",
}

const CharacterCell = React.memo(function CharacterCell({
  code,
  name,
  selected,
  disabled,
  onSelect,
  cellStats,
}: {
  code: number
  name: string
  selected: boolean
  disabled: boolean
  onSelect: (code: number) => void
  cellStats?: CharacterCellStats
}) {
  return (
    <button
      onClick={() => onSelect(code)}
      disabled={disabled}
      title={name}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : disabled
          ? "opacity-30 cursor-not-allowed"
          : "hover:bg-[var(--color-surface-2)]"
      )}
    >
      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(code)}
          alt={name}
          fill
          className="object-cover"
          sizes="40px"
        />
        {cellStats && (
          <span
            className="absolute top-0 right-0 flex items-center justify-center rounded-bl-sm rounded-tr-md text-white font-bold leading-none"
            style={{
              width: 14,
              height: 14,
              fontSize: 8,
              backgroundColor: `color-mix(in srgb, ${TIER_COLOR_MAP[cellStats.tier] ?? "var(--color-tier-d)"} 80%, transparent)`,
            }}
          >
            {cellStats.tier}
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
        {name}
      </span>
      {cellStats && (
        <span
          className="w-full truncate text-center font-medium leading-none"
          style={{
            fontSize: 9,
            color: cellStats.winRate > 12.5 ? "var(--color-stat-up)" : "var(--color-stat-down)",
          }}
        >
          {cellStats.winRate.toFixed(1)}%
        </span>
      )}
    </button>
  )
})

export function VirtualCharacterGrid({
  codes,
  getCharName,
  isSelected,
  isDisabled,
  onSelect,
  maxHeight,
  className,
  emptyMessage = "검색 결과 없음",
  scrollToCode,
  statsMap,
}: VirtualCharacterGridProps) {
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [columns, setColumns] = React.useState(4)

  React.useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      setColumns(Math.max(1, Math.floor(width / CELL_MIN_WIDTH)))
    }
    update()
    const observer = new ResizeObserver(() => update())
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rowCount = Math.ceil(codes.length / columns)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  })

  // Auto-scroll to target code
  React.useEffect(() => {
    if (scrollToCode == null) return
    const index = codes.indexOf(scrollToCode)
    if (index === -1) return
    const rowIndex = Math.floor(index / columns)
    virtualizer.scrollToIndex(rowIndex, { align: "center", behavior: "smooth" })
  }, [scrollToCode, codes, columns, virtualizer])

  if (codes.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-y-auto pr-0.5", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns
          const rowCodes = codes.slice(startIndex, startIndex + columns)
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                width: "100%",
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: "4px",
              }}
            >
              {rowCodes.map((code) => (
                <CharacterCell
                  key={code}
                  code={code}
                  name={getCharName(code)}
                  selected={isSelected(code)}
                  disabled={isDisabled?.(code) ?? false}
                  onSelect={onSelect}
                  cellStats={statsMap?.get(code)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
