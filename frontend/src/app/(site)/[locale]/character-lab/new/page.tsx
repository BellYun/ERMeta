import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";
import FrozenCharacterAffinityPage from "../FrozenCharacterAffinityPage";

interface NewCharacterLabRouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metric?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: NewCharacterLabRouteProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();

  const title = locale === "ko" ? "신규 실험체 유형 분석" : "New Character Role Analysis";
  const description =
    locale === "ko"
      ? "시즌 10·11 조합 경향과 RP 상승, 판수 신뢰도를 함께 반영한 신규 실험체 유형 분석입니다."
      : "An experimental character-role analysis using Seasons 10–11 composition trends, RP lift, and sample confidence.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/character-lab/new" },
    twitter: { title, description },
    robots: { index: false, follow: true },
  };
}

export default FrozenCharacterAffinityPage;
