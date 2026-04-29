import { ArrowUpRight, Layers3, NotebookText, Users, Wrench } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { getAllPatchVersions, getPatchSummary, PATCH_NOTES } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { getStaticTranslator } from "@/lib/staticIntl";

export const dynamic = "force-static";

function SummaryMetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card flex min-h-[118px] flex-col gap-4 px-4 py-4 sm:min-h-[138px] sm:gap-5 sm:px-5 sm:py-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(96,165,250,0.16)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div>
        <p className="text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.8rem]">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getStaticTranslator("patches");
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

export default async function PatchesIndexPage() {
  const t = await getStaticTranslator("patches");
  const versions = getAllPatchVersions();
  const summaries = versions.map((version) => getPatchSummary(version));
  const latestSummary = summaries[0];
  const adjustedRosterCount = new Set(PATCH_NOTES.map((note) => note.characterCode)).size;
  const totalChanges = summaries.reduce((sum, summary) => sum + summary.totalChanges, 0);

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero reveal px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker">{t("heroEyebrow")}</span>
              {latestSummary ? (
                <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                  {t("latestBadge")} · {t("patchPrefix")} {latestSummary.patch}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.1rem]">
              {t("indexTitle")}
            </h1>
            <p className="mt-3 max-w-[38rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:text-base sm:leading-7">
              {t("indexSubtitle")}
            </p>

            {latestSummary ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                  {t("characterCount", { count: latestSummary.characterCount })}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
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
            />
          </div>
        </div>
      </section>

      <section className="dashboard-panel reveal reveal-d1 p-4 lg:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.8rem]">
                {t("archiveTitle")}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("archiveCaption")}
              </p>
            </div>
            {latestSummary ? (
              <Link
                href={`/patches/${latestSummary.patch}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
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
                className={`metric-card group flex h-full flex-col gap-4 px-4 py-4 transition-all sm:px-5 sm:py-5 ${
                  index === 0
                    ? "border-[rgba(96,165,250,0.24)] bg-[linear-gradient(180deg,rgba(96,165,250,0.14),rgba(255,255,255,0.02)),rgba(15,23,42,0.54)] shadow-[0_28px_60px_-40px_rgba(96,165,250,0.45)]"
                    : "hover:border-[var(--color-border-light)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),rgba(15,23,42,0.46)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 ? (
                        <span className="rounded-full border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                          {t("latestBadge")}
                        </span>
                      ) : null}
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {t("characterCount", { count: summary.characterCount })}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-foreground)]">
                      {t("patchPrefix")} {summary.patch}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {t("totalChanges", { count: summary.totalChanges })}
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-primary)]">
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
                  <span className="font-medium text-[var(--color-primary)]">
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
