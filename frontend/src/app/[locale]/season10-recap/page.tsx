import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import SeasonRecapPage, {
  metadata as baseMetadata,
  revalidate,
} from "@/views/season10-recap/Season10RecapPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export { revalidate };

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(baseMetadata, "/season10-recap", locale);
}

export default SeasonRecapPage;
