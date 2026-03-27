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
import type { CharacterRankingData, RankingResponse } from "@/lib/ranking"
import { computeMetaScores, assignTier } from "./utils"
import { DeltaIndicator } from "./DeltaIndicator"
import { PatchNoteTooltip } from "./PatchNoteTooltip"
import type { PrevStats, DisplayRow } from "./types"

const fallbackMap = buildFallbackMap()

const roleTabs = ["전체", "탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"] as const

function buildDisplayRows(
  rankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[],
  currentPatch: string,
  l10n: Map<string, string>
): DisplayRow[] {
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

  return sorted.map((r, i) => ({
    rank: i + 1,
    code: r.characterNum,
    roles: getComboRoles(r.characterNum, r.bestWeapon),
    weaponCode: r.bestWeapon,
    name: resolveCharacterName(r.characterNum, l10n, fallbackMap),
    weaponName: resolveWeaponName(r.bestWeapon),
    imageUrl: getCharacterImageUrl(r.characterNum),
    tier: assignTier(scores.get(r.characterNum * 1000 + r.bestWeapon) ?? 0),
    pickRate: r.pickRate,
    winRate: r.winRate,
    averageRP: r.averageRP,
    prev: prevMap.get(r.characterNum) ?? null,
    patchNote: getCharacterPatchNote(r.characterNum, currentPatch) ?? null,
  }))
}

interface TierRankingTableProps {
  initialData?: RankingResponse
}

export function TierRankingTable({ initialData }: TierRankingTableProps) {
  const { patch, tier } = useFilter()
  const [activeRole, setActiveRole] = React.useState<string>("전체")
  const [rankingData, setRankingData] = React.useState<RankingResponse | null>(initialData ?? null)
  const [isLoading, setIsLoading] = React.useState(!initialData)
  const [activeKey, setActiveKey] = React.useState<string | null>(null)
  const { l10n } = useL10n()
  const isInitialRender = React.useRef(true)

  const router = useRouter()

  React.useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      if (initialData) return
    }

    setIsLoading(true)
    const params = new URLSearchParams()
    if (patch) params.set("patchVersion", patch)
    params.set("tier", tier)

    fetch(`/api/character/mithril-rp-ranking?${params}`)
      .then((res) => res.json())
      .then((data: RankingResponse) => setRankingData(data))
      .catch(() => setRankingData(null))
      .finally(() => setIsLoading(false))
  }, [patch, tier]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = React.useMemo(() => {
    if (!rankingData) return []
    return buildDisplayRows(
      rankingData.rankings,
      rankingData.previousRankings,
      rankingData.patchVersion ?? patch ?? "",
      l10n
    )
  }, [rankingData, l10n, patch])

  const filtered =
    activeRole === "전체"
      ? rows
      : rows.filter((c) => c.roles.includes(activeRole as CharacterRole))

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
          캐릭터 순위
        </h2>
        <Select
          wrapperClassName="w-auto"
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

      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]/40">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-4 w-5 shrink-0" />
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Skeleton className="h-3.5 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))
          : filtered.length === 0
            ? (
              <div className="text-center text-sm text-[var(--color-muted-foreground)] py-10">
                데이터 없음
              </div>
            )
            : filtered.map((char) => {
                const key = `${char.code}-${char.weaponCode}`
                return (
                  <div
                    key={key}
                    className="relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer active:bg-[var(--color-surface-2)] touch-manipulation transition-colors"
                    onClick={() => {
                      if (char.patchNote && "ontouchstart" in window) {
                        if (activeKey === key) {
                          setActiveKey(null)
                          router.push(`/character-analysis?character=${char.code}`)
                        } else {
                          setActiveKey(key)
                        }
                      } else {
                        router.push(`/character-analysis?character=${char.code}`)
                      }
                    }}
                  >
                    {/* Rank */}
                    <span className={cn(
                      "text-xs font-semibold w-5 text-center shrink-0 tabular-nums",
                      char.rank <= 3 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                    )}>
                      {char.rank}
                    </span>
                    {/* Tier */}
                    <TierBadge tier={char.tier} />
                    {/* Character image */}
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                      <Image
                        src={char.imageUrl}
                        alt={char.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                      {char.patchNote && (
                        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                      )}
                    </div>
                    {/* Name + weapon */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate leading-tight">
                        {char.name}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">{char.weaponName}</p>
                    </div>
                    {/* Stats */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium tabular-nums text-[var(--color-foreground)]">
                          {char.winRate.toFixed(1)}%
                        </span>
                        <DeltaIndicator current={char.winRate} previous={char.prev?.winRate} suffix="%" />
                      </div>
                      <span className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        char.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                      )}>
                        {char.averageRP >= 0 ? "+" : ""}{char.averageRP.toFixed(1)} RP
                      </span>
                    </div>
                    {char.patchNote && activeKey === key && (
                      <PatchNoteTooltip patchNote={char.patchNote} />
                    )}
                  </div>
                )
              })
        }
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead className="w-12 text-center">티어</TableHead>
            <TableHead>캐릭터</TableHead>
            <TableHead className="w-20 text-right">픽률</TableHead>
            <TableHead className="w-20 text-right">승률</TableHead>
            <TableHead className="w-24 text-right">평균 RP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-4 w-5 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            : filtered.map((char) => (
                <TableRow
                  key={`${char.code}-${char.weaponCode}`}
                  className="cursor-pointer group"
                  onClick={() => {
                    const key = `${char.code}-${char.weaponCode}`
                    if (char.patchNote && "ontouchstart" in window) {
                      if (activeKey === key) {
                        setActiveKey(null)
                        router.push(`/character-analysis?character=${char.code}`)
                      } else {
                        setActiveKey(key)
                      }
                    } else {
                      router.push(`/character-analysis?character=${char.code}`)
                    }
                  }}
                  onMouseEnter={() => setActiveKey(`${char.code}-${char.weaponCode}`)}
                  onMouseLeave={() => setActiveKey(null)}
                >
                  <TableCell className="text-center">
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      char.rank <= 3 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                    )}>
                      {char.rank}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <TierBadge tier={char.tier} />
                  </TableCell>
                  <TableCell>
                    <div className="relative flex items-center gap-2.5">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                        <Image
                          src={char.imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                        {char.patchNote && (
                          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
                          {char.name}
                        </span>
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">{char.weaponName}</p>
                      </div>
                      {char.patchNote && activeKey === `${char.code}-${char.weaponCode}` && (
                        <PatchNoteTooltip patchNote={char.patchNote} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm tabular-nums text-[var(--color-foreground)]">
                        {char.pickRate.toFixed(1)}%
                      </span>
                      <DeltaIndicator current={char.pickRate} previous={char.prev?.pickRate} suffix="%" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium tabular-nums text-[var(--color-foreground)]">
                        {char.winRate.toFixed(1)}%
                      </span>
                      <DeltaIndicator current={char.winRate} previous={char.prev?.winRate} suffix="%" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        char.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                      )}>
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
                className="text-center text-sm text-[var(--color-muted-foreground)] py-10"
              >
                데이터 없음
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </section>
  )
}
