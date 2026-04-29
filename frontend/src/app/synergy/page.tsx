import { ArrowRight, Network, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SynergyClient } from "@/components/features/SynergyClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const tNav = await getTranslations("navigation");
  const tPage = await getTranslations("synergyPage");

  return {
    title: `${tNav("synergyRecommendation")} | ER&GG`,
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
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] sm:px-3 sm:text-sm">
                <Network className="h-3.5 w-3.5" strokeWidth={2} />
                {tNav("synergyRecommendation")}
              </span>
              <span className="rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-warning)]">
                {tPage("beta")}
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.1rem]">
              {tNav("synergyRecommendation")}
            </h1>
            <p className="mt-2.5 max-w-[42rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.05rem]">
              {tPage("subtitle")}
            </p>
          </div>

          <div className="metric-card flex min-h-[132px] flex-col justify-between px-4 py-4 sm:px-5 sm:py-5">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.12)] text-[var(--color-accent-gold)]">
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </div>
              <p className="mt-4 text-[1.15rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.35rem]">
                {tPage("title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {tPage("steps.analysis.sublabel")}
              </p>
            </div>

            <Link
              href="/synergy-detail"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.07)]"
            >
              {tPage("title")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <h2 className="text-[1.4rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.8rem]">
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
