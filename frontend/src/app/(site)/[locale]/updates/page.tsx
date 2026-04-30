import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import UpdatesPage, { metadata as baseMetadata } from "@/views/legal/UpdatesPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(baseMetadata, "/updates", locale);
}

export default UpdatesPage;
