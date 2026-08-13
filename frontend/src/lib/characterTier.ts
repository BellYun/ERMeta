export const DEFAULT_CHARACTER_ANALYSIS_TIER = "DIAMOND_PLUS";

export const CHARACTER_ANALYSIS_TIERS = ["DIAMOND_PLUS", "METEORITE_PLUS", "MITHRIL_PLUS"] as const;

export type CharacterAnalysisTier = (typeof CHARACTER_ANALYSIS_TIERS)[number];
