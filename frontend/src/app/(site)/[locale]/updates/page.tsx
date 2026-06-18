import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import UpdatesPage, { metadata as baseMetadata } from "@/views/legal/UpdatesPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const localized = localizeMetadata(baseMetadata, "/updates", locale);
  const titles = {
    ko: "업데이트 내역",
    en: "Updates",
    ja: "更新履歴",
    "zh-Hans": "更新记录",
    "zh-Hant": "更新紀錄",
  } as const;

  return {
    ...localized,
    title: titles[locale],
  };
}

export default async function LocalizedUpdatesPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <UpdatesPage locale={locale} />;
}
