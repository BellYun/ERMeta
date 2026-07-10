import { BookOpenText, Gauge, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HomeMetaStats } from "@/lib/homeMetaShared";
import type { RankingResponse } from "@/lib/ranking";
import { HomeDashboardSections } from "./HomeDashboardSections";

interface HomePageContentProps {
  locale: string;
  patches: string[];
  homeMetaStats: HomeMetaStats;
  rankingData: RankingResponse;
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export async function HomePageContent({
  locale,
  patches,
  homeMetaStats,
  rankingData,
}: HomePageContentProps) {
  const t = await getTranslations({ locale, namespace: "home" });
  const defaultPatch = patches[0] ?? "";
  const totalMatches = rankingData.rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const hasRankingData = rankingData.rankings.length > 0 && totalMatches > 0;
  const trackedMatches = hasRankingData ? formatMetricNumber(totalMatches) : "";
  const fallbackPatch = defaultPatch || "11.6";
  const patchAnalysisHref = `/${locale}/patch-analysis/11.5`;

  return (
    <div className="page-shell home-shell flex flex-col">
      <section className="dashboard-panel home-hero px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="dashboard-section-title home-hero-title text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
                  {t("title")}
                </h1>
                {defaultPatch ? (
                  <span className="dashboard-kicker">{t("patch", { patch: defaultPatch })}</span>
                ) : null}
              </div>
              <p className="mt-3 max-w-[58rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
                {hasRankingData
                  ? t("subtitle", { count: trackedMatches })
                  : t("fallback.subtitle", { patch: fallbackPatch })}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={patchAnalysisHref}
                className="hidden items-center gap-1.5 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] sm:inline-flex"
              >
                <Gauge className="h-3.5 w-3.5" strokeWidth={2} />
                {t("patchAnalysisCta")}
              </a>
              <a
                href={`/${locale}/methodology`}
                className="hidden items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)] sm:inline-flex"
              >
                <BookOpenText className="h-3.5 w-3.5" strokeWidth={2} />
                {t("guide.cta")}
              </a>
              <a
                href="#home-mobile-filter"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] sm:hidden"
                aria-label={t("filterCta")}
              >
                <SlidersHorizontal className="h-4.5 w-4.5" strokeWidth={2} />
              </a>
            </div>
          </div>

          {hasRankingData ? (
            <div className="metric-card home-hero-metric p-0" data-accent="true">
              <div className="home-report-strip">
                <div className="home-report-primary">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    {t("matchMetric")}
                  </p>
                  <p className="mt-1 font-mono text-[1.9rem] font-bold leading-none text-[var(--color-accent-foreground)] sm:text-[2.35rem]">
                    {trackedMatches}
                  </p>
                </div>
                <div className="home-report-context">
                  <p className="text-xs font-semibold text-[var(--color-accent-foreground)]">
                    {t("patch", { patch: defaultPatch })}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {t("matchMetricDescription", { patch: defaultPatch })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div>
                <p className="text-xs font-medium text-[var(--color-foreground)]">
                  {t("fallback.kicker", { patch: fallbackPatch })}
                </p>
                <h2 className="mt-2 text-base font-bold text-[var(--color-foreground)]">
                  {t("fallback.title")}
                </h2>
                <p className="mt-3 max-w-[62rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
                  {t("fallback.body")}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { href: `/${locale}/character/1`, label: t("fallback.characterCta") },
                  { href: patchAnalysisHref, label: t("fallback.analysisCta") },
                  { href: `/${locale}/patches`, label: t("fallback.patchCta") },
                  { href: `/${locale}/methodology`, label: t("fallback.methodologyCta") },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasRankingData ? (
        <HomeDashboardSections
          patches={patches}
          homeMetaStats={homeMetaStats}
          defaultPatch={defaultPatch}
        />
      ) : null}
    </div>
  );
}
