import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LabPageContent } from "@/components/features/lab/LabPageContent";
import type { LabData } from "@/components/features/lab/types";
import { isRouteLocale, ROUTE_LOCALES } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";
import assassinsData from "../../../../../../public/data/lab/assassins.json";
import rangersData from "../../../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../../public/data/lab/warriors.json";

export const dynamic = "force-static";
export const dynamicParams = false;

const SUPPORTED_ROLES = [
  "rangers",
  "skilldealers",
  "tanks",
  "warriors",
  "assassins",
  "supports",
] as const;
type SupportedRole = (typeof SUPPORTED_ROLES)[number];

const LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: rangersData as LabData,
  skilldealers: skilldealersData as LabData,
  tanks: tanksData as LabData,
  warriors: warriorsData as LabData,
  assassins: assassinsData as LabData,
  supports: supportsData as LabData,
};

interface Props {
  params: Promise<{ locale: string; role: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.flatMap((locale) => SUPPORTED_ROLES.map((role) => ({ locale, role })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role } = await params;
  if (!isRouteLocale(locale)) notFound();
  const data = LAB_DATA[role as SupportedRole];
  if (!data) return { title: "캐릭터 유형 분석 | ER&GG" };
  const title = `${data.role} 시너지 그룹 — 캐릭터 유형 분석 | ER&GG`;
  const description = `${data.role} 캐릭터별 강한 조합·주의 조합을 데이터로 확인하세요. 패치 무관 누적 통계 기준.`;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: `/character-lab/${role}` },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CharacterLabRolePage({ params }: Props) {
  const { locale, role } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  if (!SUPPORTED_ROLES.includes(role as SupportedRole)) notFound();
  const data = LAB_DATA[role as SupportedRole];

  return (
    <main className="page-shell mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href="/character-lab"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          캐릭터 유형 분석
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="text-[var(--color-foreground)]">{data.role}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-[-0.03em] text-[var(--color-foreground)]">
            {data.role} 시너지 그룹
          </h1>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-0.5 text-[11px] text-[var(--color-muted-foreground)]">
            패치 무관 누적 통계 · 시즌 전체 기준
          </span>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          3인 조합 역할군별 평균 RP 기여를 분석한 시너지 데이터입니다. 표본{" "}
          {data.minGames.toLocaleString("ko-KR")}판 미만 조합은 제외됩니다.
        </p>
      </div>

      <LabPageContent data={data} />
    </main>
  );
}
