import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchesIndexPage, {
  dynamic,
  generateMetadata as generateBaseMetadata,
} from "@/views/patches/PatchesIndexPage";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export { dynamic };

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return localizeMetadata(await generateBaseMetadata(), "/patches", locale);
}

export default PatchesIndexPage;
