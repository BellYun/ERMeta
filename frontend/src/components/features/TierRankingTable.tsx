"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import { analytics } from "@/lib/analytics"
import { resolveCharacterName, buildFallbackMap, getCharacterImageUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { useL10n } from "@/components/L10nProvider"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { Tier } from "@/lib/design-tokens"
import type { CharacterRankingData } from "@/app/api/character/mithril-rp-ranking/route"
import type { CharacterPatchNote } from "@/data/patch-notes"

const fallbackMap = buildFallbackMap()

interface PrevStats {
  pickRate: number
  winRate: number
  averageRP: number
}

interface DisplayRow {
  rank: number
  code: number
  weaponCode: number
  name: string
  weaponName: string
  imageUrl: string
  tier: Tier
  pickRate: number
  winRate: number
  averageRP: number
  prev: PrevStats | null
  patchNote: CharacterPatchNote | null
}

function computeMetaScores(rankings: CharacterRankingData[]): Map<number, number> {
  const n = rankings.length
  if (n === 0) return new Map()

  const vals = (fn: (r: CharacterRankingData) => number) => rankings.map(fn)

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  const std = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)

  const winRates = vals((r) => r.winRate)
  const top3Rates = vals((r) => r.top3Rate)
  const avgRPs = vals((r) => r.averageRP)

  const winMean = mean(winRates),   winStd = std(winRates, winMean)
  const top3Mean = mean(top3Rates), top3Std = std(top3Rates, top3Mean)
  const rpMean = mean(avgRPs),      rpStd = std(avgRPs, rpMean)

  const scores = new Map<number, number>()
  for (const r of rankings) {
    const zWin  = winStd  > 0 ? (r.winRate    - winMean)  / winStd  : 0
    const zTop3 = top3Std > 0 ? (r.top3Rate   - top3Mean) / top3Std : 0
    const zRP   = rpStd   > 0 ? (r.averageRP  - rpMean)   / rpStd   : 0
    scores.set(r.characterNum * 1000 + r.bestWeapon, zWin * 0.40 + zTop3 * 0.35 + zRP * 0.25)
  }
  return scores
}

function assignTier(score: number): Tier {
  if (score >= 1.0)  return "S"
  if (score >= 0.3)  return "A"
  if (score >= -0.3) return "B"
  if (score >= -1.0) return "C"
  return "D"
}

// ─── 변동 표시 컴포넌트 ────────────────────────────────────────────────────────

function DeltaIndicator({ current, previous, suffix = "", precision = 1 }: {
  current: number
  previous: number | undefined
  suffix?: string
  precision?: number
}) {
  if (previous === undefined) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return null

  const isPositive = diff > 0
  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        isPositive ? "text-green-400" : "text-red-400"
      )}
    >
      {isPositive ? "+" : ""}{diff.toFixed(precision)}{suffix}
    </span>
  )
}

// ─── 패치노트 툴팁 ─────────────────────────────────────────────────────────────

function PatchNoteTooltip({ patchNote }: { patchNote: CharacterPatchNote }) {
  const changeTypeLabel = (type: string) => {
    if (type === "buff") return { text: "BUFF", color: "text-green-400 bg-green-400/10" }
    if (type === "nerf") return { text: "NERF", color: "text-red-400 bg-red-400/10" }
    return { text: "REWORK", color: "text-blue-400 bg-blue-400/10" }
  }

  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-96 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl pointer-events-none">
      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-3">
        패치 {patchNote.patch} 변경사항
      </p>
      <div className="flex flex-col gap-3">
        {patchNote.changes.map((change, i) => {
          const { text, color } = changeTypeLabel(change.changeType)
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", color)}>
                  {text}
                </span>
                <span className="text-xs font-medium text-[var(--color-foreground)]">
                  {change.target}
                </span>
              </div>
              {change.valueSummary && (
                <p className="text-[11px] text-[var(--color-muted-foreground)] pl-1 break-words">
                  {change.valueSummary}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

const tierTabs = ["전체", "S", "A", "B", "C", "D"] as const

export function TierRankingTable() {
  const searchParams = useSearchParams()
  const [activeTier, setActiveTier] = React.useState<string>("전체")
  const [rows, setRows] = React.useState<DisplayRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const { l10n } = useL10n()

  const router = useRouter()
  const patch = searchParams.get("patch")
  const tier = searchParams.get("tier") ?? "MITHRIL"

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

        // 이전 패치 데이터를 캐릭터별 Map으로
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
    activeTier === "전체"
      ? rows
      : rows.filter((c) => c.tier === activeTier)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">티어 순위</h2>
        <Tabs value={activeTier} onValueChange={(v) => { setActiveTier(v); analytics.rankingTierTabChanged(v) }}>
          <TabsList>
            {tierTabs.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
                      <Skeleton className="h-8 w-8 rounded-md" />
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
                  className="cursor-pointer"
                  onClick={() => router.push(`/character-analysis?character=${char.code}`)}
                  onMouseEnter={() => setHoveredKey(`${char.code}-${char.weaponCode}`)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <TableCell className="text-[var(--color-muted-foreground)] font-medium">
                    {char.rank}
                  </TableCell>
                  <TableCell className="text-center">
                    <TierBadge tier={char.tier} />
                  </TableCell>
                  <TableCell>
                    <div className="relative flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
                        <Image
                          src={char.imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                        {char.patchNote && (
                          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>
                      <span className="text-base font-semibold truncate">
                        <span className="text-[var(--color-muted-foreground)]">{char.weaponName}</span>{" "}{char.name}
                      </span>
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
                      <span className="text-sm text-[var(--color-muted-foreground)]">
                        {char.winRate.toFixed(1)}%
                      </span>
                      <DeltaIndicator current={char.winRate} previous={char.prev?.winRate} suffix="%" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          char.averageRP >= 0
                            ? "text-[var(--color-accent-gold)]"
                            : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {char.averageRP.toFixed(0)}
                      </span>
                      <DeltaIndicator current={char.averageRP} previous={char.prev?.averageRP} precision={0} />
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
