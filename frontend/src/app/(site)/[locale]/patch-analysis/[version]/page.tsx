import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { isRouteLocale, ROUTE_LOCALES } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchAnalysisPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/patch-analysis/PatchAnalysisPage";

interface LocalePageProps {
  params: Promise<{ locale: string; version: string }>;
}

export const revalidate = 21600;
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const latestPatch = getStatsPatchVersions()[0];
  if (!latestPatch) return [];

  return ROUTE_LOCALES.map((locale) => ({
    locale,
    version: latestPatch,
  }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || version !== getStatsPatchVersions()[0]) {
    notFound();
  }

  return localizeMetadata(await generateBaseMetadata(), `/patch-analysis/${version}`, locale);
}

export default async function LocalizedPatchAnalysisVersionPage({ params }: LocalePageProps) {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || version !== getStatsPatchVersions()[0]) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchAnalysisPage />;
}
