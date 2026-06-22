import { ArrowRight, Network } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SynergyClient } from "@/components/features/SynergyClient";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const tNav = await getTranslations("navigation");
  const tPage = await getTranslations("synergyPage");

  return {
    title: tNav("synergyRecommendation"),
    description: tPage("subtitle"),
    alternates: { canonical: "/synergy" },
    openGraph: {
      title: tNav("synergyRecommendation"),
      description: tPage("subtitle"),
      url: "/synergy",
    },
  };
}

export default async function SynergyPage() {
  const tNav = await getTranslations("navigation");
  const tPage = await getTranslations("synergyPage");

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker gap-1.5">
                <Network className="h-3.5 w-3.5" strokeWidth={2} />
                {tNav("synergyRecommendation")}
              </span>
            </div>

            <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {tNav("synergyRecommendation")}
            </h1>
            <p className="mt-2 max-w-[42rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
              {tPage("subtitle")}
            </p>
            <p className="mt-1.5 max-w-[42rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
              {tPage("description")}
            </p>
          </div>

          <div className="metric-card px-4 py-4 sm:px-5" data-accent="true">
            <div>
              <p className="text-base font-bold text-[var(--color-accent-foreground)]">
                {tPage("title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {tPage("steps.analysis.sublabel")}
              </p>
            </div>

            <Link href="/synergy-detail" className="dashboard-tab mt-4 gap-2" data-active="true">
              {tPage("title")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <h2 className="dashboard-section-title text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
            {tNav("synergyRecommendation")}
          </h2>
          <p className="pb-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
            {tPage("dataNotice")}
          </p>
        </div>
        <SynergyClient />
      </section>
    </div>
  );
}
