import { notFound } from "next/navigation";
import { HomeDashboardSections } from "@/components/features/home/HomeDashboardSections";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";

export const dynamic = "force-dynamic";

const BENCHMARK_PATCH = "11.5";

export default async function HomeFilterPerformanceLab() {
  if (process.env.PERF_LAB_ENABLED !== "1") {
    notFound();
  }

  const homeMetaStats = await getCachedHomeMetaStats(BENCHMARK_PATCH);

  return (
    <main className="page-shell mx-auto max-w-[1440px] py-6">
      <HomeDashboardSections
        patches={[BENCHMARK_PATCH]}
        homeMetaStats={homeMetaStats}
        defaultPatch={BENCHMARK_PATCH}
      />
    </main>
  );
}
