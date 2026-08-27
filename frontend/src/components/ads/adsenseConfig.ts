import type { AdBlockRecoveryMode } from "@/lib/adBlockRecoveryExperiment";

const DEFAULT_ADSENSE_CLIENT = "ca-pub-4008956736614349";
const DEFAULT_DISPLAY_SLOT = "8139813658";
const ADSENSE_DISABLED = process.env.NEXT_PUBLIC_ADSENSE_DISABLED === "true";
const productionDefault = process.env.NODE_ENV === "production" ? DEFAULT_DISPLAY_SLOT : "";

export const ADSENSE_CLIENT = ADSENSE_DISABLED
  ? ""
  : (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ??
    (process.env.NODE_ENV === "production" ? DEFAULT_ADSENSE_CLIENT : ""));

export const ADSENSE_PREVIEW =
  !ADSENSE_DISABLED && process.env.NEXT_PUBLIC_ADSENSE_PREVIEW === "true";

function resolveAdBlockRecoveryMode(): AdBlockRecoveryMode {
  const configured = process.env.NEXT_PUBLIC_AD_BLOCK_RECOVERY_MODE;
  if (
    configured === "off" ||
    configured === "experiment" ||
    configured === "context" ||
    configured === "direct"
  ) {
    return configured;
  }

  if (configured) return "off";
  return process.env.NODE_ENV === "production" ? "experiment" : "off";
}

export const AD_BLOCK_RECOVERY_MODE = resolveAdBlockRecoveryMode();

export interface AdSlotReservation {
  baseHeight: number;
  smHeight?: number;
  lgHeight?: number;
  width?: number;
}

export const ADSENSE_SLOT_RESERVATIONS = {
  contentHorizontal: {
    baseHeight: 112,
    smHeight: 120,
    lgHeight: 120,
  },
  siteRail: {
    baseHeight: 600,
    width: 160,
  },
} as const satisfies Record<string, AdSlotReservation>;

export const ADSENSE_SLOTS = {
  homeRanking: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_HOME_RANKING_SLOT ?? productionDefault),
  synergyDetail: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_SYNERGY_DETAIL_SLOT ?? productionDefault),
  characterAnalysis: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_CHARACTER_ANALYSIS_SLOT ?? productionDefault),
  siteRailLeft: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_SITE_RAIL_LEFT_SLOT ?? productionDefault),
  siteRailRight: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_SITE_RAIL_RIGHT_SLOT ?? productionDefault),
} as const;

/**
 * Optional AdSense custom channels. Assign one channel per placement in AdSense so revenue and
 * Active View can be joined with the client-side slot_name funnel without tracking ad clicks.
 */
export const ADSENSE_CHANNELS = {
  home_ranking: process.env.NEXT_PUBLIC_ADSENSE_HOME_RANKING_CHANNEL ?? "",
  synergy_detail_top: process.env.NEXT_PUBLIC_ADSENSE_SYNERGY_DETAIL_CHANNEL ?? "",
  character_analysis_top: process.env.NEXT_PUBLIC_ADSENSE_CHARACTER_ANALYSIS_CHANNEL ?? "",
  site_rail_left: process.env.NEXT_PUBLIC_ADSENSE_SITE_RAIL_LEFT_CHANNEL ?? "",
  site_rail_right: process.env.NEXT_PUBLIC_ADSENSE_SITE_RAIL_RIGHT_CHANNEL ?? "",
} as const;

export function canRenderAdSlot(slot: string) {
  return ADSENSE_PREVIEW || (Boolean(ADSENSE_CLIENT) && Boolean(slot));
}
