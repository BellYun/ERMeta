import type { Metadata } from "next";
import { DEFAULT_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";

export function localizeMetadata(
  metadata: Metadata,
  pathname: string,
  locale: RouteLocale
): Metadata {
  const localizedPath = localizeRoutePath(pathname, locale);

  return {
    ...metadata,
    metadataBase: metadata.metadataBase ?? new URL(BASE_URL),
    alternates: buildLocalizedAlternates(pathname, locale),
    openGraph: metadata.openGraph
      ? {
          ...metadata.openGraph,
          url: localizedPath,
        }
      : undefined,
    robots:
      locale === DEFAULT_ROUTE_LOCALE || locale === "ja"
        ? metadata.robots
        : { index: false, follow: true },
  };
}
