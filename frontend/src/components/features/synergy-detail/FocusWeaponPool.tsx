"use client"

import * as React from "react"
import Image from "next/image"
import { X, Search, ChevronDown, ChevronUp } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap"
import { useL10n } from "@/components/L10nProvider"
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons"
import { FALLBACK_MAP } from "../synergy/constants"
import { matchesChosungSearch } from "../synergy/utils"
import { ALL_CHAR_WEAPON_ITEMS, type CharWeaponItem } from "./WeaponAllySelector"

const CELL_MIN_WIDTH = 80
const ROW_HEIGHT = 88

const FocusCell = React.memo(function FocusCell({
  item,
  charName,
  selected,
  onSelect,
}: {
  item: CharWeaponItem
  charName: string
  selected: boolean
  onSelect: (charCode: number, weaponCode: number) => void
}) {
  return (
    <button
      onClick={() => onSelect(item.charCode, item.weaponCode)}
      title={item.weaponLabel ? `${charName} (${item.weaponLabel})` : charName}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : "hover:bg-[var(--color-surface-2)]"
      )}
    >
      <div className="relative h-9 w-9 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(item.charCode)}
          alt={charName}
          fill
          className="object-cover"
          sizes="36px"
        />
      </div>
      <span className="w-full truncate text-center text-[10px] font-medium text-[var(--color-foreground)]">
        {charName}
      </span>
      {item.weaponLabel && (
        <span className="w-full truncate text-center text-[9px] text-[var(--color-muted-foreground)]">
          {item.weaponLabel}
        </span>
      )}
    </button>
  )
})

export function FocusWeaponPool() {
  const { l10n } = useL10n()
  const { focusCharWeapons, setFocusCharWeapons, toggleFocus } = useFocusCharWeapons()
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [columns, setColumns] = React.useState(4)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  const deferredSearch = React.useDeferredValue(search)
  const filteredItems = React.useMemo(() => {
    if (!deferredSearch.trim()) return ALL_CHAR_WEAPON_ITEMS
    const q = deferredSearch.trim()
    return ALL_CHAR_WEAPON_ITEMS.filter((item) => {
      const name = getCharName(item.charCode) ?? ""
      return matchesChosungSearch(name, q) || (item.weaponLabel ?? "").includes(q)
    })
  }, [deferredSearch, getCharName])

  const isSelected = React.useCallback(
    (item: CharWeaponItem) =>
      focusCharWeapons.some(
        (f) => f.charCode === item.charCode && f.weaponCode === item.weaponCode
      ),
    [focusCharWeapons]
  )

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

  const rowCount = Math.ceil(filteredItems.length / columns)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  })

  const resolveLabel = (f: { charCode: number; weaponCode: number }) => {
    const item = ALL_CHAR_WEAPON_ITEMS.find(
      (i) => i.charCode === f.charCode && i.weaponCode === f.weaponCode
    )
    const name = getCharName(f.charCode)
    return item?.weaponLabel ? `${name} (${item.weaponLabel})` : name
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      {/* 접이식 헤더 */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-foreground)]">
            내 캐릭터 풀
          </span>
          {focusCharWeapons.length > 0 && (
            <span className="rounded-full bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              {focusCharWeapons.length}개
            </span>
          )}
          {focusCharWeapons.length === 0 && (
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              내가 플레이 가능한 캐릭터+무기를 미리 설정하세요
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {focusCharWeapons.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setFocusCharWeapons([])
              }}
              className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-2)]"
            >
              초기화
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
        </div>
      </button>

      {/* 접힌 상태: 선택된 칩 표시 */}
      {!isExpanded && focusCharWeapons.length > 0 && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {focusCharWeapons.map((f) => (
            <button
              key={`${f.charCode}-${f.weaponCode}`}
              onClick={() => toggleFocus(f.charCode, f.weaponCode)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] text-[var(--color-foreground)] hover:bg-[var(--color-primary)]/20 transition-colors"
            >
              <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
                <Image
                  src={getCharacterMiniWebpUrl(f.charCode)}
                  alt={getCharName(f.charCode)}
                  fill
                  className="object-cover"
                  sizes="16px"
                />
              </span>
              <span className="max-w-20 truncate">{resolveLabel(f)}</span>
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      {/* 펼친 상태: 검색 + 가상화 그리드 */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="캐릭터 또는 무기 검색 (초성 가능: ㅎㅇ)"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">검색 결과 없음</p>
          ) : (
            <div
              ref={parentRef}
              className="overflow-y-auto pr-0.5"
              style={{ maxHeight: "340px" }}
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
                  const rowItems = filteredItems.slice(startIndex, startIndex + columns)
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
                      {rowItems.map((item) => (
                        <FocusCell
                          key={`${item.charCode}-${item.weaponCode}`}
                          item={item}
                          charName={getCharName(item.charCode)}
                          selected={isSelected(item)}
                          onSelect={toggleFocus}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
