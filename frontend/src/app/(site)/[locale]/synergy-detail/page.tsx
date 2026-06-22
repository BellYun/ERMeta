import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import SynergyDetailPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/synergy-detail/SynergyDetailPage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface LocalePageProps {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}

const SYNERGY_DETAIL_METADATA = {
  ko: {
    title: "상세 조합 - 무기와 특성 포함",
    description: "이터널리턴 무기와 메인 특성까지 포함해 3인 조합을 비교합니다.",
  },
  en: {
    title: "Detailed team data - weapons and traits",
    description: "Compare Eternal Return team compositions with weapon and main trait context.",
  },
  ja: {
    title: "詳細編成データ - 武器と特性込み",
    description: "武器とメイン特性を含めて Eternal Return の3人編成を比較します。",
  },
  "zh-Hans": {
    title: "详细阵容数据 - 包含武器和特性",
    description: "结合武器和主特性比较 Eternal Return 三人阵容。",
  },
  "zh-Hant": {
    title: "詳細陣容資料 - 包含武器和特性",
    description: "結合武器和主特性比較 Eternal Return 三人陣容。",
  },
} as const;

export async function generateMetadata({
  params,
  searchParams,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const base = localizeMetadata(
    await generateBaseMetadata({ searchParams }),
    "/synergy-detail",
    locale
  );
  const copy = SYNERGY_DETAIL_METADATA[locale];

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

export default async function LocalizedSynergyDetailPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <SynergyDetailPage />;
}
