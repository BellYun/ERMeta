"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import { resolveCharacterName, buildFallbackMap, getCharacterImageUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { useL10n } from "@/components/L10nProvider"
import type { Tier } from "@/lib/design-tokens"
import type { CharacterRankingData } from "@/app/api/character/mithril-rp-ranking/route"

const fallbackMap = buildFallbackMap()

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
}

function assignTier(rank: number, total: number): Tier {
  const pct = rank / total
  if (pct <= 0.1) return "S"
  if (pct <= 0.25) return "A"
  if (pct <= 0.45) return "B"
  if (pct <= 0.65) return "C"
  return "D"
}

const tierTabs = ["전체", "S", "A", "B", "C", "D"] as const

export function TierRankingTable() {
  const searchParams = useSearchParams()
  const [activeTier, setActiveTier] = React.useState<string>("전체")
  const [rows, setRows] = React.useState<DisplayRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const { l10n } = useL10n()

  const patch = searchParams.get("patch")
  const tier = searchParams.get("tier") ?? "DIAMOND"

  React.useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (patch) params.set("patchVersion", patch)
    params.set("tier", tier)

    fetch(`/api/character/mithril-rp-ranking?${params}`)
      .then((res) => res.json())
      .then((data: { rankings?: CharacterRankingData[] }) => {
        const rankings = data.rankings ?? []
        const total = rankings.length
        const display: DisplayRow[] = rankings.map((r) => {
          const name = resolveCharacterName(r.characterNum, l10n, fallbackMap)
          const weaponName = resolveWeaponName(r.bestWeapon)
          const imageUrl = getCharacterImageUrl(r.characterNum)
          return {
            rank: r.rank,
            code: r.characterNum,
            weaponCode: r.bestWeapon,
            name,
            weaponName,
            imageUrl,
            tier: assignTier(r.rank, total),
            pickRate: r.pickRate,
            winRate: r.winRate,
            averageRP: r.averageRP,
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
        <Tabs value={activeTier} onValueChange={setActiveTier}>
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
            <TableHead>캐릭터</TableHead>
            <TableHead className="w-16 text-center">티어</TableHead>
            <TableHead className="w-20 text-right hidden sm:table-cell">픽률</TableHead>
            <TableHead className="w-20 text-right">승률</TableHead>
            <TableHead className="w-24 text-right">평균 RP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                  <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                </TableRow>
              ))
            : filtered.map((char) => (
                <TableRow key={`${char.code}-${char.weaponCode}`}>
                  <TableCell className="text-[var(--color-muted-foreground)] font-medium">
                    {char.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
                        <Image
                          src={char.imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{char.name}</span>
                        <span className="text-xs text-[var(--color-muted-foreground)] truncate">{char.weaponName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <TierBadge tier={char.tier} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-[var(--color-muted-foreground)] hidden sm:table-cell">
                    {char.pickRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                    {char.winRate.toFixed(1)}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      char.averageRP >= 0
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {char.averageRP.toFixed(0)}
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
