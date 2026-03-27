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
  { value: "IN1000", label: "TOP 1000" },
]

export function GlobalFilter() {
  const { patch, tier, patches, setPatch, setTier } = useFilter()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <Select
        wrapperClassName="w-full sm:w-40"
        value={patch || patches[0] || ""}
        onChange={(e) => { setPatch(e.target.value); analytics.patchSelected(e.target.value) }}
      >
        {patches.map((p) => (
          <SelectItem key={p} value={p}>
            패치 {p}
          </SelectItem>
        ))}
        {patches.length === 0 && (
          <SelectItem value="" disabled>
            패치 없음
          </SelectItem>
        )}
      </Select>

      <Tabs value={tier} onValueChange={(v) => { setTier(v); analytics.tierGroupSelected(v) }}>
        <TabsList className="w-full sm:w-auto">
          {TIER_OPTIONS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
