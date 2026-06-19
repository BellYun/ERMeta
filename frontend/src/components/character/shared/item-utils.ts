import itemGradeMap from "@/../const/itemGradeMap.json";

export type ItemGrade = "Common" | "Uncommon" | "Rare" | "Epic" | "Legend" | "Mythic";

export const GRADE_BORDER: Record<ItemGrade, string> = {
  Mythic: "border border-[var(--color-border-light)]",
  Legend: "border border-[var(--color-border-light)]",
  Epic: "border border-[var(--color-border)]",
  Rare: "border border-[var(--color-border)]",
  Uncommon: "border border-[var(--color-border)]",
  Common: "",
};

export const GRADE_BG: Record<ItemGrade, string> = {
  Mythic: "bg-[var(--color-surface-3)]",
  Legend: "bg-[var(--color-surface-3)]",
  Epic: "bg-[var(--color-surface-2)]",
  Rare: "bg-[var(--color-surface-2)]",
  Uncommon: "bg-[var(--color-surface-2)]",
  Common: "bg-[var(--color-surface-2)]",
};

export function getItemGrade(code: number | null): ItemGrade | null {
  if (code == null) return null;
  return ((itemGradeMap as Record<string, string>)[String(code)] as ItemGrade | undefined) ?? null;
}

export const SLOTS = ["weapon", "chest", "head", "arm", "leg"] as const;

export const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  chest: "갑옷",
  head: "머리",
  arm: "팔",
  leg: "다리",
};
