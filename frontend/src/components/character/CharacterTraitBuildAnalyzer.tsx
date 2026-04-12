"use client"

import Image from "next/image"
import * as React from "react"
import { cn } from "@/lib/utils"
import { TierGroup } from "@/utils/tier"

// ─── 특성 그룹 분류 ───────────────────────────────────────────────────────────

type TraitGroup = "havoc" | "fortification" | "support" | "chaos" | "unknown"

const GROUP_CONFIG: Record<TraitGroup, { label: string; letter: string; bg: string; text: string; ring: string }> = {
  havoc:         { label: "파괴", letter: "파", bg: "bg-red-500/20",     text: "text-red-400",     ring: "ring-red-500/40" },
  fortification: { label: "저항", letter: "저", bg: "bg-blue-500/20",    text: "text-blue-400",    ring: "ring-blue-500/40" },
  support:       { label: "지원", letter: "지", bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-500/40" },
  chaos:         { label: "혼돈", letter: "혼", bg: "bg-purple-500/20",  text: "text-purple-400",  ring: "ring-purple-500/40" },
  unknown:       { label: "?",   letter: "?",  bg: "bg-[var(--color-surface-2)]", text: "text-[var(--color-muted-foreground)]", ring: "ring-[var(--color-border)]" },
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number
  winRate: number
}

interface TraitSecondaryInfo {
  secGroup: TraitGroup
  totalGames: number
  pickRate: number
  winRate: number
  optionTrait1Options: TraitSubOption[]
  optionTrait2Options: TraitSubOption[]
}

interface TraitMainGroup {
  mainGroup: TraitGroup
  totalGames: number
  groupPickRate: number
  groupWinRate: number
  mainCoreOptions: TraitSubOption[]
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  secondaries: TraitSecondaryInfo[]
}

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon: number | null
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function TraitIcon({ code, name, pickRate, winRate, size = 28 }: {
  code: number
  name?: string
  pickRate: number
  winRate: number
  size?: number
}) {
  const [imgError, setImgError] = React.useState(false)
  const isEmpty = pickRate === 0

  return (
    <div className={cn("flex flex-col items-center gap-0.5", isEmpty && "opacity-30")}>
      <div className={cn(
        "relative rounded-md p-0.5",
        !isEmpty && pickRate >= 30 ? "ring-1 ring-[var(--color-accent-gold)]/60" : ""
      )}>
        {!imgError ? (
          <Image
            src={`/TraitSkill/TraitSkillIcon_${code}.png`}
            alt={name ?? String(code)}
            width={size}
            height={size}
            className="rounded-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="inline-flex items-center justify-center rounded-sm bg-[var(--color-surface-2)] text-[9px] font-bold text-[var(--color-muted-foreground)]"
            style={{ width: size, height: size }}>
            {code}
          </span>
        )}
      </div>
      <span className="text-[9px] text-[var(--color-foreground)] truncate max-w-[48px] text-center">
        {name ?? code}
      </span>
      <span className={cn(
        "text-[8px]",
        isEmpty ? "text-[var(--color-muted-foreground)]" :
        pickRate >= 30 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-primary)]"
      )}>
        {pickRate.toFixed(1)}%
      </span>
    </div>
  )
}

function SlotRow({ label, options, traitNames, config }: {
  label: string
  options: TraitSubOption[]
  traitNames: Record<number, string>
  config: (typeof GROUP_CONFIG)[TraitGroup]
}) {
  if (options.length === 0) return null
  return (
    <div className="flex items-start gap-2 py-2">
      <span className={cn("shrink-0 text-[10px] font-semibold pt-2 w-10", config.text)}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          opt.code !== null && (
            <TraitIcon
              key={opt.code}
              code={opt.code}
              name={traitNames[opt.code]}
              pickRate={opt.pickRate}
              winRate={opt.winRate}
            />
          )
        ))}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function CharacterTraitBuildAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [builds, setBuilds] = React.useState<TraitMainGroup[]>([])
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
      ...(bestWeapon !== null ? { bestWeapon: String(bestWeapon) } : {}),
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
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 text-center text-sm text-[var(--color-muted-foreground)]">
        특성 빌드 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {builds.map((group, gi) => {
        const mainConfig = GROUP_CONFIG[group.mainGroup]

        return (
          <div
            key={gi}
            className={cn(
              "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden",
              gi === 0 && "ring-1 ring-[var(--color-accent-gold)]/30"
            )}
          >
            {/* 주특성 헤더 */}
            <div className={cn("flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[var(--color-border)]", mainConfig.bg)}>
              <div className="flex items-center gap-2">
                {gi === 0 && <span className="text-xs font-bold text-[var(--color-accent-gold)]">#1</span>}
                <span className={cn("text-sm font-bold", mainConfig.text)}>{mainConfig.label}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {group.totalGames.toLocaleString()}판
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--color-muted-foreground)]">
                  픽 <span className="font-semibold text-[var(--color-foreground)]">{group.groupPickRate.toFixed(1)}%</span>
                </span>
                <span className={cn("font-semibold", group.groupWinRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]")}>
                  승 {group.groupWinRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 주특성: 코어 + 슬롯1 + 슬롯2 */}
            <div className="px-3 sm:px-4 py-1 border-b border-[var(--color-border)]/50 divide-y divide-[var(--color-border)]/20">
              <SlotRow label="코어" options={group.mainCoreOptions} traitNames={traitNames} config={mainConfig} />
              <SlotRow label="슬롯1" options={group.sub1Options} traitNames={traitNames} config={mainConfig} />
              <SlotRow label="슬롯2" options={group.sub2Options} traitNames={traitNames} config={mainConfig} />
            </div>

            {/* 부특성 3열 */}
            {group.secondaries.length > 0 && (
              <div>
                <div className="px-3 sm:px-4 py-1.5 bg-[var(--color-surface-2)]/40 border-b border-[var(--color-border)]/50">
                  <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-muted-foreground)]">부특성</span>
                </div>
                <div className={cn(
                  "grid gap-px bg-[var(--color-border)]/20",
                  group.secondaries.length === 1 && "grid-cols-1",
                  group.secondaries.length === 2 && "grid-cols-2",
                  group.secondaries.length >= 3 && "grid-cols-1 sm:grid-cols-3",
                )}>
                  {group.secondaries.map((sec, si) => {
                    const secConfig = GROUP_CONFIG[sec.secGroup]
                    const isEmpty = sec.totalGames === 0
                    return (
                      <div key={si} className={cn("bg-[var(--color-surface)]/80 p-3", isEmpty && "opacity-40")}>
                        {/* 부특성 그룹 헤더 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("flex items-center justify-center rounded-full h-5 w-5", secConfig.bg)}>
                              <span className={cn("text-[10px] font-black", secConfig.text)}>{secConfig.letter}</span>
                            </div>
                            <span className={cn("text-xs font-bold", secConfig.text)}>{secConfig.label}</span>
                          </div>
                          <div className="flex gap-1.5 text-[9px]">
                            <span className="text-[var(--color-muted-foreground)]">{sec.pickRate.toFixed(0)}%</span>
                            {!isEmpty && (
                              <span className={cn(sec.winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                                승 {sec.winRate.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 슬롯1 + 슬롯2 아이콘 */}
                        {!isEmpty ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {sec.optionTrait1Options.map((opt) => (
                                opt.code !== null && (
                                  <TraitIcon key={opt.code} code={opt.code} name={traitNames[opt.code]} pickRate={opt.pickRate} winRate={opt.winRate} size={24} />
                                )
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {sec.optionTrait2Options.map((opt) => (
                                opt.code !== null && (
                                  <TraitIcon key={opt.code} code={opt.code} name={traitNames[opt.code]} pickRate={opt.pickRate} winRate={opt.winRate} size={24} />
                                )
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[var(--color-muted-foreground)] text-center py-2">데이터 없음</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
