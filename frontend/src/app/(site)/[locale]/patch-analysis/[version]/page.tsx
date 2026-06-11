import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, ROUTE_LOCALES } from "@/i18n/routing";
import { getPatchAnalysisVersions } from "@/lib/patchAnalysis";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchAnalysisPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/patch-analysis/PatchAnalysisPage";

interface LocalePageProps {
  params: Promise<{ locale: string; version: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const patchVersions = getPatchAnalysisVersions();

  return ROUTE_LOCALES.flatMap((locale) =>
    patchVersions.map((version) => ({
      locale,
      version,
    }))
  );
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchAnalysisVersions().includes(version)) {
    notFound();
  }

  return localizeMetadata(
    await generateBaseMetadata(version),
    `/patch-analysis/${version}`,
    locale
  );
}

export default async function LocalizedPatchAnalysisVersionPage({ params }: LocalePageProps) {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchAnalysisVersions().includes(version)) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchAnalysisPage version={version} />;
}
