/* Hallmark · genre: modern-minimal · macrostructure: Index-First ledger · design-system: design.md · designed-as-app
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Fragment } from "react";
import { SiteContentAd } from "@/components/ads/SiteContentAd";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { getAllPatchVersions, getPatchSummary } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { getStaticTranslator } from "@/lib/staticIntl";

export const dynamic = "force-static";

export async function generateMetadata(locale: RouteLocale = "ko"): Promise<Metadata> {
  const t = await getStaticTranslator("patches", LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const title = t("indexTitle");
  return {
    title,
    description: t("indexDescription"),
    alternates: { canonical: "/patches" },
    openGraph: {
      title,
      description: t("indexDescription"),
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function PatchesIndexPage({ locale = "ko" }: { locale?: RouteLocale }) {
  const t = await getStaticTranslator("patches", LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const versions = getAllPatchVersions();
  const summaries = versions.map((version) => getPatchSummary(version));
  const latestSummary = summaries[0];
  const seasonGroups = Array.from(
    summaries.reduce((groups, summary) => {
      const season = summary.patch.split(".")[0] ?? summary.patch;
      const current = groups.get(season) ?? [];
      current.push(summary);
      groups.set(season, current);
      return groups;
    }, new Map<string, typeof summaries>())
  );

  return (
    <div className="page-shell flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
          {t("indexTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t("indexSubtitle")}</p>
      </header>
      {latestSummary && (
        <Link
          href={`/patches/${latestSummary.patch}`}
          className="group flex min-w-0 flex-col gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--color-accent-foreground)]">
              {t("latestPatchLabel")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
              {t("detailHeading", { patch: latestSummary.patch })}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {t("characterCount", { count: latestSummary.characterCount })} ·{" "}
              {t("totalChanges", { count: latestSummary.totalChanges })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChangeTypeBadgeStatic
              type="buff"
              count={latestSummary.buffs}
              label={t("counts.buff")}
            />
            <ChangeTypeBadgeStatic
              type="nerf"
              count={latestSummary.nerfs}
              label={t("counts.nerf")}
            />
            {latestSummary.reworks > 0 && (
              <ChangeTypeBadgeStatic
                type="rework"
                count={latestSummary.reworks}
                label={t("counts.rework")}
              />
            )}
            <ArrowRight
              aria-hidden="true"
              size={18}
              className="ml-2 text-[var(--color-muted-foreground)]"
            />
          </div>
        </Link>
      )}
      <section className="dashboard-panel overflow-hidden">
        <header className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-2xl">
            {locale === "ko" ? "지난 패치" : t("archiveTitle")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
            {t("archiveCaption")}
          </p>
        </header>

        <div className="divide-y divide-[var(--color-border)]">
          {seasonGroups
            .filter(([, summaries]) =>
              summaries.some((summary) => summary.patch !== latestSummary?.patch)
            )
            .map(([season, seasonSummaries], index) => (
              <Fragment key={season}>
                <section className="grid lg:grid-cols-[116px_minmax(0,1fr)]">
                  <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 lg:block lg:border-b-0 lg:border-r lg:px-4 lg:py-4">
                    <h3 className="font-mono text-base font-bold text-[var(--color-foreground)]">
                      {t("patchPrefix")} {season}.x
                    </h3>
                    <p className="mt-0 text-xs text-[var(--color-muted-foreground)] lg:mt-1">
                      {t("trackedPatches")}{" "}
                      {
                        seasonSummaries.filter((summary) => summary.patch !== latestSummary?.patch)
                          .length
                      }
                    </p>
                  </header>

                  <ol className="divide-y divide-[var(--color-border)]">
                    {seasonSummaries
                      .filter((summary) => summary.patch !== latestSummary?.patch)
                      .map((summary) => {
                        const isLatest = summary.patch === latestSummary?.patch;
                        return (
                          <li key={summary.patch}>
                            <Link
                              href={`/patches/${summary.patch}`}
                              className="group grid min-h-16 min-w-0 grid-cols-[minmax(74px,0.45fr)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 outline-none transition-[background-color] duration-150 hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-inset sm:grid-cols-[minmax(92px,0.4fr)_minmax(170px,0.8fr)_minmax(0,1fr)_auto] sm:px-5"
                              aria-current={isLatest ? "page" : undefined}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-base font-bold text-[var(--color-foreground)]">
                                    {t("patchPrefix")} {summary.patch}
                                  </span>
                                  {isLatest ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                                  ) : null}
                                </div>
                                <span className="mt-0.5 block text-[10px] text-[var(--color-muted-foreground)] sm:hidden">
                                  {t("totalChanges", { count: summary.totalChanges })}
                                </span>
                              </div>

                              <div className="hidden min-w-0 sm:block">
                                <p className="text-sm text-[var(--color-foreground)]">
                                  {t("characterCount", { count: summary.characterCount })}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                  {t("totalChanges", { count: summary.totalChanges })}
                                </p>
                              </div>

                              <div className="flex min-w-0 flex-wrap justify-end gap-1.5 sm:justify-start">
                                {summary.buffs > 0 ? (
                                  <ChangeTypeBadgeStatic
                                    type="buff"
                                    count={summary.buffs}
                                    label={t("counts.buff")}
                                  />
                                ) : null}
                                {summary.nerfs > 0 ? (
                                  <ChangeTypeBadgeStatic
                                    type="nerf"
                                    count={summary.nerfs}
                                    label={t("counts.nerf")}
                                  />
                                ) : null}
                                {summary.reworks > 0 ? (
                                  <ChangeTypeBadgeStatic
                                    type="rework"
                                    count={summary.reworks}
                                    label={t("counts.rework")}
                                  />
                                ) : null}
                              </div>

                              <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--color-foreground)]" />
                            </Link>
                          </li>
                        );
                      })}
                  </ol>
                </section>
                {index === 0 ? (
                  <div className="p-3 sm:p-4">
                    <SiteContentAd />
                  </div>
                ) : null}
              </Fragment>
            ))}
        </div>
      </section>
    </div>
  );
}
