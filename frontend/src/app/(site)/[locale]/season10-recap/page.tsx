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

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(baseMetadata, "/season10-recap", locale);
}

export default async function LocalizedSeasonRecapPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <SeasonRecapPage />;
}
