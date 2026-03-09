"use client"

import * as React from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"

interface TrioResult {
  character1: number
  character2: number
  character3: number
  winRate: number
  averageRP: number
  totalGames: number
  averageRank: number
}

const FALLBACK_MAP = buildFallbackMap()

export function TopTriosPreview() {
  const { l10n } = useL10n()
  const [results, setResults] = React.useState<TrioResult[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  React.useEffect(() => {
    fetch("/api/stats/trios?sortBy=totalGames&limit=200")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "API 오류")
        setResults(
          (data.results ?? [])
            .filter((r: TrioResult) => r.averageRP >= 0 && r.totalGames >= 20)
            .sort((a: TrioResult, b: TrioResult) => b.averageRP - a.averageRP)
            .slice(0, 5)
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : "오류가 발생했습니다."))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--color-danger)]">{error}</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {results.map((rec, i) => {
        const chars = [rec.character1, rec.character2, rec.character3]
        return (
          <div
            key={`${rec.character1}-${rec.character2}-${rec.character3}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <span className="w-5 shrink-0 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
              {i + 1}
            </span>
            <div className="flex items-center gap-1">
              {chars.map((code, ci) => (
                <React.Fragment key={code}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]">
                      <Image
                        src={getCharacterImageUrl(code)}
                        alt={getCharName(code)}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <span className="w-10 truncate text-center text-[9px] text-[var(--color-muted-foreground)]">
                      {getCharName(code)}
                    </span>
                  </div>
                  {ci < 2 && (
                    <span className="text-[10px] text-[var(--color-border)]">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4 text-right">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</span>
                <span className="text-sm font-semibold text-[var(--color-accent-gold)]">
                  +{rec.averageRP.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
                <span className={cn(
                  "text-sm font-semibold",
                  rec.winRate >= 60
                    ? "text-[var(--color-accent-gold)]"
                    : rec.winRate >= 55
                    ? "text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)]"
                )}>
                  {rec.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">게임 수</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {rec.totalGames.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
