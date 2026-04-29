import { Layers3, NotebookText, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { getAllPatchVersions, getNotesByPatch, getPatchSummary } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl, getCharacterName } from "@/lib/characterMap";
import { getStaticTranslator } from "@/lib/staticIntl";

export const revalidate = 3600;
export const dynamicParams = false;

function DetailMetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card flex min-h-[112px] flex-col gap-4 px-4 py-4 sm:min-h-[134px] sm:px-5 sm:py-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(96,165,250,0.16)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div>
        <p className="text-[1.4rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.75rem]">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return getAllPatchVersions().map((version) => ({ version }));
}

interface PageProps {
  params: Promise<{ version: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { version } = await params;
  if (!getAllPatchVersions().includes(version)) return {};

  const t = await getStaticTranslator("patches");
  const summary = getPatchSummary(version);
  const title = t("detailTitle", { patch: version });
  const description = t("detailDescription", {
    patch: version,
    count: summary.characterCount,
    buffs: summary.buffs,
    nerfs: summary.nerfs,
  });

  return {
    title,
    description,
    alternates: { canonical: `/patches/${version}` },
    openGraph: { title, description, type: "article" },
    robots: { index: true, follow: true },
  };
}

export default async function PatchDetailPage({ params }: PageProps) {
  const { version } = await params;
  const versions = getAllPatchVersions();
  if (!versions.includes(version)) notFound();

  const t = await getStaticTranslator("patches");
  const tPatch = await getStaticTranslator("characterPatch");
  const summary = getPatchSummary(version);
  const notes = getNotesByPatch(version);

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero reveal px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/patches"
                className="dashboard-kicker transition hover:border-[rgba(96,165,250,0.28)] hover:bg-[rgba(96,165,250,0.12)] hover:text-[var(--color-primary-hover)]"
              >
                {t("breadcrumb")}
              </Link>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                {t("patchPrefix")} {version}
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.05rem]">
              {t("detailHeading", { patch: version })}
            </h1>
            <p className="mt-3 max-w-[40rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:text-base sm:leading-7">
              {t("detailDescription", {
                patch: version,
                count: summary.characterCount,
                buffs: summary.buffs,
                nerfs: summary.nerfs,
              })}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              {summary.buffs > 0 ? (
                <ChangeTypeBadgeStatic type="buff" count={summary.buffs} label={t("counts.buff")} />
              ) : null}
              {summary.nerfs > 0 ? (
                <ChangeTypeBadgeStatic type="nerf" count={summary.nerfs} label={t("counts.nerf")} />
              ) : null}
              {summary.reworks > 0 ? (
                <ChangeTypeBadgeStatic
                  type="rework"
                  count={summary.reworks}
                  label={t("counts.rework")}
                />
              ) : null}
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                {t("characterCount", { count: summary.characterCount })}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                {t("totalChanges", { count: summary.totalChanges })}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {versions.map((candidate) => {
                const isActive = candidate === version;
                return (
                  <Link
                    key={candidate}
                    href={`/patches/${candidate}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-[rgba(96,165,250,0.28)] bg-[linear-gradient(180deg,rgba(28,48,88,0.86),rgba(16,28,54,0.92))] text-[var(--color-foreground)] shadow-[0_18px_32px_-24px_rgba(96,165,250,0.72)]"
                        : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    {t("patchPrefix")} {candidate}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailMetricCard
              icon={<Layers3 className="h-5 w-5" strokeWidth={2} />}
              label={t("characterCount", { count: summary.characterCount })}
              value={`${summary.characterCount}`}
            />
            <DetailMetricCard
              icon={<NotebookText className="h-5 w-5" strokeWidth={2} />}
              label={t("totalChanges", { count: summary.totalChanges })}
              value={`${summary.totalChanges}`}
            />
            <DetailMetricCard
              icon={<TrendingUp className="h-5 w-5" strokeWidth={2} />}
              label={t("counts.buff")}
              value={`${summary.buffs}`}
            />
            <DetailMetricCard
              icon={<TrendingDown className="h-5 w-5" strokeWidth={2} />}
              label={t("counts.nerf")}
              value={`${summary.nerfs}`}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-panel reveal reveal-d1 p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[1.4rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.75rem]">
              {t("detailHeading", { patch: version })}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {t("characterCount", { count: summary.characterCount })} ·{" "}
              {t("totalChanges", { count: summary.totalChanges })}
            </p>
          </div>
          <Link
            href="/patches"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
          >
            {t("breadcrumb")}
          </Link>
        </div>

        <div className="space-y-3">
          {notes.map((note) => {
            const name = getCharacterName(note.characterCode);
            const portrait = getCharacterMiniWebpUrl(note.characterCode);

            return (
              <article
                key={note.characterCode}
                className="metric-card overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <Image src={portrait} alt={name} fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/character/${note.characterCode}`}
                      className="block truncate text-[1rem] font-bold tracking-[-0.03em] text-[var(--color-foreground)] transition hover:text-[var(--color-primary)] sm:text-[1.05rem]"
                    >
                      {name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      #{note.characterCode}
                    </p>
                  </div>

                  <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                    {t("totalChanges", { count: note.changes.length })}
                  </span>
                </div>

                <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-[18px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)]">
                  {note.changes.map((change, changeIndex) => {
                    const detailText = change.description.join(" ");

                    return (
                      <li
                        key={`${note.characterCode}-${changeIndex}`}
                        className="px-3.5 py-3 sm:px-4"
                      >
                        <div className="flex flex-wrap items-start gap-2.5">
                          <div className="shrink-0 pt-0.5">
                            <ChangeTypeBadgeStatic
                              type={change.changeType}
                              label={tPatch(`types.${change.changeType}`)}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
                              <span className="font-semibold">{change.target}</span>
                              {change.valueSummary ? (
                                <span className="font-mono text-[var(--color-primary)]">
                                  {" "}
                                  · {change.valueSummary}
                                </span>
                              ) : null}
                              {detailText ? (
                                <span className="text-[var(--color-muted-foreground)]">
                                  {" "}
                                  · {detailText}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
