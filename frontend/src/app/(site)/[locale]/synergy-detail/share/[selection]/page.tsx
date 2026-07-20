import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SynergyShareRedirect } from "@/components/features/synergy-detail/SynergyShareRedirect";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { parseSynergyShareSelection } from "@/lib/synergyShare";
import { generateMetadata as generateBaseMetadata } from "@/views/synergy-detail/SynergyDetailPage";

interface SynergySharePageProps {
  params: Promise<{ locale: string; selection: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: SynergySharePageProps): Promise<Metadata> {
  const { locale, selection } = await params;
  const parsedSelection = parseSynergyShareSelection(selection);

  if (!isRouteLocale(locale) || !parsedSelection) {
    notFound();
  }

  setRequestLocale(locale);

  const pathname = `/synergy-detail/share/${selection}`;
  const base = localizeMetadata(
    await generateBaseMetadata({
      ally1: parsedSelection.ally1,
      ally2: parsedSelection.ally2,
      pathname,
    }),
    pathname,
    locale
  );

  return {
    ...base,
    alternates: buildLocalizedAlternates("/synergy-detail", locale),
    robots: { index: false, follow: true },
  };
}

export default async function SynergySharePage({ params }: SynergySharePageProps) {
  const { locale, selection } = await params;
  const parsedSelection = parseSynergyShareSelection(selection);

  if (!isRouteLocale(locale) || !parsedSelection) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <SynergyShareRedirect
      fallbackPath={localizeRoutePath("/synergy-detail", locale)}
      selection={parsedSelection}
    />
  );
}
