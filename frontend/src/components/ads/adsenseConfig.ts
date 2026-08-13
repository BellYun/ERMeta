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

export function canRenderAdSlot(slot: string) {
  return ADSENSE_PREVIEW || (Boolean(ADSENSE_CLIENT) && Boolean(slot));
}
