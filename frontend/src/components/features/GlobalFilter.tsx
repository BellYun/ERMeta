"use client"

import * as React from "react"
import { Select, SelectItem } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { analytics } from "@/lib/analytics"
import { useFilter } from "./FilterContext"

const TIER_OPTIONS = [
  { value: "DIAMOND", label: "다이아" },
  { value: "METEORITE", label: "운석" },
  { value: "MITHRIL", label: "미스릴" },
  { value: "IN1000", label: "상위 1000" },
]

export function GlobalFilter() {
  const { patch, tier, patches, setPatch, setTier } = useFilter()

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-2.5 sm:p-3">
      <div className="flex items-center gap-2 sm:w-auto">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] shrink-0">패치</span>
        <Select
          wrapperClassName="flex-1 sm:flex-none min-w-0"
          value={patch || patches[0] || ""}
          onChange={(e) => { setPatch(e.target.value); analytics.patchSelected(e.target.value) }}
        >
          {patches.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
          {patches.length === 0 && (
            <SelectItem value="" disabled>
              패치 없음
            </SelectItem>
          )}
        </Select>
      </div>

      <div className="hidden sm:block h-5 w-px bg-[var(--color-border)]" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] shrink-0">티어</span>
        <Tabs value={tier} onValueChange={(v) => { setTier(v); analytics.tierGroupSelected(v) }}>
          <TabsList className="w-full sm:w-auto h-auto">
            {TIER_OPTIONS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
