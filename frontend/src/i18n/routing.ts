import { defineRouting } from "next-intl/routing";
import type { SupportedLanguage } from "@/lib/detectLanguage";

export const ROUTE_LOCALES = ["ko", "en", "ja"] as const;
export type ActiveRouteLocale = (typeof ROUTE_LOCALES)[number];
export type RouteLocale = ActiveRouteLocale | "zh-Hans" | "zh-Hant";

export const DEFAULT_ROUTE_LOCALE: RouteLocale = "ko";

export const ROUTE_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, RouteLocale> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
};

export const LANGUAGE_BY_ROUTE_LOCALE: Record<RouteLocale, SupportedLanguage> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  "zh-Hans": "English",
  "zh-Hant": "English",
};

export function isRouteLocale(value: string): value is ActiveRouteLocale {
  return (ROUTE_LOCALES as readonly string[]).includes(value);
}

export const routing = defineRouting({
  locales: ROUTE_LOCALES,
  defaultLocale: DEFAULT_ROUTE_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});
