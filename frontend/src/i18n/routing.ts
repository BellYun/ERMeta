import { defineRouting } from "next-intl/routing";
import type { SupportedLanguage } from "@/lib/detectLanguage";

export const ROUTE_LOCALES = ["ko", "en", "ja", "zh-Hans", "zh-Hant"] as const;
export type RouteLocale = (typeof ROUTE_LOCALES)[number];

export const DEFAULT_ROUTE_LOCALE: RouteLocale = "ko";

export const ROUTE_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, RouteLocale> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
  ChineseSimplified: "zh-Hans",
  ChineseTraditional: "zh-Hant",
};

export const LANGUAGE_BY_ROUTE_LOCALE = Object.fromEntries(
  Object.entries(ROUTE_LOCALE_BY_LANGUAGE).map(([language, locale]) => [locale, language])
) as Record<RouteLocale, SupportedLanguage>;

export function isRouteLocale(value: string): value is RouteLocale {
  return (ROUTE_LOCALES as readonly string[]).includes(value);
}

export const routing = defineRouting({
  locales: ROUTE_LOCALES,
  defaultLocale: DEFAULT_ROUTE_LOCALE,
  localePrefix: "as-needed",
  localeCookie: false,
  alternateLinks: false,
});
