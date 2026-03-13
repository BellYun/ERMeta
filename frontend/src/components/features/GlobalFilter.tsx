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
  const { patch, tier, patches, isLoading, setPatch, setTier } = useFilter()

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">패치</span>
        <Select
          value={patch || patches[0] || ""}
          onChange={(e) => { setPatch(e.target.value); analytics.patchSelected(e.target.value) }}
          disabled={isLoading}
        >
          {patches.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
          {patches.length === 0 && (
            <SelectItem value="" disabled>
              {isLoading ? "로딩 중..." : "패치 없음"}
            </SelectItem>
          )}
        </Select>
      </div>

      <div className="h-5 w-px bg-[var(--color-border)]" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">티어</span>
        <Tabs value={tier} onValueChange={(v) => { setTier(v); analytics.tierGroupSelected(v) }}>
          <TabsList className="flex-wrap h-auto">
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
