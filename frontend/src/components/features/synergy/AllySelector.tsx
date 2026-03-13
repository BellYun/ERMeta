"use client"

import Image from "next/image"
import { X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCharacterImageUrl } from "@/lib/characterMap"
import { SlotEmpty } from "./SlotEmpty"
import { SlotFilled } from "./SlotFilled"

interface AllySelectorProps {
  selectedAllies: number[]
  getCharName: (code: number) => string
  removeAlly: (code: number) => void
  toggleAlly: (code: number) => void
  filteredAllyCodes: number[]
  allySearch: string
  setAllySearch: (s: string) => void
}

export function AllySelector({
  selectedAllies,
  getCharName,
  removeAlly,
  toggleAlly,
  filteredAllyCodes,
  allySearch,
  setAllySearch,
}: AllySelectorProps) {
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

      {/* 검색 + 그리드 */}
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

        {filteredAllyCodes.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
            검색 결과 없음
          </p>
        ) : (
          <div data-sr-block className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
            {filteredAllyCodes.map((code) => {
              const isSelected = selectedAllies.includes(code)
              const isDisabled = !isSelected && selectedAllies.length >= 2
              const name = getCharName(code)
              return (
                <button
                  key={`ally-${code}`}
                  onClick={() => toggleAlly(code)}
                  disabled={isDisabled}
                  title={name}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                    isSelected
                      ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                      : isDisabled
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
            })}
          </div>
        )}
      </div>
    </>
  )
}
