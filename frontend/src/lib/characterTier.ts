export const DEFAULT_CHARACTER_ANALYSIS_TIER = "PLATINUM_PLUS";

export const CHARACTER_ANALYSIS_TIERS = [
  "PLATINUM_PLUS",
  "DIAMOND_PLUS",
  "METEORITE_PLUS",
  "MITHRIL_PLUS",
] as const;

export type CharacterAnalysisTier = (typeof CHARACTER_ANALYSIS_TIERS)[number];
