import { Layers3, NotebookText, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { getAllPatchVersions, getNotesByPatch, getPatchSummary } from "@/data/patch-notes";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import { loadL10nMap } from "@/lib/serverL10n";
import { getStaticTranslator } from "@/lib/staticIntl";

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
    <div className="metric-card flex min-h-[110px] flex-col gap-3 px-4 py-4 sm:min-h-[126px] sm:px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]">
        {icon}
      </div>
      <div>
        <p className="text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
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
  locale?: RouteLocale;
}

export async function generateMetadata({ params, locale = "ko" }: PageProps): Promise<Metadata> {
  const { version } = await params;
  if (!getAllPatchVersions().includes(version)) return {};

  const t = await getStaticTranslator("patches", LANGUAGE_BY_ROUTE_LOCALE[locale]);
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

export default async function PatchDetailPage({ params, locale = "ko" }: PageProps) {
  const { version } = await params;
  const versions = getAllPatchVersions();
  if (!versions.includes(version)) notFound();

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const t = await getStaticTranslator("patches", language);
  const tPatch = await getStaticTranslator("characterPatch", language);
  const summary = getPatchSummary(version);
  const notes = getNotesByPatch(version);
  const l10n = loadL10nMap(language);
  const fallbackMap = buildFallbackMap();

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel reveal px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/patches"
                className="dashboard-kicker transition hover:text-[var(--color-foreground)]"
              >
                {t("breadcrumb")}
              </Link>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {t("patchPrefix")} {version}
              </span>
            </div>

            <h1 className="mt-2 text-[1.75rem] font-bold leading-tight text-[var(--color-foreground)] sm:text-[2.1rem]">
              {t("detailHeading", { patch: version })}
            </h1>
            <p className="mt-2 max-w-[40rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
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
              <span className="rounded border border-[var(--color-border)] bg-white px-2.5 py-1 text-[var(--color-muted-foreground)]">
                {t("characterCount", { count: summary.characterCount })}
              </span>
              <span className="rounded border border-[var(--color-border)] bg-white px-2.5 py-1 text-[var(--color-muted-foreground)]">
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
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-[var(--color-border-light)] bg-white text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
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
            <h2 className="text-[1.3rem] font-bold text-[var(--color-foreground)] sm:text-[1.6rem]">
              {t("detailHeading", { patch: version })}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {t("characterCount", { count: summary.characterCount })} ·{" "}
              {t("totalChanges", { count: summary.totalChanges })}
            </p>
          </div>
          <Link
            href="/patches"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
          >
            {t("breadcrumb")}
          </Link>
        </div>

        <div className="space-y-3">
          {notes.map((note) => {
            const name = resolveCharacterName(note.characterCode, l10n, fallbackMap);
            const portrait = getCharacterMiniWebpUrl(note.characterCode);
            const changeTypes = Array.from(
              new Set(note.changes.map((change) => change.changeType))
            );

            return (
              <article
                key={note.characterCode}
                className="metric-card overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <Image src={portrait} alt={name} fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/character/${note.characterCode}`}
                      className="block truncate text-[1rem] font-bold text-[var(--color-foreground)] transition-colors hover:text-[var(--color-foreground)] sm:text-[1.05rem]"
                    >
                      {name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      #{note.characterCode}
                    </p>
                  </div>

                  <span className="rounded border border-[var(--color-border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                    {t("totalChanges", { count: note.changes.length })}
                  </span>
                </div>

                {locale === "ko" ? (
                  <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)] bg-white">
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
                                  <span className="font-mono text-[var(--color-foreground)]">
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
                ) : (
                  <div className="mt-4 rounded-md border border-[var(--color-border)] bg-white px-3.5 py-3 sm:px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {changeTypes.map((type) => (
                        <ChangeTypeBadgeStatic
                          key={type}
                          type={type}
                          label={tPatch(`types.${type}`)}
                        />
                      ))}
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {t("totalChanges", { count: note.changes.length })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
                      {t("detailSourceNotice")}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
