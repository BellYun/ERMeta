import itemGradeMap from "@/../const/itemGradeMap.json";

export type ItemGrade = "Common" | "Uncommon" | "Rare" | "Epic" | "Legend" | "Mythic";

export const GRADE_BORDER: Record<ItemGrade, string> = {
  Mythic: "border border-red-400/50",
  Legend: "border border-amber-400/50",
  Epic: "border border-purple-400/45",
  Rare: "border border-blue-400/40",
  Uncommon: "border border-green-400/35",
  Common: "",
};

export const GRADE_BG: Record<ItemGrade, string> = {
  Mythic: "bg-[#5c1a1a]",
  Legend: "bg-[#5c4a0a]",
  Epic: "bg-[#3b1a5c]",
  Rare: "bg-[#0f2e5c]",
  Uncommon: "bg-[#1a3d1a]",
  Common: "bg-[var(--color-surface-2)]",
};

export function getItemGrade(code: number | null): ItemGrade | null {
  if (code == null) return null;
  return ((itemGradeMap as Record<string, string>)[String(code)] as ItemGrade | undefined) ?? null;
}

export function encodePublicAssetPath(assetPath: string): string {
  return assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const SLOTS = ["weapon", "chest", "head", "arm", "leg"] as const;

export const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  chest: "갑옷",
  head: "머리",
  arm: "팔",
  leg: "다리",
};
