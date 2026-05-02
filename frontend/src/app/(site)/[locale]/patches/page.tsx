import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchesIndexPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/patches/PatchesIndexPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-static";

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(await generateBaseMetadata(), "/patches", locale);
}

export default async function LocalizedPatchesIndexPage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchesIndexPage />;
}
