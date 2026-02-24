"use client"

import * as React from "react"
import { TierGroup } from "@/utils/tier"
import { cn } from "@/lib/utils"

interface TraitBuild {
  traits: number[]
  totalGames: number
  pickRate: number
  winRate: number
}

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon: number | null
}

function TraitChip({ code, name }: { code: number; name?: string }) {
  return (
    <span className="rounded-md bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
      {name ?? code}
    </span>
  )
}

export function CharacterTraitBuildAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [builds, setBuilds] = React.useState<TraitBuild[]>([])
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const [loading, setLoading] = React.useState(false)

  // 특성 이름 최초 1회 로드
  React.useEffect(() => {
    fetch("/api/traits/names")
      .then((r) => r.json())
      .then((d) => setTraitNames(d.names ?? {}))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!patchVersion) return

    setLoading(true)
    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    })

    fetch(`/api/builds/traits/main?${params}`)
      .then((r) => r.json())
      .then((d) => setBuilds(d.builds ?? []))
      .catch(() => setBuilds([]))
      .finally(() => setLoading(false))
  }, [characterCode, tier, patchVersion, bestWeapon])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        특성 빌드 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {builds.map((build, i) => (
        <div
          key={i}
          className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          {i === 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-gold)]">
              인기 빌드
            </span>
          )}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {build.traits.map((code) => (
              <TraitChip key={code} code={code} name={traitNames[code]} />
            ))}
          </div>
          <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
            <span>
              픽률{" "}
              <strong className="text-[var(--color-foreground)]">
                {build.pickRate.toFixed(1)}%
              </strong>
            </span>
            <span>
              승률{" "}
              <strong
                className={
                  build.winRate >= 55
                    ? "text-[var(--color-accent-gold)]"
                    : "text-[var(--color-foreground)]"
                }
              >
                {build.winRate.toFixed(1)}%
              </strong>
            </span>
            <span>
              표본{" "}
              <strong className="text-[var(--color-foreground)]">
                {build.totalGames.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
