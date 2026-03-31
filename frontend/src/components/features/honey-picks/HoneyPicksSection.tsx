"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useL10n } from "@/components/L10nProvider"
import {
  buildFallbackMap,
  getCharacterHalfImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap"
import { useFilter } from "../FilterContext"
import { resolveWeaponName } from "@/lib/weaponMap"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"
import { PatchNoteBottomSheet } from "./PatchNoteBottomSheet"

const FALLBACK_MAP = buildFallbackMap()

export function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType)
  if (types.every((t) => t === "buff")) return "buff"
  if (types.every((t) => t === "nerf")) return "nerf"
  return "rework"
}

export const CHANGE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  buff: { text: "BUFF", color: "text-[var(--color-stat-up)]", bg: "bg-[var(--color-stat-up)]/10" },
  nerf: { text: "NERF", color: "text-[var(--color-stat-down)]", bg: "bg-[var(--color-stat-down)]/10" },
  rework: { text: "ADJUST", color: "text-[var(--color-primary)]", bg: "bg-[var(--color-primary)]/10" },
}

const RANK_STYLE: Record<number, string> = {
  1: "from-[#FFD700] to-[#FFA500] text-black",
  2: "from-[#C0C0C0] to-[#A0A0A0] text-black",
  3: "from-[#CD7F32] to-[#A0522D] text-white",
}

interface ResolvedPick {
  pick: HoneyPickData
  name: string
  weaponName: string
  halfUrl: string
  patchNote: CharacterPatchNote | null
  changeType: "buff" | "nerf" | "rework" | null
}

interface HoneyPicksSectionProps {
  initialData?: HoneyPickData[]
  initialPatchVersion?: string
}

export function HoneyPicksSection({ initialData, initialPatchVersion }: HoneyPicksSectionProps) {
  const { l10n } = useL10n()
  const { patch, tier } = useFilter()
  const router = useRouter()
  const [picks, setPicks] = React.useState<HoneyPickData[]>(initialData ?? [])
  const [loading, setLoading] = React.useState(!initialData || initialData.length === 0)
  const [error, setError] = React.useState<string | null>(null)
  const [currentPatch, setCurrentPatch] = React.useState<string>(initialPatchVersion ?? "")
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const [mobileSheet, setMobileSheet] = React.useState<{
    pick: HoneyPickData
    patchNote: CharacterPatchNote
    changeLabel: { text: string; color: string } | null
  } | null>(null)

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  )

  const isInitialRender = React.useRef(true)
  React.useEffect(() => {
    if (isInitialRender.current && initialData && initialData.length > 0) {
      isInitialRender.current = false
      setLoading(false)
      return
    }
    isInitialRender.current = false

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
  }, [patch, tier, initialData])

  // Resolve picks with patch notes, buff/rework 우선 + 최소 4개 보장
  const resolved = React.useMemo<ResolvedPick[]>(() => {
    const all = picks.map((pick) => {
      const patchNote = getCharacterPatchNote(pick.characterNum, currentPatch) ?? null
      const changeType = patchNote ? getOverallChangeType(patchNote) : null
      return {
        pick,
        name: getCharName(pick.characterNum),
        weaponName: resolveWeaponName(pick.bestWeapon),
        halfUrl: getCharacterHalfImageUrl(pick.characterNum),
        patchNote,
        changeType,
      }
    })

    const buffed = all.filter((r) => r.changeType === "buff" || r.changeType === "rework")

    // 버프/조정 캐릭터가 4개 미만이면 나머지를 승률 상승 캐릭터로 채움
    if (buffed.length >= 4) return buffed.slice(0, 5)

    const buffedNums = new Set(buffed.map((r) => r.pick.characterNum))
    const rest = all.filter((r) => !buffedNums.has(r.pick.characterNum))
    return [...buffed, ...rest].slice(0, 5)
  }, [picks, currentPatch, getCharName])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--color-danger)]">{error}</p>
  }

  if (resolved.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
        이번 패치에서 버프 후 떡상한 캐릭터가 없습니다.
      </p>
    )
  }

  return (
    <>
      {/* ── Desktop: Flex row with side-panel push ── */}
      <div className="hidden sm:flex gap-3 items-stretch" style={{ minHeight: 340 }}>
        {resolved.map((r, i) => {
          const isActive = hoveredIndex === i
          const hasPatchNote = !!r.patchNote
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null

          return (
            <div
              key={r.pick.characterNum}
              className="relative rounded-2xl overflow-hidden transition-[flex] duration-500 ease-out"
              style={{
                flex: isActive && hasPatchNote ? "0 0 420px" : "1 1 0%",
                minWidth: 0,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex h-full">
                {/* ── Card (image side) ── */}
                <div
                  className="relative flex-1 min-w-0 cursor-pointer overflow-hidden"
                  onClick={() =>
                    router.push(`/character/${r.pick.characterNum}?weapon=${r.pick.bestWeapon}`)
                  }
                >
                  <Image
                    src={r.halfUrl}
                    alt={r.name}
                    fill
                    className={cn(
                      "object-cover object-top transition-transform duration-700",
                      isActive && "scale-110"
                    )}
                    sizes="25vw"
                    priority={i < 3}
                  />

                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />

                  {/* Hover glow ring */}
                  <div
                    className={cn(
                      "absolute inset-0 ring-2 ring-inset rounded-l-2xl pointer-events-none transition-all duration-300",
                      isActive
                        ? "ring-[var(--color-stat-up)]/40 shadow-[inset_0_0_40px_rgba(63,185,80,0.06)]"
                        : "ring-transparent"
                    )}
                  />

                  {/* Rank medal */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shadow-lg bg-gradient-to-br",
                        RANK_STYLE[i + 1] ??
                          "from-[var(--color-surface-3)] to-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                      )}
                    >
                      {i + 1}
                    </span>
                    {changeLabel && (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md shadow-sm",
                          changeLabel.color,
                          changeLabel.bg
                        )}
                      >
                        {changeLabel.text}
                      </span>
                    )}
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 inset-x-0 p-3.5">
                    <p className="text-sm font-black text-white leading-tight truncate">
                      {r.name}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5 truncate">
                      {r.weaponName}
                    </p>

                    {/* Stats - always visible */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                      <MiniStat
                        label="승률"
                        value={`${r.pick.winRate.toFixed(1)}%`}
                        delta={r.pick.winRateDelta}
                        highlight={r.pick.winRate >= 55}
                      />
                      <MiniStat
                        label="픽률"
                        value={`${r.pick.pickRate.toFixed(1)}%`}
                        delta={r.pick.pickRateDelta}
                      />
                      <MiniStat
                        label="RP"
                        value={`${r.pick.averageRP >= 0 ? "+" : ""}${r.pick.averageRP.toFixed(0)}`}
                        delta={r.pick.averageRPDelta}
                        gold={r.pick.averageRP >= 0}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Side Panel (buff details) ── */}
                <div
                  className={cn(
                    "shrink-0 overflow-hidden transition-all duration-500 ease-out border-l border-[var(--color-border)]",
                    isActive && hasPatchNote ? "w-52 opacity-100" : "w-0 opacity-0"
                  )}
                >
                  <div className="w-52 h-full bg-[var(--color-surface)] p-3 flex flex-col">
                    {/* Panel header */}
                    <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-[var(--color-border)]/50">
                      {changeLabel && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold",
                            changeLabel.color,
                            changeLabel.bg
                          )}
                        >
                          {changeLabel.text}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        패치 {r.patchNote?.patch}
                      </span>
                    </div>

                    {/* Changes list */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 scrollbar-hide">
                      {r.patchNote?.changes.map((change, ci) => {
                        const cLabel = CHANGE_LABEL[change.changeType]
                        return (
                          <div key={ci} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "rounded px-1 py-0.5 text-[8px] font-bold",
                                  cLabel.color,
                                  cLabel.bg
                                )}
                              >
                                {cLabel.text}
                              </span>
                              <span className="text-[10px] font-medium text-[var(--color-foreground)] truncate">
                                {change.target}
                              </span>
                            </div>
                            {change.valueSummary && (
                              <p className="text-[9px] text-[var(--color-muted-foreground)] pl-1 leading-snug break-words">
                                {change.valueSummary}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Bottom delta summary */}
                    <div className="mt-auto pt-2.5 border-t border-[var(--color-border)]/50 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--color-muted-foreground)]">승률 변화</span>
                        <span className="font-semibold text-[var(--color-stat-up)] tabular-nums">
                          +{r.pick.winRateDelta.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--color-muted-foreground)]">RP 변화</span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            r.pick.averageRPDelta >= 0
                              ? "text-[var(--color-stat-up)]"
                              : "text-[var(--color-stat-down)]"
                          )}
                        >
                          {r.pick.averageRPDelta >= 0 ? "+" : ""}
                          {r.pick.averageRPDelta.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mobile: Card grid ── */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null
          return (
            <div
              key={r.pick.characterNum}
              className={cn(
                "relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform touch-manipulation",
                i === 0 && "col-span-2"
              )}
              style={{ aspectRatio: i === 0 ? "16/9" : "3/4" }}
              onClick={() => {
                if (r.patchNote) {
                  setMobileSheet({
                    pick: r.pick,
                    patchNote: r.patchNote,
                    changeLabel: changeLabel
                      ? {
                          text: changeLabel.text,
                          color: `${changeLabel.color} ${changeLabel.bg}`,
                        }
                      : null,
                  })
                } else {
                  router.push(
                    `/character/${r.pick.characterNum}`
                  )
                }
              }}
            >
              <Image
                src={r.halfUrl}
                alt={r.name}
                fill
                className="object-cover object-top"
                sizes="50vw"
                priority={i < 2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              {/* Rank + badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black shadow bg-gradient-to-br",
                    RANK_STYLE[i + 1] ??
                      "from-[var(--color-surface-3)] to-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
                {changeLabel && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm",
                      changeLabel.color,
                      changeLabel.bg
                    )}
                  >
                    {changeLabel.text}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="absolute bottom-0 inset-x-0 p-2.5">
                <p
                  className={cn(
                    "font-bold text-white truncate",
                    i === 0 ? "text-base" : "text-sm"
                  )}
                >
                  {r.name}
                </p>
                <p className="text-[10px] text-white/50 truncate">{r.weaponName}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  <span className="font-semibold tabular-nums text-white">
                    {r.pick.winRate.toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-stat-up)] tabular-nums font-medium">
                    +{r.pick.winRateDelta.toFixed(1)}
                  </span>
                  <span className="ml-auto text-[var(--color-accent-gold)] tabular-nums font-semibold">
                    {r.pick.averageRP >= 0 ? "+" : ""}
                    {r.pick.averageRP.toFixed(0)} RP
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile bottom sheet */}
      {mobileSheet && (
        <PatchNoteBottomSheet
          pick={mobileSheet.pick}
          patchNote={mobileSheet.patchNote}
          changeLabel={mobileSheet.changeLabel}
          characterName={getCharName(mobileSheet.pick.characterNum)}
          onClose={() => setMobileSheet(null)}
          onNavigate={() => {
            setMobileSheet(null)
            router.push(
              `/character/${mobileSheet.pick.characterNum}?weapon=${mobileSheet.pick.bestWeapon}`
            )
          }}
        />
      )}
    </>
  )
}

/* ─── Mini Stat ─── */

function MiniStat({
  label,
  value,
  delta,
  highlight,
  gold,
}: {
  label: string
  value: string
  delta: number
  highlight?: boolean
  gold?: boolean
}) {
  return (
    <div className="rounded-md bg-black/40 backdrop-blur-sm px-1.5 py-1.5 text-center">
      <p className="text-[7px] text-white/40 uppercase tracking-wider leading-none">
        {label}
      </p>
      <p
        className={cn(
          "text-[12px] font-bold tabular-nums leading-tight mt-1",
          gold
            ? "text-[var(--color-accent-gold)]"
            : highlight
              ? "text-white"
              : "text-white/90"
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "text-[8px] font-semibold mt-0.5 tabular-nums leading-none",
          delta >= 0
            ? "text-[var(--color-stat-up)]"
            : "text-[var(--color-stat-down)]"
        )}
      >
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(1)}
      </p>
    </div>
  )
}
