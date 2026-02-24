import { Suspense } from "react";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TrendingSection } from "@/components/features/TrendingSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";

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
    </div>
  );
}
