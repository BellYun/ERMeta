import type { Metadata } from "next"
import { Suspense } from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { TopTriosPreview } from "@/components/features/TopTriosPreview";

export const metadata: Metadata = {
  title: "메타 분석",
  description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계. 다이아~상위 1000위 데이터 기반 실시간 메타 분석.",
  keywords: ["루미아 스탯", "이터널리턴 티어표", "이터널리턴 메타", "이터널리턴 캐릭터 순위", "이터널리턴 승률", "이터널리턴 픽률"],
  openGraph: {
    title: "메타 분석 | 루미아 스탯 LumiaStats",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
    url: "/",
  },
  twitter: {
    title: "메타 분석 | 루미아 스탯 LumiaStats",
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
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
          RP 상위 3인 조합 Top 10
        </h2>
        <TopTriosPreview />
      </section>
      <Suspense>
        <GlobalFilter />
      </Suspense>
      <Suspense>
        <TierRankingTable />
      </Suspense>
    </div>
  );
}
