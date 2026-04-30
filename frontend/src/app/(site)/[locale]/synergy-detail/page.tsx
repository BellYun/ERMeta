import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import SynergyDetailPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/synergy-detail/SynergyDetailPage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface LocalePageProps {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}

export async function generateMetadata({
  params,
  searchParams,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(await generateBaseMetadata({ searchParams }), "/synergy-detail", locale);
}

export default SynergyDetailPage;
