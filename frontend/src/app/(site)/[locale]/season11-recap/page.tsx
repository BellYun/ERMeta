import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import SeasonRecapPage, { getSeasonRecapMetadata } from "@/views/season10-recap/Season10RecapPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const SEASON_NUMBER = 11;
const RECAP_PATH = "/season11-recap";
const BASE_METADATA = getSeasonRecapMetadata(SEASON_NUMBER, "/season11-recap-og-v2.png");

const SEASON_RECAP_METADATA = {
  ko: {
    title: "시즌 11 리캡 - 마지막 메타 기록",
    description: "이터널리턴 시즌 11의 패치별 평균 RP 주요 조합과 시즌 누적 랭킹을 정리합니다.",
  },
  en: {
    title: "Season 11 recap - final meta record",
    description: "Review Eternal Return Season 11 patch-by-patch RP leaders and season rankings.",
  },
  ja: {
    title: "シーズン11リキャップ - 最終メタ記録",
    description:
      "Eternal Return シーズン11のパッチ別平均RP主要編成とシーズン累計ランキングを整理します。",
  },
} as const;

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const base = localizeMetadata(BASE_METADATA, RECAP_PATH, locale);
  const copy = SEASON_RECAP_METADATA[locale];

  return {
    ...base,
    title: copy.title,
    description: copy.description,
    openGraph: base.openGraph
      ? {
          ...base.openGraph,
          title: copy.title,
          description: copy.description,
        }
      : undefined,
    twitter: base.twitter
      ? {
          ...base.twitter,
          title: copy.title,
          description: copy.description,
        }
      : undefined,
  };
}

export default async function LocalizedSeason11RecapPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <SeasonRecapPage locale={locale} seasonNumber={SEASON_NUMBER} />;
}
