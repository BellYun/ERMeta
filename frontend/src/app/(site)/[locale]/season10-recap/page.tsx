import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import SeasonRecapPage, {
  metadata as baseMetadata,
} from "@/views/season10-recap/Season10RecapPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const SEASON_RECAP_METADATA = {
  ko: {
    title: "시즌 10 리캡 - 마지막 메타 기록",
    description: "이터널리턴 시즌 10 패치별 평균 RP 주요 조합과 시즌 누적 랭킹을 정리합니다.",
  },
  en: {
    title: "Season 10 recap - final meta record",
    description: "Review Eternal Return Season 10 patch-by-patch RP leaders and season rankings.",
  },
  ja: {
    title: "シーズン10リキャップ - 最終メタ記録",
    description:
      "Eternal Return シーズン10のパッチ別平均RP主要編成とシーズン累計ランキングを整理します。",
  },
  "zh-Hans": {
    title: "第 10 赛季回顾 - 最终 Meta 记录",
    description: "整理 Eternal Return 第 10 赛季各版本平均 RP 前列阵容和赛季累计排名。",
  },
  "zh-Hant": {
    title: "第 10 賽季回顧 - 最終 Meta 記錄",
    description: "整理 Eternal Return 第 10 賽季各版本平均 RP 前列陣容和賽季累計排名。",
  },
} as const;

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const base = localizeMetadata(baseMetadata, "/season10-recap", locale);
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

export default async function LocalizedSeasonRecapPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <SeasonRecapPage locale={locale} />;
}
