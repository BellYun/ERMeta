import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabPageContent } from "@/components/features/lab/LabPageContent";
import type { LabData } from "@/components/features/lab/types";
import { buildDefaultAlternates } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";
import rangersData from "../../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../../public/data/lab/skilldealers.json";
import tanksData from "../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../public/data/lab/warriors.json";

export const dynamic = "force-static";
export const dynamicParams = false;

const SUPPORTED_ROLES = ["rangers", "skilldealers", "tanks", "warriors"] as const;
type SupportedRole = (typeof SUPPORTED_ROLES)[number];

const LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: rangersData as LabData,
  skilldealers: skilldealersData as LabData,
  tanks: tanksData as LabData,
  warriors: warriorsData as LabData,
};

interface Props {
  params: Promise<{ role: string }>;
}

export function generateStaticParams() {
  return SUPPORTED_ROLES.map((role) => ({ role }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  const data = LAB_DATA[role as SupportedRole];
  if (!data) {
    return { title: "랩 | ER&GG" };
  }
  const title = `${data.role} 시너지 그룹 — 랩 | ER&GG`;
  const description = `${data.role} 캐릭터별 강한 조합·주의 조합을 데이터로 확인하세요. 패치 무관 누적 통계 기준.`;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/lab/${role}`,
    },
    twitter: {
      title,
      description,
    },
    alternates: buildDefaultAlternates(`/lab/${role}`),
    robots: { index: true, follow: true },
  };
}

export default async function LabRolePage({ params }: Props) {
  const { role } = await params;

  if (!SUPPORTED_ROLES.includes(role as SupportedRole)) {
    notFound();
  }

  const data = LAB_DATA[role as SupportedRole];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">
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
