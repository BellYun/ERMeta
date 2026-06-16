const DEFAULT_ADSENSE_CLIENT = "ca-pub-4008956736614349";
const DEFAULT_DISPLAY_SLOT = "8139813658";

export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ||
  (process.env.NODE_ENV === "production" ? DEFAULT_ADSENSE_CLIENT : "");

export const ADSENSE_PREVIEW = process.env.NEXT_PUBLIC_ADSENSE_PREVIEW === "true";

export const ADSENSE_SLOTS = {
  homeRanking:
    process.env.NEXT_PUBLIC_ADSENSE_HOME_RANKING_SLOT ||
    (process.env.NODE_ENV === "production" ? DEFAULT_DISPLAY_SLOT : ""),
  synergyDetail:
    process.env.NEXT_PUBLIC_ADSENSE_SYNERGY_DETAIL_SLOT ||
    (process.env.NODE_ENV === "production" ? DEFAULT_DISPLAY_SLOT : ""),
} as const;
