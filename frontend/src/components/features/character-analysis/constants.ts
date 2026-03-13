import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import type { ChangeType } from "@/data/patch-notes"
import { TierGroup } from "@/utils/tier"
import * as React from "react"

export const CHARACTER_CODES: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86,
]

export const TIER_LABELS: Record<TierGroup, string> = {
  [TierGroup.DIAMOND]: "다이아",
  [TierGroup.METEORITE]: "메테오라이트",
  [TierGroup.MITHRIL]: "미스릴 이상",
  [TierGroup.IN1000]: "1000위 이내",
  [TierGroup.DIAMOND_BELOW]: "다이아 이하",
}

export const CHANGE_TYPE_CONFIG = {
  buff:   { label: "버프", colorClass: "text-[var(--color-accent-gold)]", bgClass: "bg-[var(--color-accent-gold)]/15 border-[var(--color-accent-gold)]/30", Icon: TrendingUp },
  nerf:   { label: "너프", colorClass: "text-[var(--color-danger)]",      bgClass: "bg-[var(--color-danger)]/15 border-[var(--color-danger)]/30",           Icon: TrendingDown },
  rework: { label: "변경", colorClass: "text-[var(--color-primary)]",     bgClass: "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30",          Icon: RefreshCw },
} satisfies Record<ChangeType, { label: string; colorClass: string; bgClass: string; Icon: React.FC<{ className?: string }> }>
