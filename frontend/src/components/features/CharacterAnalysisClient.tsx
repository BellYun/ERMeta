"use client"

import * as React from "react"
import Image from "next/image"
import { TrendingUp, TrendingDown, Minus, Sword, BarChart2, Zap } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"

// ─── 타입 ───────────────────────────────────────────────────────────────────

interface WeaponStat {
  weapon: string
  pickRate: number
  winRate: number
  tier: Tier
}

interface PatchStat {
  patch: string
  tier: Tier
  pickRate: number
  winRate: number
  rateChange: number
}

interface TraitBuild {
  name: string
  traits: string[]
  pickRate: number
  winRate: number
  isPopular?: boolean
}

interface CharacterData {
  code: number
  name: string
  imageUrl: string
  tier: Tier
  pickRate: number
  winRate: number
  avgRank: number
  weapons: WeaponStat[]
  patches: PatchStat[]
  builds: TraitBuild[]
}

// ─── 더미 데이터 ─────────────────────────────────────────────────────────────

const characters: CharacterData[] = [
  {
    code: 1,
    name: "나딘",
    imageUrl: "/characters/placeholder.png",
    tier: "S",
    pickRate: 12.4,
    winRate: 58.3,
    avgRank: 3.2,
    weapons: [
      { weapon: "저격소총", pickRate: 48.2, winRate: 61.4, tier: "S" },
      { weapon: "SMG", pickRate: 31.5, winRate: 55.9, tier: "A" },
      { weapon: "권총", pickRate: 12.1, winRate: 49.3, tier: "B" },
      { weapon: "돌격소총", pickRate: 8.2, winRate: 44.7, tier: "C" },
    ],
    patches: [
      { patch: "0.90.1", tier: "S", pickRate: 12.4, winRate: 58.3, rateChange: 3.2 },
      { patch: "0.90.0", tier: "A", pickRate: 9.2, winRate: 55.1, rateChange: 1.4 },
      { patch: "0.89.2", tier: "A", pickRate: 7.8, winRate: 53.7, rateChange: -0.8 },
      { patch: "0.89.1", tier: "B", pickRate: 8.6, winRate: 54.5, rateChange: 2.1 },
      { patch: "0.89.0", tier: "B", pickRate: 6.5, winRate: 52.4, rateChange: -1.2 },
    ],
    builds: [
      {
        name: "원거리 극딜 빌드",
        traits: ["저격수", "집중", "냉정", "치명타", "연속사격"],
        pickRate: 52.4,
        winRate: 63.1,
        isPopular: true,
      },
      {
        name: "생존형 빌드",
        traits: ["저격수", "집중", "회피", "강인함", "치유"],
        pickRate: 30.1,
        winRate: 56.8,
      },
      {
        name: "속사 빌드",
        traits: ["저격수", "연속사격", "냉정", "민첩", "집중"],
        pickRate: 17.5,
        winRate: 51.2,
      },
    ],
  },
  {
    code: 2,
    name: "재키",
    imageUrl: "/characters/placeholder.png",
    tier: "S",
    pickRate: 10.8,
    winRate: 56.1,
    avgRank: 3.8,
    weapons: [
      { weapon: "양손검", pickRate: 55.3, winRate: 59.2, tier: "S" },
      { weapon: "단검", pickRate: 28.7, winRate: 53.4, tier: "A" },
      { weapon: "도끼", pickRate: 16.0, winRate: 47.8, tier: "B" },
    ],
    patches: [
      { patch: "0.90.1", tier: "S", pickRate: 10.8, winRate: 56.1, rateChange: 2.8 },
      { patch: "0.90.0", tier: "A", pickRate: 8.0, winRate: 53.3, rateChange: 0.9 },
      { patch: "0.89.2", tier: "A", pickRate: 7.1, winRate: 52.4, rateChange: -1.5 },
      { patch: "0.89.1", tier: "A", pickRate: 8.6, winRate: 53.9, rateChange: 1.8 },
      { patch: "0.89.0", tier: "B", pickRate: 6.8, winRate: 52.1, rateChange: 0.3 },
    ],
    builds: [
      {
        name: "근접 공격 빌드",
        traits: ["검사", "맹렬함", "돌진", "치명타", "강화"],
        pickRate: 61.2,
        winRate: 58.9,
        isPopular: true,
      },
      {
        name: "지속전 빌드",
        traits: ["검사", "인내", "강인함", "치유", "집중"],
        pickRate: 38.8,
        winRate: 52.4,
      },
    ],
  },
  {
    code: 3,
    name: "레나",
    imageUrl: "/characters/placeholder.png",
    tier: "A",
    pickRate: 9.2,
    winRate: 54.7,
    avgRank: 4.1,
    weapons: [
      { weapon: "채찍", pickRate: 62.1, winRate: 57.3, tier: "S" },
      { weapon: "장창", pickRate: 25.4, winRate: 51.8, tier: "A" },
      { weapon: "단검", pickRate: 12.5, winRate: 46.2, tier: "C" },
    ],
    patches: [
      { patch: "0.90.1", tier: "A", pickRate: 9.2, winRate: 54.7, rateChange: 2.1 },
      { patch: "0.90.0", tier: "A", pickRate: 7.1, winRate: 52.6, rateChange: 0.5 },
      { patch: "0.89.2", tier: "B", pickRate: 6.6, winRate: 52.1, rateChange: -0.9 },
      { patch: "0.89.1", tier: "B", pickRate: 7.5, winRate: 53.0, rateChange: 1.4 },
      { patch: "0.89.0", tier: "B", pickRate: 6.1, winRate: 51.6, rateChange: -0.6 },
    ],
    builds: [
      {
        name: "채찍 광역 빌드",
        traits: ["결투사", "광역", "집중", "연속타", "강화"],
        pickRate: 55.8,
        winRate: 59.2,
        isPopular: true,
      },
      {
        name: "기동형 빌드",
        traits: ["결투사", "민첩", "회피", "집중", "연속타"],
        pickRate: 44.2,
        winRate: 49.8,
      },
    ],
  },
  {
    code: 4, name: "아이솔", imageUrl: "/characters/placeholder.png", tier: "A", pickRate: 8.7, winRate: 53.9, avgRank: 4.3,
    weapons: [{ weapon: "활", pickRate: 70.2, winRate: 56.1, tier: "A" }, { weapon: "석궁", pickRate: 29.8, winRate: 49.4, tier: "B" }],
    patches: [
      { patch: "0.90.1", tier: "A", pickRate: 8.7, winRate: 53.9, rateChange: 1.7 },
      { patch: "0.90.0", tier: "B", pickRate: 7.0, winRate: 52.2, rateChange: 0.8 },
      { patch: "0.89.2", tier: "B", pickRate: 6.2, winRate: 51.4, rateChange: -1.1 },
      { patch: "0.89.1", tier: "B", pickRate: 7.3, winRate: 52.5, rateChange: 2.0 },
      { patch: "0.89.0", tier: "C", pickRate: 5.3, winRate: 50.5, rateChange: -0.5 },
    ],
    builds: [{ name: "원거리 빌드", traits: ["궁수", "집중", "냉정", "치명타", "강화"], pickRate: 68.3, winRate: 57.4, isPopular: true }, { name: "생존 빌드", traits: ["궁수", "회피", "강인함", "집중", "치유"], pickRate: 31.7, winRate: 49.1 }],
  },
  {
    code: 5, name: "한", imageUrl: "/characters/placeholder.png", tier: "A", pickRate: 8.1, winRate: 52.4, avgRank: 4.6,
    weapons: [{ weapon: "도끼", pickRate: 58.4, winRate: 54.2, tier: "A" }, { weapon: "망치", pickRate: 41.6, winRate: 50.1, tier: "B" }],
    patches: [
      { patch: "0.90.1", tier: "A", pickRate: 8.1, winRate: 52.4, rateChange: -2.9 },
      { patch: "0.90.0", tier: "S", pickRate: 11.0, winRate: 55.3, rateChange: -1.2 },
      { patch: "0.89.2", tier: "S", pickRate: 12.2, winRate: 56.5, rateChange: 2.4 },
      { patch: "0.89.1", tier: "A", pickRate: 9.8, winRate: 54.1, rateChange: 0.7 },
      { patch: "0.89.0", tier: "A", pickRate: 9.1, winRate: 53.4, rateChange: -0.3 },
    ],
    builds: [{ name: "탱커 빌드", traits: ["전사", "강인함", "인내", "치유", "방어"], pickRate: 73.1, winRate: 55.0, isPopular: true }, { name: "딜탱 빌드", traits: ["전사", "맹렬함", "강인함", "치명타", "인내"], pickRate: 26.9, winRate: 48.3 }],
  },
  {
    code: 6, name: "피오라", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 7.5, winRate: 50.8, avgRank: 5.1,
    weapons: [{ weapon: "레이피어", pickRate: 81.3, winRate: 52.4, tier: "B" }, { weapon: "단검", pickRate: 18.7, winRate: 45.6, tier: "D" }],
    patches: [
      { patch: "0.90.1", tier: "B", pickRate: 7.5, winRate: 50.8, rateChange: -2.4 },
      { patch: "0.90.0", tier: "A", pickRate: 9.9, winRate: 53.2, rateChange: 0.4 },
      { patch: "0.89.2", tier: "A", pickRate: 9.5, winRate: 52.8, rateChange: 1.1 },
      { patch: "0.89.1", tier: "B", pickRate: 8.4, winRate: 51.7, rateChange: -0.9 },
      { patch: "0.89.0", tier: "B", pickRate: 9.3, winRate: 52.6, rateChange: 0.8 },
    ],
    builds: [{ name: "스킬 콤보 빌드", traits: ["결투사", "연속타", "냉정", "집중", "치명타"], pickRate: 60.2, winRate: 53.1, isPopular: true }, { name: "기본 빌드", traits: ["결투사", "집중", "강화", "연속타", "민첩"], pickRate: 39.8, winRate: 47.8 }],
  },
  {
    code: 7, name: "루크", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 6.9, winRate: 49.3, avgRank: 5.4,
    weapons: [{ weapon: "망치", pickRate: 44.1, winRate: 51.0, tier: "B" }, { weapon: "도끼", pickRate: 35.8, winRate: 48.3, tier: "C" }, { weapon: "장창", pickRate: 20.1, winRate: 44.7, tier: "D" }],
    patches: [
      { patch: "0.90.1", tier: "B", pickRate: 6.9, winRate: 49.3, rateChange: -1.8 },
      { patch: "0.90.0", tier: "B", pickRate: 8.7, winRate: 51.1, rateChange: 0.6 },
      { patch: "0.89.2", tier: "A", pickRate: 8.1, winRate: 50.5, rateChange: 1.9 },
      { patch: "0.89.1", tier: "B", pickRate: 6.2, winRate: 48.6, rateChange: -1.3 },
      { patch: "0.89.0", tier: "B", pickRate: 7.5, winRate: 49.9, rateChange: 0.2 },
    ],
    builds: [{ name: "전방 돌진 빌드", traits: ["전사", "돌진", "강인함", "맹렬함", "인내"], pickRate: 55.7, winRate: 51.8, isPopular: true }, { name: "지구전 빌드", traits: ["전사", "인내", "치유", "강인함", "집중"], pickRate: 44.3, winRate: 46.2 }],
  },
  {
    code: 8, name: "비앙카", imageUrl: "/characters/placeholder.png", tier: "B", pickRate: 6.3, winRate: 48.7, avgRank: 5.7,
    weapons: [{ weapon: "마법봉", pickRate: 78.5, winRate: 50.2, tier: "B" }, { weapon: "책", pickRate: 21.5, winRate: 44.8, tier: "C" }],
    patches: [
      { patch: "0.90.1", tier: "B", pickRate: 6.3, winRate: 48.7, rateChange: -1.3 },
      { patch: "0.90.0", tier: "B", pickRate: 7.6, winRate: 50.0, rateChange: -0.5 },
      { patch: "0.89.2", tier: "A", pickRate: 8.1, winRate: 50.5, rateChange: 1.2 },
      { patch: "0.89.1", tier: "B", pickRate: 6.9, winRate: 49.3, rateChange: 0.8 },
      { patch: "0.89.0", tier: "B", pickRate: 6.1, winRate: 48.5, rateChange: -0.7 },
    ],
    builds: [{ name: "마법 버스트 빌드", traits: ["마법사", "집중", "냉정", "광역", "강화"], pickRate: 64.3, winRate: 51.9, isPopular: true }, { name: "보조 빌드", traits: ["마법사", "치유", "강화", "집중", "인내"], pickRate: 35.7, winRate: 44.2 }],
  },
  {
    code: 9, name: "에스메", imageUrl: "/characters/placeholder.png", tier: "C", pickRate: 5.4, winRate: 46.2, avgRank: 6.2,
    weapons: [{ weapon: "석궁", pickRate: 52.3, winRate: 47.8, tier: "C" }, { weapon: "활", pickRate: 47.7, winRate: 44.2, tier: "D" }],
    patches: [
      { patch: "0.90.1", tier: "C", pickRate: 5.4, winRate: 46.2, rateChange: 0.5 },
      { patch: "0.90.0", tier: "C", pickRate: 4.9, winRate: 45.7, rateChange: -1.8 },
      { patch: "0.89.2", tier: "B", pickRate: 6.7, winRate: 47.5, rateChange: 0.9 },
      { patch: "0.89.1", tier: "B", pickRate: 5.8, winRate: 46.6, rateChange: -1.1 },
      { patch: "0.89.0", tier: "C", pickRate: 6.9, winRate: 47.7, rateChange: 0.4 },
    ],
    builds: [{ name: "기본 빌드", traits: ["궁수", "집중", "치명타", "냉정", "민첩"], pickRate: 71.2, winRate: 48.1, isPopular: true }, { name: "생존형 빌드", traits: ["궁수", "회피", "강인함", "집중", "치유"], pickRate: 28.8, winRate: 43.5 }],
  },
  {
    code: 10, name: "실비아", imageUrl: "/characters/placeholder.png", tier: "D", pickRate: 3.1, winRate: 42.8, avgRank: 7.1,
    weapons: [{ weapon: "글로브", pickRate: 88.2, winRate: 43.5, tier: "D" }, { weapon: "단검", pickRate: 11.8, winRate: 38.9, tier: "D" }],
    patches: [
      { patch: "0.90.1", tier: "D", pickRate: 3.1, winRate: 42.8, rateChange: -0.8 },
      { patch: "0.90.0", tier: "C", pickRate: 3.9, winRate: 43.6, rateChange: -1.4 },
      { patch: "0.89.2", tier: "C", pickRate: 5.3, winRate: 45.0, rateChange: -0.6 },
      { patch: "0.89.1", tier: "B", pickRate: 5.9, winRate: 45.6, rateChange: 1.0 },
      { patch: "0.89.0", tier: "B", pickRate: 4.9, winRate: 44.6, rateChange: -0.3 },
    ],
    builds: [{ name: "격투 빌드", traits: ["격투가", "맹렬함", "연속타", "치명타", "집중"], pickRate: 80.4, winRate: 44.1, isPopular: true }, { name: "카운터 빌드", traits: ["격투가", "강인함", "회피", "냉정", "인내"], pickRate: 19.6, winRate: 40.3 }],
  },
]

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-lg font-bold text-[var(--color-foreground)]">{value}</span>
      {sub && <span className="text-xs text-[var(--color-muted-foreground)]">{sub}</span>}
    </div>
  )
}

function RateChangeBadge({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-accent-gold)]">
        <TrendingUp className="h-3.5 w-3.5" />+{value.toFixed(1)}%
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-danger)]">
      <TrendingDown className="h-3.5 w-3.5" />
      {value.toFixed(1)}%
    </span>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function CharacterAnalysisClient() {
  const [selected, setSelected] = React.useState<CharacterData>(characters[0])

  return (
    <div className="flex gap-4 items-start">
      {/* 좌측 캐릭터 그리드 */}
      <div className="w-[228px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted-foreground)]">캐릭터 선택</p>
        <div className="grid grid-cols-3 gap-1">
          {characters.map((char) => (
            <button
              key={char.code}
              onClick={() => setSelected(char)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                selected.code === char.code
                  ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                  : "hover:bg-[var(--color-surface-2)]"
              )}
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                <Image src={char.imageUrl} alt={char.name} fill className="object-cover" sizes="40px" />
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
                {char.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 우측 분석 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 캐릭터 헤더 */}
        <div className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-border)]">
            <Image src={selected.imageUrl} alt={selected.name} fill className="object-cover" sizes="80px" />
          </div>
          <div className="flex flex-1 flex-col gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">{selected.name}</h1>
              <TierBadge tier={selected.tier} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="픽률" value={`${selected.pickRate.toFixed(1)}%`} />
              <StatCard label="승률" value={`${selected.winRate.toFixed(1)}%`} />
              <StatCard label="평균 순위" value={`#${selected.avgRank.toFixed(1)}`} />
              <StatCard
                label="패치"
                value="0.90.1"
                sub={selected.patches[0].rateChange >= 0
                  ? `↑ +${selected.patches[0].rateChange.toFixed(1)}%`
                  : `↓ ${selected.patches[0].rateChange.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>

        {/* 탭 분석 */}
        <Tabs defaultValue="weapons">
          <TabsList>
            <TabsTrigger value="weapons">
              <Sword className="mr-1.5 h-3.5 w-3.5" />무기별 통계
            </TabsTrigger>
            <TabsTrigger value="patches">
              <BarChart2 className="mr-1.5 h-3.5 w-3.5" />패치 트렌드
            </TabsTrigger>
            <TabsTrigger value="builds">
              <Zap className="mr-1.5 h-3.5 w-3.5" />특성 빌드
            </TabsTrigger>
          </TabsList>

          {/* 무기별 통계 */}
          <TabsContent value="weapons">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>무기</TableHead>
                    <TableHead className="w-16 text-center">티어</TableHead>
                    <TableHead className="w-24 text-right">픽률</TableHead>
                    <TableHead className="w-24 text-right">승률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.weapons.map((w) => (
                    <TableRow key={w.weapon}>
                      <TableCell className="font-medium">{w.weapon}</TableCell>
                      <TableCell className="text-center">
                        <TierBadge tier={w.tier} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                        {w.pickRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-medium",
                          w.winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                        )}>
                          {w.winRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* 패치 트렌드 */}
          <TabsContent value="patches">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>패치</TableHead>
                    <TableHead className="w-16 text-center">티어</TableHead>
                    <TableHead className="w-24 text-right">픽률</TableHead>
                    <TableHead className="w-24 text-right">승률</TableHead>
                    <TableHead className="w-28 text-right">변동</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.patches.map((p, i) => (
                    <TableRow key={p.patch}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {p.patch}
                          {i === 0 && (
                            <span className="rounded-full bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                              최신
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <TierBadge tier={p.tier} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                        {p.pickRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-sm text-[var(--color-muted-foreground)]">
                        {p.winRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <RateChangeBadge value={p.rateChange} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* 특성 빌드 */}
          <TabsContent value="builds">
            <div className="flex flex-col gap-3">
              {selected.builds.map((build, i) => (
                <div
                  key={i}
                  className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  {build.isPopular && (
                    <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-gold)]">
                      인기 빌드
                    </span>
                  )}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">{build.name}</span>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {build.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-md bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
                    <span>픽률 <strong className="text-[var(--color-foreground)]">{build.pickRate.toFixed(1)}%</strong></span>
                    <span>승률 <strong className={build.winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]"}>{build.winRate.toFixed(1)}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
