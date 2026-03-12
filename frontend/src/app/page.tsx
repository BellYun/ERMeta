import type { Metadata } from "next"
import { Suspense } from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection";

export const metadata: Metadata = {
  title: "메타 분석",
  description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계. 다이아~상위 1000위 데이터 기반 실시간 메타 분석.",
  keywords: ["이리와지지", "이리와GG", "ERGG", "이터널리턴 티어표", "이터널리턴 메타", "이터널리턴 캐릭터 순위", "이터널리턴 승률", "이터널리턴 픽률"],
  openGraph: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
    url: "/",
  },
  twitter: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
  },
  alternates: { canonical: "/" },
}

interface SearchParams {
  patch?: string;
  tier?: string;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { patch, tier } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {/* 이번 패치 떡상 TOP 5 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[var(--color-accent-gold)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            이번 패치 떡상 TOP 5
          </h2>
        </div>
        <Suspense>
          <HoneyPicksSection />
        </Suspense>
      </section>

      {/* Filter + Table */}
      <Suspense>
        <GlobalFilter />
      </Suspense>
      <Suspense>
        <TierRankingTable />
      </Suspense>
    </div>
  );
}
