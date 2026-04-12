import itemGradeMap from "@/../const/itemGradeMap.json"

export type ItemGrade = "Common" | "Uncommon" | "Rare" | "Epic" | "Legend" | "Mythic"

export const GRADE_BORDER: Record<ItemGrade, string> = {
  Mythic: "ring-2 ring-red-400/70 shadow-[0_0_6px_rgba(248,113,113,0.3)]",
  Legend: "ring-2 ring-amber-400/70 shadow-[0_0_6px_rgba(251,191,36,0.3)]",
  Epic:   "ring-2 ring-purple-400/60",
  Rare:   "ring-1 ring-blue-400/50",
  Uncommon: "ring-1 ring-green-400/40",
  Common: "",
}

export const GRADE_BG: Record<ItemGrade, string> = {
  Mythic: "bg-[#5c1a1a]",
  Legend: "bg-[#5c4a0a]",
  Epic:   "bg-[#3b1a5c]",
  Rare:   "bg-[#0f2e5c]",
  Uncommon: "bg-[#1a3d1a]",
  Common: "bg-[var(--color-surface-2)]",
}

export function getItemGrade(code: number | null): ItemGrade | null {
  if (code == null) return null
  return (itemGradeMap as Record<string, string>)[String(code)] as ItemGrade | undefined ?? null
}

export const SLOTS = ["weapon", "chest", "head", "arm", "leg"] as const

export const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  chest: "갑옷",
  head: "머리",
  arm: "팔",
  leg: "다리",
}
