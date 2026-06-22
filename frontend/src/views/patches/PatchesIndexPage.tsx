import { ArrowUpRight, Layers3, NotebookText, Users, Wrench } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { getAllPatchVersions, getPatchSummary, PATCH_NOTES } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { getStaticTranslator } from "@/lib/staticIntl";

export const dynamic = "force-static";

function SummaryMetricCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="metric-card flex min-h-[92px] flex-col gap-2.5 px-3.5 py-3.5 sm:min-h-[104px] sm:px-4"
      data-accent={accent ? "true" : undefined}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent-foreground)]">
        {icon}
      </div>
      <div>
        <p className="font-mono text-[1.2rem] font-bold leading-none text-[var(--color-foreground)] sm:text-[1.45rem]">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

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
  const adjustedRosterCount = new Set(PATCH_NOTES.map((note) => note.characterCode)).size;
  const totalChanges = summaries.reduce((sum, summary) => sum + summary.totalChanges, 0);

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker">{t("heroEyebrow")}</span>
              {latestSummary ? (
                <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  {t("latestBadge")} · {t("patchPrefix")} {latestSummary.patch}
                </span>
              ) : null}
            </div>

            <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {t("indexTitle")}
            </h1>
            <p className="mt-2 max-w-[38rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
              {t("indexSubtitle")}
            </p>

            {latestSummary ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                  {t("characterCount", { count: latestSummary.characterCount })}
                </span>
                <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                  {t("totalChanges", { count: latestSummary.totalChanges })}
                </span>
                {latestSummary.buffs > 0 ? (
                  <ChangeTypeBadgeStatic
                    type="buff"
                    count={latestSummary.buffs}
                    label={t("counts.buff")}
                  />
                ) : null}
                {latestSummary.nerfs > 0 ? (
                  <ChangeTypeBadgeStatic
                    type="nerf"
                    count={latestSummary.nerfs}
                    label={t("counts.nerf")}
                  />
                ) : null}
                {latestSummary.reworks > 0 ? (
                  <ChangeTypeBadgeStatic
                    type="rework"
                    count={latestSummary.reworks}
                    label={t("counts.rework")}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryMetricCard
              icon={<Layers3 className="h-5 w-5" strokeWidth={2} />}
              label={t("trackedPatches")}
              value={`${summaries.length}`}
              accent
            />
            <SummaryMetricCard
              icon={<Users className="h-5 w-5" strokeWidth={2} />}
              label={t("adjustedRoster")}
              value={`${adjustedRosterCount}`}
            />
            <SummaryMetricCard
              icon={<Wrench className="h-5 w-5" strokeWidth={2} />}
              label={t("recordedChanges")}
              value={`${totalChanges}`}
            />
            <SummaryMetricCard
              icon={<NotebookText className="h-5 w-5" strokeWidth={2} />}
              label={t("latestPatchLabel")}
              value={latestSummary ? `${t("patchPrefix")} ${latestSummary.patch}` : "-"}
              accent
            />
          </div>
        </div>
      </section>

      <section className="dashboard-panel p-4">
        <div className="flex flex-col gap-4">
          <div className="home-section-header flex flex-col gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="dashboard-section-title text-[1.3rem] font-bold text-[var(--color-foreground)] sm:text-[1.6rem]">
                {t("archiveTitle")}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("archiveCaption")}
              </p>
            </div>
            {latestSummary ? (
              <Link
                href={`/patches/${latestSummary.patch}`}
                className="dashboard-tab gap-2"
                data-active="true"
              >
                <span>{t("viewDetail")}</span>
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary, index) => (
              <Link
                key={summary.patch}
                href={`/patches/${summary.patch}`}
                className="metric-card group flex h-full flex-col gap-3.5 px-4 py-4 hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
                data-accent={index === 0 ? "true" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 ? (
                        <span className="rounded border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-accent-foreground)]">
                          {t("latestBadge")}
                        </span>
                      ) : null}
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {t("characterCount", { count: summary.characterCount })}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[1.25rem] font-bold text-[var(--color-foreground)]">
                      {t("patchPrefix")} {summary.patch}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {t("totalChanges", { count: summary.totalChanges })}
                    </p>
                  </div>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]">
                    <ArrowUpRight className="h-4.5 w-4.5" strokeWidth={2} />
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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

                <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                  <span className="text-[var(--color-muted-foreground)]">{t("viewDetail")}</span>
                  <span className="font-medium text-[var(--color-foreground)]">
                    {t("patchPrefix")} {summary.patch}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
