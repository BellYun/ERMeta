import { Suspense } from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TrendingSection } from "@/components/features/TrendingSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { SynergyClient } from "@/components/features/SynergyClient";

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
      <Suspense>
        <GlobalFilter />
      </Suspense>
      <TrendingSection patch={patch} tier={tier} />
      <Suspense>
        <TierRankingTable />
      </Suspense>
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">3인 조합</h2>
        <SynergyClient />
      </div>
    </div>
  );
}
