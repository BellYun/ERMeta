import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TrioLabDetailContent } from "@/components/features/trio-lab/TrioLabDetailContent";
import { characterDisplayName, parseComboId } from "@/components/features/trio-lab/types";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-static";
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string; comboId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  const members = parseComboId(comboId);
  if (!members) return { title: "조합 정보를 찾을 수 없습니다 | ER&GG" };
  const trioName = members.map((m) => characterDisplayName(m.character)).join(" + ");
  const title = `${trioName} — trio-weapon 조합 상세 | ER&GG`;
  const description =
    "이터널리턴 trio-weapon 통계 기반 조합 분석. 캐릭터별 추천 장비 빌드, 최근 패치 변동, 비슷한 조합을 한 페이지에서 확인하세요.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: `/trio-lab/${comboId}` },
    twitter: { title, description },
    robots: { index: false, follow: true },
  };
}

export default async function TrioLabDetailPage({ params }: PageProps) {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const members = parseComboId(comboId);
  if (!members) notFound();

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <TrioLabDetailContent comboId={comboId} locale={locale} />
    </main>
  );
}
