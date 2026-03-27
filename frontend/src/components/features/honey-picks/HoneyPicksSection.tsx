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

function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType)
  if (types.every((t) => t === "buff")) return "buff"
  if (types.every((t) => t === "nerf")) return "nerf"
  return "rework"
}

const CHANGE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  buff: { text: "BUFF", color: "text-[var(--color-stat-up)]", bg: "bg-[var(--color-stat-up)]/10" },
  nerf: { text: "NERF", color: "text-[var(--color-stat-down)]", bg: "bg-[var(--color-stat-down)]/10" },
  rework: { text: "ADJUST", color: "text-[var(--color-primary)]", bg: "bg-[var(--color-primary)]/10" },
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

  const handleCardClick = React.useCallback(
    (pick: HoneyPickData, patchNote: CharacterPatchNote | null) => {
      if (patchNote && window.innerWidth < 640) {
        const overallChange = getOverallChangeType(patchNote)
        const changeLabel = CHANGE_LABEL[overallChange]
          ? { text: CHANGE_LABEL[overallChange].text, color: `${CHANGE_LABEL[overallChange].color} ${CHANGE_LABEL[overallChange].bg}` }
          : null
        setMobileSheet({ pick, patchNote, changeLabel })
      } else {
        router.push(`/character-analysis?character=${pick.characterNum}`)
      }
    },
    [router]
  )

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

  if (picks.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
        이번 패치에서 꿀챔 데이터가 없습니다.
      </p>
    )
  }

  const featured = picks[0]
  const rest = picks.slice(1)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr] gap-3">
        {/* ── Featured #1 Card ── */}
        <div className="col-span-2 md:col-span-1 md:row-span-2">
          <FeaturedCard
            pick={featured}
            name={getCharName(featured.characterNum)}
            weaponName={resolveWeaponName(featured.bestWeapon)}
            halfUrl={getCharacterHalfImageUrl(featured.characterNum)}
            patchNote={getCharacterPatchNote(featured.characterNum, currentPatch) ?? null}
            onClick={() =>
              handleCardClick(
                featured,
                getCharacterPatchNote(featured.characterNum, currentPatch) ?? null
              )
            }
          />
        </div>

        {/* ── Cards #2-5 ── */}
        {rest.map((pick, i) => {
          const patchNote = getCharacterPatchNote(pick.characterNum, currentPatch) ?? null
          return (
            <SmallCard
              key={pick.characterNum}
              pick={pick}
              rank={i + 2}
              name={getCharName(pick.characterNum)}
              weaponName={resolveWeaponName(pick.bestWeapon)}
              halfUrl={getCharacterHalfImageUrl(pick.characterNum)}
              patchNote={patchNote}
              onClick={() => handleCardClick(pick, patchNote)}
            />
          )
        })}
      </div>

      {mobileSheet && (
        <PatchNoteBottomSheet
          pick={mobileSheet.pick}
          patchNote={mobileSheet.patchNote}
          changeLabel={mobileSheet.changeLabel}
          characterName={getCharName(mobileSheet.pick.characterNum)}
          onClose={() => setMobileSheet(null)}
          onNavigate={() => {
            setMobileSheet(null)
            router.push(`/character-analysis?character=${mobileSheet.pick.characterNum}`)
          }}
        />
      )}
    </>
  )
}

/* ─── Featured Card (Rank 1) ─── */

function FeaturedCard({
  pick,
  name,
  weaponName,
  halfUrl,
  patchNote,
  onClick,
}: {
  pick: HoneyPickData
  name: string
  weaponName: string
  halfUrl: string
  patchNote: CharacterPatchNote | null
  onClick: () => void
}) {
  const overallChange = patchNote ? getOverallChangeType(patchNote) : null
  const changeLabel = overallChange ? CHANGE_LABEL[overallChange] : null

  return (
    <div
      className="spotlight-card group cursor-pointer h-full min-h-[280px] sm:min-h-[340px] flex flex-col"
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative flex-1 overflow-hidden">
        <Image
          src={halfUrl}
          alt={name}
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 40vw"
          priority
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Rank badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-gold)]/20 backdrop-blur-sm text-sm font-black text-[var(--color-accent-gold)] ring-1 ring-[var(--color-accent-gold)]/30">
            1
          </span>
          {changeLabel && (
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm", changeLabel.color, changeLabel.bg)}>
              {changeLabel.text}
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          <p className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
            {name}
          </p>
          <p className="text-xs text-white/50 mt-0.5">{weaponName}</p>

          {/* Stats row */}
          <div className="flex items-center gap-2 mt-3">
            <StatPill
              label="승률"
              value={`${pick.winRate.toFixed(1)}%`}
              delta={`+${pick.winRateDelta.toFixed(1)}`}
              highlight={pick.winRate >= 55}
            />
            <StatPill
              label="픽률"
              value={`${pick.pickRate.toFixed(1)}%`}
              delta={`+${pick.pickRateDelta.toFixed(1)}`}
            />
            <StatPill
              label="RP"
              value={`${pick.averageRP >= 0 ? "+" : ""}${pick.averageRP.toFixed(0)}`}
              delta={`${pick.averageRPDelta >= 0 ? "+" : ""}${pick.averageRPDelta.toFixed(1)}`}
              highlight={pick.averageRP >= 10}
              highlightGold
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Small Card (Rank 2-5) ─── */

function SmallCard({
  pick,
  rank,
  name,
  weaponName,
  halfUrl,
  patchNote,
  onClick,
}: {
  pick: HoneyPickData
  rank: number
  name: string
  weaponName: string
  halfUrl: string
  patchNote: CharacterPatchNote | null
  onClick: () => void
}) {
  const overallChange = patchNote ? getOverallChangeType(patchNote) : null
  const changeLabel = overallChange ? CHANGE_LABEL[overallChange] : null

  return (
    <div
      className="glass-card group cursor-pointer overflow-hidden flex flex-col"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
        <Image
          src={halfUrl}
          alt={name}
          fill
          className="object-cover object-top transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />

        {/* Rank */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/50 backdrop-blur-sm text-[11px] font-bold text-[var(--color-muted-foreground)]">
            {rank}
          </span>
          {changeLabel && (
            <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm", changeLabel.color, changeLabel.bg)}>
              {changeLabel.text}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 flex-1">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--color-foreground)] truncate group-hover:text-[var(--color-primary)] transition-colors">
            {name}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{weaponName}</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] mt-auto">
          <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
            {pick.winRate.toFixed(1)}%
          </span>
          <span className="text-[var(--color-stat-up)] tabular-nums font-medium">
            +{pick.winRateDelta.toFixed(1)}
          </span>
          <span className="ml-auto text-[var(--color-muted-foreground)] tabular-nums">
            {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(0)} RP
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Stat Pill ─── */

function StatPill({
  label,
  value,
  delta,
  highlight,
  highlightGold,
}: {
  label: string
  value: string
  delta: string
  highlight?: boolean
  highlightGold?: boolean
}) {
  return (
    <div className="flex-1 min-w-0 rounded-lg bg-black/40 backdrop-blur-sm px-2 py-1.5 text-center">
      <p className="text-[8px] text-white/40 uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "text-[13px] font-bold tabular-nums leading-tight mt-0.5",
          highlight && highlightGold
            ? "text-[var(--color-accent-gold)]"
            : highlight
              ? "text-white"
              : "text-white/90"
        )}
      >
        {value}
      </p>
      <p className="text-[9px] font-medium text-[var(--color-stat-up)] mt-0.5 tabular-nums">
        {delta}
      </p>
    </div>
  )
}
