"use client"

import * as React from "react"
import { X, Search } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useL10n } from "@/components/L10nProvider"
import { resolveCharacterName } from "@/lib/characterMap"
import { VirtualCharacterGrid } from "@/components/ui/VirtualCharacterGrid"
import { analytics } from "@/lib/analytics"
import { getAllCharacterCodes, getFallbackMap } from "./constants"
import { matchesChosungSearch } from "./utils"
import { SlotEmpty } from "./SlotEmpty"
import { SlotFilled } from "./SlotFilled"

/**
 * 아군 선택 Island — URL searchParams 기반 독립 Client Component
 * ally1, ally2를 URL에 직접 읽고 씀 → 다른 Island(SynergyResults)과 자동 동기화
 */
export function AllySelector() {
  const { l10n } = useL10n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [allySearch, setAllySearch] = React.useState("")

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  )

  // URL에서 아군 읽기
  const selectedAllies = React.useMemo(() => {
    const allies: number[] = []
    const a1 = searchParams.get("ally1")
    const a2 = searchParams.get("ally2")
    if (a1) {
      const code = parseInt(a1, 10)
      if (!isNaN(code) && getAllCharacterCodes().includes(code)) allies.push(code)
    }
    if (a2) {
      const code = parseInt(a2, 10)
      if (!isNaN(code) && getAllCharacterCodes().includes(code) && !allies.includes(code)) allies.push(code)
    }
    return allies
  }, [searchParams])

  // URL에 아군 쓰기
  const updateAllies = React.useCallback(
    (newAllies: number[]) => {
      const params = new URLSearchParams()
      if (newAllies[0] !== undefined) params.set("ally1", String(newAllies[0]))
      if (newAllies[1] !== undefined) params.set("ally2", String(newAllies[1]))
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  const toggleAlly = React.useCallback(
    (code: number) => {
      if (selectedAllies.includes(code)) {
        updateAllies(selectedAllies.filter((c) => c !== code))
      } else if (selectedAllies.length < 2) {
        const slot = selectedAllies.length === 0 ? "A" : "B"
        analytics.synergyAllySelected(slot, code, getCharName(code))
        updateAllies([...selectedAllies, code])
      }
    },
    [selectedAllies, updateAllies, getCharName]
  )

  const removeAlly = React.useCallback(
    (code: number) => updateAllies(selectedAllies.filter((c) => c !== code)),
    [selectedAllies, updateAllies]
  )

  const deferredSearch = React.useDeferredValue(allySearch)

  const filteredAllyCodes = React.useMemo(() => {
    if (!deferredSearch.trim()) return getAllCharacterCodes()
    const q = deferredSearch.trim()
    return getAllCharacterCodes().filter((code) =>
      matchesChosungSearch(getCharName(code), q)
    )
  }, [deferredSearch, getCharName])

  const isSelected = React.useCallback(
    (code: number) => selectedAllies.includes(code),
    [selectedAllies]
  )

  const isDisabled = React.useCallback(
    (code: number) => !selectedAllies.includes(code) && selectedAllies.length >= 2,
    [selectedAllies]
  )

  return (
    <>
      {/* 슬롯 표시 */}
      <div className="flex gap-3">
        {selectedAllies[0] !== undefined ? (
          <SlotFilled
            code={selectedAllies[0]}
            name={getCharName(selectedAllies[0])}
            onRemove={() => removeAlly(selectedAllies[0])}
          />
        ) : (
          <SlotEmpty index={0} />
        )}
        {selectedAllies[1] !== undefined ? (
          <SlotFilled
            code={selectedAllies[1]}
            name={getCharName(selectedAllies[1])}
            onRemove={() => removeAlly(selectedAllies[1])}
          />
        ) : (
          <SlotEmpty index={1} />
        )}
      </div>

      {/* 검색 + 가상화 그리드 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">
          아군 선택 (최대 2명)
        </p>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={allySearch}
            onChange={(e) => setAllySearch(e.target.value)}
            placeholder="아군 검색 (초성 가능: ㅎㅇ)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          {allySearch && (
            <button
              onClick={() => setAllySearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <VirtualCharacterGrid
          codes={filteredAllyCodes}
          getCharName={getCharName}
          isSelected={isSelected}
          isDisabled={isDisabled}
          onSelect={toggleAlly}
          maxHeight="300px"
        />
      </div>
    </>
  )
}
