"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectItem } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TIER_OPTIONS = [
  { value: "DIAMOND", label: "다이아" },
  { value: "METEORITE", label: "운석" },
  { value: "MITHRIL", label: "미스릴" },
  { value: "IN1000", label: "상위 1000" },
]

export function GlobalFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [patches, setPatches] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const patch = searchParams.get("patch") ?? ""
  const tier = searchParams.get("tier") ?? "MITHRIL"

  React.useEffect(() => {
    setIsLoading(true)
    fetch("/api/patches/history?limit=10")
      .then((res) => res.json())
      .then((data: { patches?: string[] }) => {
        const list = data.patches ?? []
        setPatches(list)
        // URL에 patch가 없으면 가장 최신 패치로 초기화
        if (!searchParams.get("patch") && list.length > 0) {
          const params = new URLSearchParams(searchParams.toString())
          params.set("patch", list[0])
          if (!params.get("tier")) params.set("tier", "MITHRIL")
          router.replace(`?${params.toString()}`)
        }
      })
      .catch(() => setPatches([]))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">패치</span>
        <Select
          value={patch || patches[0] || ""}
          onChange={(e) => updateParam("patch", e.target.value)}
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

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">티어</span>
        <Tabs value={tier} onValueChange={(v) => updateParam("tier", v)}>
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
