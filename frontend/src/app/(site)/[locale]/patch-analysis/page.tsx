import { notFound, redirect } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { getPatchAnalysisVersions } from "@/lib/patchAnalysis";
import { localizeRoutePath } from "@/lib/seoLocales";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function LocalizedPatchAnalysisRedirectPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const latestPatch = getPatchAnalysisVersions()[0];
  if (!latestPatch) notFound();
  redirect(localizeRoutePath(`/patch-analysis/${latestPatch}`, locale));
}
