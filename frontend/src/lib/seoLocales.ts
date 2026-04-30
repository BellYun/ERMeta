import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { DEFAULT_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";

// 일본어만 별도 locale path + hreflang 대상으로 운영한다.
export const SEO_TARGET_LOCALE = "ja" as const;
export type SeoLocaleSegment = typeof SEO_TARGET_LOCALE;

export interface SeoLanguageAlternates {
  ko: string;
  ja: string;
  "x-default": string;
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
    ja: localizeRoutePath(pathname, SEO_TARGET_LOCALE),
    "x-default": localizeRoutePath(pathname, DEFAULT_ROUTE_LOCALE),
  };
}

export function buildLocalizedAlternates(
  pathname: string,
  locale: RouteLocale
): NonNullable<Metadata["alternates"]> {
  const canonical = localizeRoutePath(pathname, locale);

  if (locale === SEO_TARGET_LOCALE || locale === DEFAULT_ROUTE_LOCALE) {
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
