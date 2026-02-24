import { GlobalFilter } from "@/components/features/GlobalFilter";
import { TrendingSection } from "@/components/features/TrendingSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <GlobalFilter />
      <TrendingSection />
      <TierRankingTable />
    </div>
  );
}
