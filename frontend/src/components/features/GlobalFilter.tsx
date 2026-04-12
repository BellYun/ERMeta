"use client"

import * as React from "react"
import { analytics } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { useFilter } from "./FilterContext"

const TIER_OPTIONS = [
  { value: "DIAMOND", label: "다이아" },
  { value: "METEORITE", label: "메테오라이트" },
  { value: "MITHRIL", label: "미스릴" },
]

export function GlobalFilter() {
  const { patch, tier, patches, setPatch, setTier } = useFilter()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
      {/* Patch selector */}
      <div className="relative">
        <select
          value={patch || patches[0] || ""}
          onChange={(e) => {
            setPatch(e.target.value)
            analytics.patchSelected(e.target.value)
          }}
          className={cn(
            "appearance-none w-full sm:w-auto",
            "px-3 py-2 pr-8",
            "rounded-lg",
            "bg-[var(--color-surface-2)] border border-[var(--color-border)]",
            "text-sm font-medium text-[var(--color-foreground)]",
            "hover:border-[var(--color-border-light)]",
            "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30",
            "transition-all cursor-pointer"
          )}
        >
          {patches.map((p) => (
            <option key={p} value={p}>
              패치 {p}
            </option>
          ))}
          {patches.length === 0 && (
            <option value="" disabled>
              패치 없음
            </option>
          )}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Tier segmented control */}
      <div className="flex rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] p-0.5">
        {TIER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setTier(value)
              analytics.tierGroupSelected(value)
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap",
              "min-h-[32px] touch-manipulation",
              tier === value
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
