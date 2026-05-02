import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ROUTE_LOCALES, isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchDetailPage, {
  generateMetadata as generateBaseMetadata,
  generateStaticParams as generateBaseStaticParams,
} from "@/views/patches/PatchDetailPage";

interface LocalePageProps {
  params: Promise<{ locale: string; version: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return generateBaseStaticParams().flatMap(({ version }) =>
    ROUTE_LOCALES.map((locale) => ({ locale, version }))
  );
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale, version } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(
    await generateBaseMetadata({ params: Promise.resolve({ version }) }),
    `/patches/${version}`,
    locale
  );
}

export default async function LocalizedPatchDetailPage({ params }: LocalePageProps) {
  const { locale, version } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchDetailPage params={Promise.resolve({ version })} />;
}
