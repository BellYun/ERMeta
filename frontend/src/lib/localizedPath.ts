import { getPathname } from "@/i18n/navigation";
import {
  DEFAULT_ROUTE_LOCALE,
  ROUTE_LOCALE_BY_LANGUAGE,
  isRouteLocale,
  type RouteLocale,
} from "@/i18n/routing";
import type { SupportedLanguage } from "@/lib/detectLanguage";

export function getRouteLocaleSegmentFromPathname(
  pathname: string | null | undefined
): RouteLocale | null {
  if (!pathname) return null;
  const segment = pathname.split("/")[1];
  return segment && isRouteLocale(segment) ? segment : null;
}

export function getRouteLocaleFromPathname(pathname: string | null | undefined): RouteLocale {
  return getRouteLocaleSegmentFromPathname(pathname) ?? DEFAULT_ROUTE_LOCALE;
}

export function withCurrentRouteLocale(
  pathname: string | null | undefined,
  targetPath: string
): string {
  return getPathname({
    href: targetPath,
    locale: getRouteLocaleFromPathname(pathname),
  });
}

export function stripRouteLocaleFromPathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const locale = getRouteLocaleSegmentFromPathname(pathname);
  if (!locale) return pathname;
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function getLanguageTargetPath(
  pathname: string | null | undefined,
  language: SupportedLanguage
): string {
  return getPathname({
    href: stripRouteLocaleFromPathname(pathname),
    locale: ROUTE_LOCALE_BY_LANGUAGE[language],
  });
}

export const getSeoLocaleFromPathname = getRouteLocaleSegmentFromPathname;
export const withCurrentSeoLocale = withCurrentRouteLocale;
export const stripSeoLocaleFromPathname = stripRouteLocaleFromPathname;
