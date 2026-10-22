import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrioBuilder } from "@/components/features/trio-builder/TrioBuilder";
import { isRouteLocale } from "@/i18n/routing";

export const dynamic = "force-static";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "trioBuilder" });
  return { title: t("title"), description: t("description") };
}
export default async function TrioBuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  return <TrioBuilder />;
}
