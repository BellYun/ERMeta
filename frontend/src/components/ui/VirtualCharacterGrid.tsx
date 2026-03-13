"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getCharacterImageUrl } from "@/lib/characterMap"

const CELL_MIN_WIDTH = 72
const ROW_HEIGHT = 72

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
}

const CharacterCell = React.memo(function CharacterCell({
  code,
  name,
  selected,
  disabled,
  onSelect,
}: {
  code: number
  name: string
  selected: boolean
  disabled: boolean
  onSelect: (code: number) => void
}) {
  return (
    <button
      onClick={() => onSelect(code)}
      disabled={disabled}
      title={name}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : disabled
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
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
