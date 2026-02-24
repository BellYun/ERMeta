"use client"

import * as React from "react"
import { TierGroup } from "@/utils/tier"
import { cn } from "@/lib/utils"

interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number
  winRate: number
}

interface TraitCoreGroup {
  mainCore: number | null
  totalGames: number
  groupPickRate: number
  groupWinRate: number
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  sub3Options: TraitSubOption[]
  sub4Options: TraitSubOption[]
}

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon: number | null
}

function TraitChip({ code, name, variant = "sub" }: { code: number; name?: string; variant?: "core" | "sub" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "core"
          ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40"
          : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
      )}
    >
      {name ?? code}
    </span>
  )
}

function SubOptionChip({
  option,
  name,
}: {
  option: TraitSubOption
  name?: string
}) {
  if (option.code == null) return null
  return (
    <div className="flex flex-col items-center gap-0.5">
      <TraitChip code={option.code} name={name} variant="sub" />
      <span className="text-[10px] whitespace-nowrap flex gap-1">
        <span className="text-[var(--color-primary)]">{option.pickRate.toFixed(1)}%</span>
        <span
          className={cn(
            option.winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
          )}
        >
          {option.winRate.toFixed(1)}%
        </span>
      </span>
    </div>
  )
}

export function CharacterTraitBuildAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [builds, setBuilds] = React.useState<TraitCoreGroup[]>([])
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const [loading, setLoading] = React.useState(false)

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
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
        특성 빌드 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[1fr_5rem_5rem_5rem] border-b border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-muted-foreground)]">
        <span>메인 특성</span>
        <span className="text-right">픽률</span>
        <span className="text-right">승률</span>
        <span className="text-right">표본</span>
      </div>

      {/* 그룹 목록 */}
      {builds.map((group, gi) => (
        <div
          key={gi}
          className={cn(
            "border-b border-[var(--color-border)] last:border-0",
            gi === 0 && "bg-[var(--color-accent-gold)]/5"
          )}
        >
          {/* mainCore 헤더 행 */}
          <div className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center px-4 py-3 gap-2 bg-[var(--color-surface-2)]/60">
            <div className="flex items-center gap-2">
              {gi === 0 && (
                <span className="text-xs font-bold text-[var(--color-accent-gold)]">#1</span>
              )}
              {group.mainCore != null ? (
                <TraitChip
                  code={group.mainCore}
                  name={traitNames[group.mainCore]}
                  variant="core"
                />
              ) : (
                <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
              )}
            </div>
            <span className="text-right text-xs text-[var(--color-muted-foreground)]">
              {group.groupPickRate.toFixed(1)}%
            </span>
            <span
              className={cn(
                "text-right text-xs font-medium",
                group.groupWinRate >= 55
                  ? "text-[var(--color-accent-gold)]"
                  : "text-[var(--color-foreground)]"
              )}
            >
              {group.groupWinRate.toFixed(1)}%
            </span>
            <span className="text-right text-xs text-[var(--color-muted-foreground)]">
              {group.totalGames.toLocaleString()}
            </span>
          </div>

          {/* sub1 옵션 행 */}
          {group.sub1Options.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-t border-[var(--color-border)]/40 pl-8">
              <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)] pt-1 w-10">
                서브1
              </span>
              <div className="flex flex-wrap gap-3">
                {group.sub1Options.map((opt, oi) => (
                  <SubOptionChip
                    key={oi}
                    option={opt}
                    name={opt.code != null ? traitNames[opt.code] : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* sub2 옵션 행 */}
          {group.sub2Options.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-t border-[var(--color-border)]/40 pl-8">
              <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)] pt-1 w-10">
                서브2
              </span>
              <div className="flex flex-wrap gap-3">
                {group.sub2Options.map((opt, oi) => (
                  <SubOptionChip
                    key={oi}
                    option={opt}
                    name={opt.code != null ? traitNames[opt.code] : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* sub3 옵션 행 */}
          {group.sub3Options.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-t border-[var(--color-border)]/40 pl-8">
              <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)] pt-1 w-10">
                서브3
              </span>
              <div className="flex flex-wrap gap-3">
                {group.sub3Options.map((opt, oi) => (
                  <SubOptionChip
                    key={oi}
                    option={opt}
                    name={opt.code != null ? traitNames[opt.code] : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* sub4 옵션 행 */}
          {group.sub4Options.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-t border-[var(--color-border)]/40 pl-8">
              <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)] pt-1 w-10">
                서브4
              </span>
              <div className="flex flex-wrap gap-3">
                {group.sub4Options.map((opt, oi) => (
                  <SubOptionChip
                    key={oi}
                    option={opt}
                    name={opt.code != null ? traitNames[opt.code] : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
