import type { Metadata } from "next"
import { Suspense } from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TrendingSection } from "@/components/features/TrendingSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { TopTriosPreview } from "@/components/features/TopTriosPreview";

export const metadata: Metadata = {
  title: "메타 분석 | ERMeta",
  description: "이터널리턴 캐릭터 티어, 픽률, 승률 통계 분석.",
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
      <TrendingSection patch={patch} tier={tier} />
      <Suspense>
        <TierRankingTable />
      </Suspense>
    </div>
  );
}
