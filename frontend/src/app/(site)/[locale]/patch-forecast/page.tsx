import { notFound, redirect } from "next/navigation";
import { getPatchTierForecastVersions } from "@/data/patch-tier-forecasts";
import { isRouteLocale } from "@/i18n/routing";
import { localizeRoutePath } from "@/lib/seoLocales";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function LocalizedPatchForecastRedirectPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const latestPatch = getPatchTierForecastVersions()[0];
  if (!latestPatch) notFound();
  redirect(localizeRoutePath(`/patch-forecast/${latestPatch}`, locale));
}
