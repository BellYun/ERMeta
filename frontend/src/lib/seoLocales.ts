import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { DEFAULT_ROUTE_LOCALE, LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import type { SupportedLanguage } from "@/lib/detectLanguage";

export const SEO_LOCALE_SEGMENTS = ["ja"] as const;
export type SeoLocaleSegment = (typeof SEO_LOCALE_SEGMENTS)[number];

export interface SeoLanguageAlternates {
  ko: string;
  ja: string;
  "x-default": string;
}

export function isSeoLocaleSegment(value: string): value is SeoLocaleSegment {
  return (SEO_LOCALE_SEGMENTS as readonly string[]).includes(value);
}

export function getSeoLanguageFromSegment(locale: string): SupportedLanguage | null {
  if (!isSeoLocaleSegment(locale)) return null;
  return LANGUAGE_BY_ROUTE_LOCALE[locale];
}

export function localizeRoutePath(pathname: string, locale: RouteLocale): string {
  return getPathname({ href: pathname, locale });
}

export function prefixSeoLocalePath(pathname: string, locale: SeoLocaleSegment): string {
  return localizeRoutePath(pathname, locale);
}

export function buildSeoAlternateLanguages(pathname: string): SeoLanguageAlternates {
  return {
    ko: localizeRoutePath(pathname, DEFAULT_ROUTE_LOCALE),
    ja: localizeRoutePath(pathname, "ja"),
    "x-default": localizeRoutePath(pathname, DEFAULT_ROUTE_LOCALE),
  };
}

export function buildLocalizedAlternates(
  pathname: string,
  locale: RouteLocale
): NonNullable<Metadata["alternates"]> {
  const canonical = localizeRoutePath(pathname, locale);

  if (locale === "ja" || locale === DEFAULT_ROUTE_LOCALE) {
    return {
      canonical,
      languages: buildSeoAlternateLanguages(pathname) as unknown as NonNullable<
        NonNullable<Metadata["alternates"]>["languages"]
      >,
    };
  }

  return { canonical };
}

export function buildDefaultAlternates(pathname: string): NonNullable<Metadata["alternates"]> {
  return buildLocalizedAlternates(pathname, DEFAULT_ROUTE_LOCALE);
}
