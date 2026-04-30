import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageContent } from "@/components/features/home/HomePageContent";
import { LANGUAGE_BY_ROUTE_LOCALE, ROUTE_LOCALES, isRouteLocale } from "@/i18n/routing";
import { getPatches } from "@/lib/getPatches";
import { fetchHoneyPicksServer } from "@/lib/honeyPicks";
import { fetchRankingData } from "@/lib/ranking";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";
import { getMessage, loadIntlMessages, OG_LOCALE_BY_LANGUAGE } from "@/lib/staticIntl";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = false;

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }
  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];

  const messages = await loadIntlMessages(language);
  const title = `${getMessage(messages, "home.title")} | ${getMessage(messages, "rootMetadata.siteName")}`;
  const description = getMessage(messages, "rootMetadata.description");

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: title },
    description,
    keywords: [
      getMessage(messages, "rootMetadata.keywords.brand"),
      getMessage(messages, "rootMetadata.keywords.gameEn"),
      getMessage(messages, "rootMetadata.keywords.tierList"),
      getMessage(messages, "rootMetadata.keywords.meta"),
      getMessage(messages, "rootMetadata.keywords.winRate"),
      getMessage(messages, "rootMetadata.keywords.pickRate"),
      getMessage(messages, "rootMetadata.keywords.stats"),
    ],
    openGraph: {
      locale: OG_LOCALE_BY_LANGUAGE[language] ?? "ja_JP",
      title,
      description,
      url: localizeRoutePath("/", locale),
    },
    twitter: {
      title,
      description,
    },
    alternates: buildLocalizedAlternates("/", locale),
    robots: {
      index: locale === "ko" || locale === "ja",
      follow: true,
    },
  };
}

export default async function LocalizedHomePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const defaultTier = "MITHRIL";
  const emptyRankingData: Awaited<ReturnType<typeof fetchRankingData>> = {
    rankings: [],
    previousRankings: [],
    patchVersion: "",
    previousPatch: null,
    tier: defaultTier,
  };

  const patches = await getPatches();
  const defaultPatch = patches[0] ?? "";

  let honeyData: Awaited<ReturnType<typeof fetchHoneyPicksServer>> = {
    picks: [],
    patchVersion: "",
    previousPatch: null as string | null,
    tier: defaultTier,
  };
  let rankingData = emptyRankingData;

  if (defaultPatch) {
    try {
      [honeyData, rankingData] = await Promise.all([
        fetchHoneyPicksServer(defaultPatch, defaultTier),
        fetchRankingData(defaultPatch, defaultTier),
      ]);
    } catch {
      honeyData = { ...honeyData, patchVersion: defaultPatch };
      rankingData = { ...emptyRankingData, patchVersion: defaultPatch };
    }
  }

  return (
    <HomePageContent
      locale={locale}
      patches={patches}
      honeyPicks={honeyData.picks}
      honeyPatchVersion={honeyData.patchVersion}
      rankingData={rankingData}
    />
  );
}
