"use client"

import * as React from "react"
import Image from "next/image"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"

interface CharacterRanking {
  rank: number
  code: number
  name: string
  imageUrl: string
  tier: Tier
  pickRate: number
  winRate: number
  rateChange: number
}

const rankingData: CharacterRanking[] = [
  { rank: 1, code: 1, name: "나딘", imageUrl: "/characters/placeholder.png", tier: "S", pickRate: 12.4, winRate: 58.3, rateChange: 3.2 },
  { rank: 2, code: 2, name: "재키", imageUrl: "/characters/placeholder.png", tier: "S", pickRate: 10.8, winRate: 56.1, rateChange: 2.8 },
  { rank: 3, code: 3, name: "레나", imageUrl: "/characters/placeholder.png", tier: "A", pickRate: 9.2, winRate: 54.7, rateChange: 2.1 },
  { rank: 4, code: 4, name: "아이솔", imageUrl: "/characters/placeholder.png", tier: "A", pickRate: 8.7, winRate: 53.9, rateChange: 1.7 },
  { rank: 5, code: 5, name: "한", imageUrl: "/characters/placeholder.png", tier: "A", pickRate: 8.1, winRate: 52.4, rateChange: -2.9 },
  { rank: 6, code: 6, name: "피오라", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 7.5, winRate: 50.8, rateChange: -2.4 },
  { rank: 7, code: 7, name: "루크", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 6.9, winRate: 49.3, rateChange: -1.8 },
  { rank: 8, code: 8, name: "비앙카", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 6.3, winRate: 48.7, rateChange: -1.3 },
  { rank: 9, code: 9, name: "에스메", imageUrl: "/characters/placeholder.png", tier: "C", pickRate: 5.4, winRate: 46.2, rateChange: 0.5 },
  { rank: 10, code: 10, name: "실비아", imageUrl: "/characters/placeholder.png", tier: "D", pickRate: 3.1, winRate: 42.8, rateChange: -0.8 },
]

const tierTabs = ["전체", "S", "A", "B", "C", "D"] as const

export function TierRankingTable() {
  const [activeTier, setActiveTier] = React.useState<string>("전체")

  const filtered =
    activeTier === "전체"
      ? rankingData
      : rankingData.filter((c) => c.tier === activeTier)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">티어 순위</h2>
        <Tabs value={activeTier} onValueChange={setActiveTier}>
          <TabsList>
            {tierTabs.map((tier) => (
              <TabsTrigger key={tier} value={tier}>
                {tier}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">순위</TableHead>
            <TableHead>캐릭터</TableHead>
            <TableHead className="w-16 text-center">티어</TableHead>
            <TableHead className="w-20 text-right">픽률</TableHead>
            <TableHead className="w-20 text-right">승률</TableHead>
            <TableHead className="w-20 text-right">변동</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((char) => (
            <TableRow key={char.code}>
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
                  <span className="text-sm font-medium">{char.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <TierBadge tier={char.tier} />
              </TableCell>
              <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                {char.pickRate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                {char.winRate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "text-sm font-medium",
                    char.rateChange >= 0
                      ? "text-[var(--color-accent-gold)]"
                      : "text-[var(--color-danger)]"
                  )}
                >
                  {char.rateChange >= 0 ? "+" : ""}
                  {char.rateChange.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
