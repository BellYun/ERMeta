import type { Metadata } from "next";
import { DEFAULT_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";
import {
  buildDefaultAlternates,
  buildLocalizedAlternates,
  localizeRoutePath,
} from "@/lib/seoLocales";
import {
  getMessage,
  loadIntlMessages,
  OG_LOCALE_BY_LANGUAGE,
  STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE,
} from "@/lib/staticIntl";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com";
const GOOGLE_SITE_VERIFICATION = "LvphMHW2n7maCTUH68mpsXDmFexrs_KFI0hz10hxAVI";

function buildRobots(index: boolean): NonNullable<Metadata["robots"]> {
  return {
    index,
    follow: true,
    googleBot: {
      index,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  };
}

function getLocalizedSearchTarget(locale: RouteLocale): string {
  if (locale === DEFAULT_ROUTE_LOCALE) {
    return "/character/{character_code}";
  }

  return `/${locale}/character/{character_code}`;
}

export async function buildSiteMetadata(
  language: SupportedLanguage,
  locale: RouteLocale
): Promise<Metadata> {
  const messages = await loadIntlMessages(language);
  const titleDefault = getMessage(messages, "rootMetadata.defaultTitle");
  const description = getMessage(messages, "rootMetadata.description");
  const siteName = getMessage(messages, "rootMetadata.siteName");
  const author = getMessage(messages, "rootMetadata.author");
  const creator = getMessage(messages, "rootMetadata.creator");
  const indexable = locale === DEFAULT_ROUTE_LOCALE || locale === "ja";

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: titleDefault,
      template: getMessage(messages, "rootMetadata.titleTemplate"),
    },
    description,
    keywords: [
      getMessage(messages, "rootMetadata.keywords.brand"),
      getMessage(messages, "rootMetadata.keywords.brandAlt"),
      getMessage(messages, "rootMetadata.keywords.app"),
      getMessage(messages, "rootMetadata.keywords.appSymbol"),
      getMessage(messages, "rootMetadata.keywords.gameKo"),
      getMessage(messages, "rootMetadata.keywords.gameEn"),
      getMessage(messages, "rootMetadata.keywords.tierList"),
      getMessage(messages, "rootMetadata.keywords.meta"),
      getMessage(messages, "rootMetadata.keywords.synergy"),
      getMessage(messages, "rootMetadata.keywords.characterAnalysis"),
      getMessage(messages, "rootMetadata.keywords.winRate"),
      getMessage(messages, "rootMetadata.keywords.pickRate"),
      getMessage(messages, "rootMetadata.keywords.rp"),
      getMessage(messages, "rootMetadata.keywords.stats"),
    ],
    authors: [{ name: author }],
    creator,
    openGraph: {
      type: "website",
      locale: OG_LOCALE_BY_LANGUAGE[language] ?? "en_US",
      url: localizeRoutePath("/", locale),
      siteName,
      title: titleDefault,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
    },
    robots: buildRobots(indexable),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon", type: "image/png", sizes: "48x48" },
      ],
      apple: "/apple-icon",
    },
    alternates: buildLocalizedAlternates("/", locale),
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
    },
  };
}

export async function buildDefaultSiteMetadata(): Promise<Metadata> {
  const messages = await loadIntlMessages(DEFAULT_LANGUAGE);
  const titleDefault = getMessage(messages, "rootMetadata.defaultTitle");
  const description = getMessage(messages, "rootMetadata.description");
  const siteName = getMessage(messages, "rootMetadata.siteName");
  const author = getMessage(messages, "rootMetadata.author");
  const creator = getMessage(messages, "rootMetadata.creator");

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: titleDefault,
      template: getMessage(messages, "rootMetadata.titleTemplate"),
    },
    description,
    authors: [{ name: author }],
    creator,
    openGraph: {
      type: "website",
      locale: OG_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko_KR",
      url: localizeRoutePath("/", DEFAULT_ROUTE_LOCALE),
      siteName,
      title: titleDefault,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
    },
    robots: buildRobots(true),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon", type: "image/png", sizes: "48x48" },
      ],
      apple: "/apple-icon",
    },
    alternates: buildDefaultAlternates("/"),
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
    },
  };
}

export async function buildWebsiteStructuredData(
  language: SupportedLanguage,
  locale: RouteLocale
): Promise<Record<string, unknown>> {
  const messages = await loadIntlMessages(language);
  const localizedHomePath = localizeRoutePath("/", locale);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: getMessage(messages, "rootMetadata.siteName"),
    url: `${BASE_URL}${localizedHomePath}`,
    description: getMessage(messages, "rootMetadata.structuredDescription"),
    inLanguage: STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE[language] ?? "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}${getLocalizedSearchTarget(locale)}`,
      "query-input": "required name=character_code",
    },
  };
}
