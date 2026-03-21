"use client"

import * as React from "react"
import Image from "next/image"
import { X, Search } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useL10n } from "@/components/L10nProvider"
import { resolveCharacterName, getCharacterMiniWebpUrl } from "@/lib/characterMap"
import { cn } from "@/lib/utils"
import { FALLBACK_MAP, EXCLUDED_CHARACTER_CODES } from "../synergy/constants"
import { matchesChosungSearch } from "../synergy/utils"
import { SlotEmpty } from "../synergy/SlotEmpty"
import characterBestWeapons from "@/../const/characterBestWeapons.json"

// ─── 데이터 ──────────────────────────────────────────────────────────────────

const weaponData = characterBestWeapons as Record<
  string,
  { weaponCode: number; label: string; isDefault: boolean }[]
>

export interface CharWeaponItem {
  charCode: number
  weaponCode: number
  weaponLabel: string
}

/** 무기 분류하지 않는 캐릭터 (알렉스 등) */
const SINGLE_ENTRY_CHARS = new Set([27])

/** 캐릭터+무기 플랫 리스트 (가나다순, 기본무기 우선) */
export const ALL_CHAR_WEAPON_ITEMS: CharWeaponItem[] = (() => {
  const items: CharWeaponItem[] = []
  const sortedCodes = Array.from(FALLBACK_MAP.keys())
    .filter((code) => !EXCLUDED_CHARACTER_CODES.has(code))
    .sort((a, b) =>
      (FALLBACK_MAP.get(a) ?? "").localeCompare(FALLBACK_MAP.get(b) ?? "", "ko")
    )

  for (const charCode of sortedCodes) {
    const weapons = weaponData[String(charCode)]

    // 무기 분류 안 하는 캐릭터 또는 무기 데이터 없는 경우
    if (SINGLE_ENTRY_CHARS.has(charCode) || !weapons || weapons.length === 0) {
      items.push({ charCode, weaponCode: 0, weaponLabel: "" })
      continue
    }

    // 기본무기 우선
    const sorted = [...weapons].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
    for (const w of sorted) {
      items.push({ charCode, weaponCode: w.weaponCode, weaponLabel: w.label })
    }
  }
  return items
})()

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface AllySelection {
  charCode: number
  weaponCode: number | null
}

function parseAllyFromParams(
  params: URLSearchParams,
  allyKey: string,
  weaponKey: string
): AllySelection | null {
  const charStr = params.get(allyKey)
  if (!charStr) return null
  const charCode = parseInt(charStr, 10)
  if (isNaN(charCode)) return null
  const wStr = params.get(weaponKey)
  const weaponCode = wStr ? parseInt(wStr, 10) : null
  return { charCode, weaponCode: weaponCode && !isNaN(weaponCode) ? weaponCode : null }
}

// ─── 셀 ──────────────────────────────────────────────────────────────────

const CELL_MIN_WIDTH = 80
const ROW_HEIGHT = 88

const CharWeaponCell = React.memo(function CharWeaponCell({
  item,
  charName,
  selected,
  disabled,
  onSelect,
}: {
  item: CharWeaponItem
  charName: string
  selected: boolean
  disabled: boolean
  onSelect: (item: CharWeaponItem) => void
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      disabled={disabled}
      title={`${charName} (${item.weaponLabel})`}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : disabled
          ? "opacity-30 cursor-not-allowed"
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

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export function WeaponAllySelector() {
  const { l10n } = useL10n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = React.useState("")
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [columns, setColumns] = React.useState(4)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  const ally1 = React.useMemo(() => parseAllyFromParams(searchParams, "ally1", "w1"), [searchParams])
  const ally2 = React.useMemo(() => parseAllyFromParams(searchParams, "ally2", "w2"), [searchParams])
  const selectedAllies = React.useMemo(() => [ally1, ally2].filter(Boolean) as AllySelection[], [ally1, ally2])

  const updateUrl = React.useCallback(
    (a1: AllySelection | null, a2: AllySelection | null) => {
      const params = new URLSearchParams()
      if (a1) {
        params.set("ally1", String(a1.charCode))
        if (a1.weaponCode) params.set("w1", String(a1.weaponCode))
      }
      if (a2) {
        params.set("ally2", String(a2.charCode))
        if (a2.weaponCode) params.set("w2", String(a2.weaponCode))
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  const isSelected = React.useCallback(
    (item: CharWeaponItem) =>
      selectedAllies.some(
        (a) => a.charCode === item.charCode && (a.weaponCode ?? 0) === item.weaponCode
      ),
    [selectedAllies]
  )

  const isDisabled = React.useCallback(
    (item: CharWeaponItem) => {
      if (isSelected(item)) return false
      // 같은 캐릭터의 다른 무기가 이미 선택되어 있으면 disabled
      if (selectedAllies.some((a) => a.charCode === item.charCode)) return true
      return selectedAllies.length >= 2
    },
    [selectedAllies, isSelected]
  )

  const handleSelect = React.useCallback(
    (item: CharWeaponItem) => {
      const sel: AllySelection = { charCode: item.charCode, weaponCode: item.weaponCode || null }

      // 이미 선택된 것이면 제거
      if (isSelected(item)) {
        if (ally1 && ally1.charCode === item.charCode) updateUrl(ally2, null)
        else if (ally2 && ally2.charCode === item.charCode) updateUrl(ally1, null)
        return
      }

      if (selectedAllies.length >= 2) return

      if (!ally1) updateUrl(sel, null)
      else updateUrl(ally1, sel)
    },
    [isSelected, ally1, ally2, selectedAllies, updateUrl]
  )

  const removeAlly = React.useCallback(
    (charCode: number) => {
      if (ally1?.charCode === charCode) updateUrl(ally2, null)
      else if (ally2?.charCode === charCode) updateUrl(ally1, null)
    },
    [ally1, ally2, updateUrl]
  )

  // 검색 필터
  const deferredSearch = React.useDeferredValue(search)
  const filteredItems = React.useMemo(() => {
    if (!deferredSearch.trim()) return ALL_CHAR_WEAPON_ITEMS
    const q = deferredSearch.trim()
    return ALL_CHAR_WEAPON_ITEMS.filter(
      (item) => {
        const name = getCharName(item.charCode) ?? ""
        return matchesChosungSearch(name, q) || (item.weaponLabel ?? "").includes(q)
      }
    )
  }, [deferredSearch, getCharName])

  // 그리드 컬럼 계산
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

  const resolveWeaponLabel = (a: AllySelection) => {
    const weapons = weaponData[String(a.charCode)]
    const w = weapons?.find((w) => w.weaponCode === a.weaponCode)
    return w?.label ?? "전체 무기"
  }

  return (
    <>
      {/* 슬롯 표시 */}
      <div className="flex gap-3">
        {ally1 ? (
          <SlotWeaponFilled
            code={ally1.charCode}
            name={getCharName(ally1.charCode)}
            weaponName={resolveWeaponLabel(ally1)}
            onRemove={() => removeAlly(ally1.charCode)}
          />
        ) : (
          <SlotEmpty index={0} />
        )}
        {ally2 ? (
          <SlotWeaponFilled
            code={ally2.charCode}
            name={getCharName(ally2.charCode)}
            weaponName={resolveWeaponLabel(ally2)}
            onRemove={() => removeAlly(ally2.charCode)}
          />
        ) : (
          <SlotEmpty index={1} />
        )}
      </div>

      {/* 검색 + 가상화 그리드 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">
          아군 선택 (최대 2명 · 캐릭터+무기군 단위)
        </p>

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
                      <CharWeaponCell
                        key={`${item.charCode}-${item.weaponCode}`}
                        item={item}
                        charName={getCharName(item.charCode)}
                        selected={isSelected(item)}
                        disabled={isDisabled(item)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── 슬롯 (무기 포함) ─────────────────────────────────────────────────────────

function SlotWeaponFilled({
  code,
  name,
  weaponName,
  onRemove,
}: {
  code: number
  name: string
  weaponName: string
  onRemove: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-4 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(code)}
          alt={name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{name}</span>
        <span className="text-[11px] text-[var(--color-primary)]">{weaponName}</span>
      </div>
      <button
        onClick={onRemove}
        className="rounded-md p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
