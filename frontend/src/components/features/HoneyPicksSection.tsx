"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"

const FALLBACK_MAP = buildFallbackMap()

function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType)
  if (types.every((t) => t === "buff")) return "buff"
  if (types.every((t) => t === "nerf")) return "nerf"
  if (types.includes("buff") && types.includes("nerf")) return "rework"
  return types[0] ?? "rework"
}

const CHANGE_LABEL: Record<string, { text: string; color: string }> = {
  buff: { text: "BUFF", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  nerf: { text: "NERF", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  rework: { text: "ADJUST", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
}

function HoneyTooltip({ pick, name, weaponName, patchNote }: {
  pick: HoneyPickData
  name: string
  weaponName: string
  patchNote: CharacterPatchNote | null
}) {
  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-2xl shadow-black/40 pointer-events-none">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-[var(--color-foreground)]">{name}</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">{weaponName}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 border border-[var(--color-border)]/50">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">승률</p>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">{pick.winRate.toFixed(1)}%</p>
          <p className="text-[10px] font-medium text-green-400">+{pick.winRateDelta.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 border border-[var(--color-border)]/50">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">픽률</p>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">{pick.pickRate.toFixed(1)}%</p>
          <p className="text-[10px] font-medium text-green-400">+{pick.pickRateDelta.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-2)] px-2 py-1.5 border border-[var(--color-border)]/50">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</p>
          <p className={cn("text-sm font-semibold", pick.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
            {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(1)}
          </p>
          <p className={cn("text-[10px] font-medium", pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400")}>
            {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
          </p>
        </div>
      </div>

      {patchNote && (
        <div className="border-t border-[var(--color-border)] pt-2">
          <p className="text-[10px] font-medium text-[var(--color-muted-foreground)] mb-1.5">
            패치 {patchNote.patch} 변경사항
          </p>
          <div className="flex flex-col gap-1.5">
            {patchNote.changes.map((change, ci) => {
              const label = CHANGE_LABEL[change.changeType]
              return (
                <div key={ci} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("rounded px-1 py-0.5 text-[9px] font-bold border", label.color)}>
                      {label.text}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-foreground)]">
                      {change.target}
                    </span>
                  </div>
                  {change.valueSummary && (
                    <p className="text-[10px] text-[var(--color-muted-foreground)] pl-1 break-words">
                      {change.valueSummary}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!patchNote && (
        <p className="text-[10px] text-[var(--color-muted-foreground)] border-t border-[var(--color-border)] pt-2">
          이번 패치 변경사항 없음 — 순수 메타 강세
        </p>
      )}
    </div>
  )
}

export function HoneyPicksSection() {
  const { l10n } = useL10n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [picks, setPicks] = React.useState<HoneyPickData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const [currentPatch, setCurrentPatch] = React.useState<string>("")

  const patch = searchParams.get("patch")
  const tier = searchParams.get("tier") ?? "MITHRIL"

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (patch) params.set("patchVersion", patch)
    params.set("tier", tier)

    fetch(`/api/meta/honey-picks?${params}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "API 오류")
        setPicks(data.picks ?? [])
        setCurrentPatch(data.patchVersion ?? patch ?? "")
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      )
      .finally(() => setLoading(false))
  }, [patch, tier])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (error) {
    return <p className="py-3 text-sm text-[var(--color-danger)]">{error}</p>
  }

  if (picks.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-[var(--color-muted-foreground)]">
        이번 패치에서 꿀챔 데이터가 없습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {picks.map((pick, i) => {
        const name = getCharName(pick.characterNum)
        const weaponName = resolveWeaponName(pick.bestWeapon)
        const imageUrl = getCharacterImageUrl(pick.characterNum)
        const patchNote = getCharacterPatchNote(pick.characterNum, currentPatch) ?? null
        const key = `${pick.characterNum}-${pick.bestWeapon}`
        const overallChange = patchNote ? getOverallChangeType(patchNote) : null
        const changeLabel = overallChange ? CHANGE_LABEL[overallChange] : null

        return (
          <div
            key={key}
            className="group relative flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2.5 hover:bg-[var(--color-primary)]/[0.04] hover:border-[var(--color-primary)]/20 transition-all duration-200 cursor-pointer"
            onClick={() =>
              router.push(`/character-analysis?character=${pick.characterNum}`)
            }
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]">
              {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)]">
                  <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                  {patchNote && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_4px_var(--color-primary)]" />
                  )}
                </div>
                <span className="w-10 truncate text-center text-[9px] text-[var(--color-muted-foreground)]">
                  {name}
                </span>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {weaponName}
              </span>
              {changeLabel && (
                <span className={cn("w-fit rounded px-1 py-0.5 text-[9px] font-bold mt-0.5 border", changeLabel.color)}>
                  {changeLabel.text}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4 text-right">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    pick.averageRP >= 0
                      ? "text-[var(--color-accent-gold)]"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    pick.winRate >= 60
                      ? "text-[var(--color-accent-gold)]"
                      : pick.winRate >= 55
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {pick.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">픽률</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pick.pickRate.toFixed(1)}%
                </span>
              </div>
            </div>
            {hoveredKey === key && (
              <HoneyTooltip
                pick={pick}
                name={name}
                weaponName={weaponName}
                patchNote={patchNote}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
