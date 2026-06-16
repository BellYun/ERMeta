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

export const ADSENSE_SLOTS = {
  homeRanking: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_HOME_RANKING_SLOT ?? productionDefault),
  synergyDetail: ADSENSE_DISABLED
    ? ""
    : (process.env.NEXT_PUBLIC_ADSENSE_SYNERGY_DETAIL_SLOT ?? productionDefault),
} as const;

export function canRenderAdSlot(slot: string) {
  return ADSENSE_PREVIEW || (Boolean(ADSENSE_CLIENT) && Boolean(slot));
}
