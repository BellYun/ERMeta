"use client"

import * as React from "react"
import { Select, SelectItem } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const patches = ["0.90.1", "0.90.0", "0.89.2", "0.89.1"]
const teamSizes = [
  { value: "all", label: "전체" },
  { value: "3", label: "3인" },
  { value: "2", label: "2인" },
  { value: "solo", label: "솔로" },
]

export function GlobalFilter() {
  const [patch, setPatch] = React.useState(patches[0])
  const [teamSize, setTeamSize] = React.useState("all")

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">패치</span>
        <Select value={patch} onChange={(e) => setPatch(e.target.value)}>
          {patches.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">인원</span>
        <Tabs value={teamSize} onValueChange={setTeamSize}>
          <TabsList>
            {teamSizes.map(({ value, label }) => (
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
