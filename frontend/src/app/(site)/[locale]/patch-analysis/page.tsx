import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchAnalysisPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/patch-analysis/PatchAnalysisPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 21600;
export const dynamic = "force-static";

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(await generateBaseMetadata(), "/patch-analysis", locale);
}

export default async function LocalizedPatchAnalysisPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchAnalysisPage />;
}
