"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Select, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TierBadge } from "../TierBadge"
import { cn } from "@/lib/utils"
import { analytics } from "@/lib/analytics"
import { useFilter } from "../FilterContext"
import { resolveCharacterName, buildFallbackMap, getCharacterImageUrl, getComboRoles } from "@/lib/characterMap"
import type { CharacterRole } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { useL10n } from "@/components/L10nProvider"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { CharacterRankingData } from "@/app/api/character/mithril-rp-ranking/route"
import { computeMetaScores, assignTier } from "./utils"
import { DeltaIndicator } from "./DeltaIndicator"
import { PatchNoteTooltip } from "./PatchNoteTooltip"
import type { PrevStats, DisplayRow } from "./types"

const fallbackMap = buildFallbackMap()

const roleTabs = ["전체", "탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"] as const

export function TierRankingTable() {
  const { patch, tier } = useFilter()
  const [activeRole, setActiveRole] = React.useState<string>("전체")
  const [rows, setRows] = React.useState<DisplayRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const { l10n } = useL10n()

  const router = useRouter()

  React.useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (patch) params.set("patchVersion", patch)
    params.set("tier", tier)

    fetch(`/api/character/mithril-rp-ranking?${params}`)
      .then((res) => res.json())
      .then((data: {
        rankings?: CharacterRankingData[]
        previousRankings?: CharacterRankingData[]
        patchVersion?: string
        previousPatch?: string | null
      }) => {
        const rankings = data.rankings ?? []
        const previousRankings = data.previousRankings ?? []
        const currentPatch = data.patchVersion ?? patch ?? ""

        const prevMap = new Map<number, PrevStats>()
        if (previousRankings.length > 0) {
          const prevGrandTotal = previousRankings.reduce((s, r) => s + r.totalGames, 0)
          for (const r of previousRankings) {
            prevMap.set(r.characterNum, {
              pickRate: prevGrandTotal > 0 ? (r.totalGames / prevGrandTotal) * 100 : 0,
              winRate: r.winRate,
              averageRP: r.averageRP,
            })
          }
        }

        const scores = computeMetaScores(rankings)
        const sorted = [...rankings].sort((a, b) => {
          const sa = scores.get(a.characterNum * 1000 + a.bestWeapon) ?? 0
          const sb = scores.get(b.characterNum * 1000 + b.bestWeapon) ?? 0
          return sb - sa
        })
        const display: DisplayRow[] = sorted.map((r, i) => {
          const name = resolveCharacterName(r.characterNum, l10n, fallbackMap)
          const weaponName = resolveWeaponName(r.bestWeapon)
          const imageUrl = getCharacterImageUrl(r.characterNum)
          const score = scores.get(r.characterNum * 1000 + r.bestWeapon) ?? 0
          const prev = prevMap.get(r.characterNum) ?? null
          const patchNote = getCharacterPatchNote(r.characterNum, currentPatch) ?? null
          return {
            rank: i + 1,
            code: r.characterNum,
            roles: getComboRoles(r.characterNum, r.bestWeapon),
            weaponCode: r.bestWeapon,
            name,
            weaponName,
            imageUrl,
            tier: assignTier(score),
            pickRate: r.pickRate,
            winRate: r.winRate,
            averageRP: r.averageRP,
            prev,
            patchNote,
          }
        })
        setRows(display)
      })
      .catch(() => setRows([]))
      .finally(() => setIsLoading(false))
  }, [patch, tier, l10n])

  const filtered =
    activeRole === "전체"
      ? rows
      : rows.filter((c) => c.roles.includes(activeRole as CharacterRole))

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">캐릭터 순위</h2>
        </div>
        <Select
          value={activeRole}
          onChange={(e) => { setActiveRole(e.target.value); analytics.rankingTierTabChanged(e.target.value) }}
        >
          {roleTabs.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">순위</TableHead>
            <TableHead className="w-16 text-center">티어</TableHead>
            <TableHead>캐릭터</TableHead>
            <TableHead className="w-24 text-right hidden sm:table-cell">픽률</TableHead>
            <TableHead className="w-24 text-right">승률</TableHead>
            <TableHead className="w-28 text-right">평균 RP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                </TableRow>
              ))
            : filtered.map((char) => (
                <TableRow
                  key={`${char.code}-${char.weaponCode}`}
                  className="cursor-pointer group"
                  onClick={() => router.push(`/character-analysis?character=${char.code}`)}
                  onMouseEnter={() => setHoveredKey(`${char.code}-${char.weaponCode}`)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <TableCell className="text-[var(--color-muted-foreground)] font-semibold group-hover:text-[var(--color-primary)]">
                    {char.rank}
                  </TableCell>
                  <TableCell className="text-center">
                    <TierBadge tier={char.tier} />
                  </TableCell>
                  <TableCell>
                    <div className="relative flex items-center gap-2.5">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)]">
                        <Image
                          src={char.imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                        {char.patchNote && (
                          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_4px_var(--color-primary)]" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
                          {char.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">{char.weaponName}</span>
                      </div>
                      {char.patchNote && hoveredKey === `${char.code}-${char.weaponCode}` && (
                        <PatchNoteTooltip patchNote={char.patchNote} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-[var(--color-muted-foreground)]">
                        {char.pickRate.toFixed(1)}%
                      </span>
                      <DeltaIndicator current={char.pickRate} previous={char.prev?.pickRate} suffix="%" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-sm font-medium",
                        char.winRate >= 55 ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
                      )}>
                        {char.winRate.toFixed(1)}%
                      </span>
                      <DeltaIndicator current={char.winRate} previous={char.prev?.winRate} suffix="%" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          char.averageRP >= 0
                            ? "text-[var(--color-accent-gold)]"
                            : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {char.averageRP >= 0 ? "+" : ""}{char.averageRP.toFixed(1)}
                      </span>
                      <DeltaIndicator current={char.averageRP} previous={char.prev?.averageRP} precision={1} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          {!isLoading && filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-sm text-[var(--color-muted-foreground)] py-8"
              >
                데이터 없음
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
