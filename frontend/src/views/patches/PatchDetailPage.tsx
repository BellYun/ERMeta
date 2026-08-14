/* Hallmark · genre: modern-minimal · macrostructure: Editorial change log + anchored roster · design-system: design.md · designed-as-app
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
import { ArrowLeft, ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { hasPatchChangeLocalization, localizePatchNotes } from "@/data/patch-note-localization";
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
  const notes = localizePatchNotes(getNotesByPatch(version), locale);
  const showDetailedPatchNotes = locale === "ko" || hasPatchChangeLocalization(version, locale);
  const l10n = loadL10nMap(language);
  const fallbackMap = buildFallbackMap();
  const currentVersionIndex = versions.indexOf(version);
  const newerVersion = currentVersionIndex > 0 ? versions[currentVersionIndex - 1] : null;
  const olderVersion = versions[currentVersionIndex + 1] ?? null;
  const displayNotes = notes.map((note) => {
    const changeTypes = Array.from(new Set(note.changes.map((change) => change.changeType)));
    const hasBuff = changeTypes.includes("buff");
    const hasNerf = changeTypes.includes("nerf");
    const groupType =
      changeTypes.includes("rework") || (hasBuff && hasNerf) ? "rework" : hasBuff ? "buff" : "nerf";

    return {
      ...note,
      name: resolveCharacterName(note.characterCode, l10n, fallbackMap),
      portrait: getCharacterMiniWebpUrl(note.characterCode),
      changeTypes,
      groupType,
    };
  });
  const changeGroups = (["buff", "nerf", "rework"] as const).map((type) => ({
    type,
    notes: displayNotes.filter((note) => note.groupType === type),
    count: displayNotes
      .filter((note) => note.groupType === type)
      .reduce((total, note) => total + note.changes.length, 0),
  }));

  return (
    <main className="page-shell flex flex-col gap-4 lg:gap-5">
      <section className="dashboard-panel overflow-hidden">
        <header className="px-4 py-5 sm:px-5 lg:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/patches"
              className="dashboard-kicker rounded-sm outline-none hover:text-[var(--color-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              {t("breadcrumb")}
            </Link>
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
              {t("patchPrefix")} {version}
            </span>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h1 className="min-w-0 [overflow-wrap:anywhere] text-[2rem] font-bold leading-none tracking-[-0.045em] text-[var(--color-foreground)] sm:text-[2.7rem]">
                {t("detailHeading", { patch: version })}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
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
            </div>
          </div>

          <nav
            aria-label={t("characterCount", { count: summary.characterCount })}
            className="mt-5 border-t border-[var(--color-border)] pt-4"
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-[var(--color-border)]">
              {changeGroups.map((group) => (
                <section key={group.type} className="min-w-0 lg:px-4 lg:first:pl-0 lg:last:pr-0">
                  <header className="flex items-center justify-between gap-2">
                    <ChangeTypeBadgeStatic
                      type={group.type}
                      count={group.count}
                      label={tPatch(`types.${group.type}`)}
                    />
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      {t("characterCount", { count: group.notes.length })}
                    </span>
                  </header>

                  <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                    {group.notes.map((note) => (
                      <a
                        key={`${group.type}-${note.characterCode}`}
                        href={`#character-${note.characterCode}`}
                        className="group flex w-14 min-w-0 flex-col items-center gap-1 rounded-md border border-transparent p-1 text-center outline-none transition-[background-color,border-color] duration-150 hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] active:bg-[var(--color-accent-muted)]"
                      >
                        <span className="relative h-11 w-11 shrink-0">
                          <span className="absolute inset-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                            <Image
                              src={note.portrait}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover transition-[filter] duration-150 group-hover:brightness-110"
                            />
                          </span>
                          <span
                            className={`weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-5 w-5 place-items-center rounded-full border shadow-sm ${
                              group.type === "buff"
                                ? "text-[var(--color-success)]"
                                : group.type === "nerf"
                                  ? "text-[var(--color-danger)]"
                                  : "text-[var(--color-foreground)]"
                            }`}
                            aria-hidden="true"
                          >
                            {group.type === "buff" ? (
                              <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                            ) : group.type === "nerf" ? (
                              <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                            ) : (
                              <RefreshCw className="h-3 w-3" strokeWidth={2.5} />
                            )}
                          </span>
                        </span>
                        <span className="w-full truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                          {note.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </nav>
        </header>

        <div className="grid grid-cols-2 border-t border-[var(--color-border)] sm:grid-cols-4">
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[11px] text-[var(--color-muted-foreground)] sm:text-xs">
              {t("characterCount", { count: summary.characterCount })}
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-[var(--color-foreground)]">
              {summary.characterCount}
            </p>
          </div>
          <div className="border-l border-[var(--color-border)] px-4 py-3 sm:px-5">
            <p className="text-[11px] text-[var(--color-muted-foreground)] sm:text-xs">
              {t("totalChanges", { count: summary.totalChanges })}
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-[var(--color-foreground)]">
              {summary.totalChanges}
            </p>
          </div>
          <Link
            href={newerVersion ? `/patches/${newerVersion}` : "/patches"}
            className="group flex min-h-16 items-center gap-2 border-t border-[var(--color-border)] px-4 py-3 outline-none hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-inset sm:border-l sm:border-t-0 sm:px-5"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span className="min-w-0 truncate font-mono text-xs font-semibold text-[var(--color-foreground)]">
              {newerVersion ? `${t("patchPrefix")} ${newerVersion}` : t("breadcrumb")}
            </span>
          </Link>
          <Link
            href={olderVersion ? `/patches/${olderVersion}` : "/patches"}
            className="group flex min-h-16 items-center justify-end gap-2 border-l border-t border-[var(--color-border)] px-4 py-3 text-right outline-none hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-inset sm:border-t-0 sm:px-5"
          >
            <span className="min-w-0 truncate font-mono text-xs font-semibold text-[var(--color-foreground)]">
              {olderVersion ? `${t("patchPrefix")} ${olderVersion}` : t("breadcrumb")}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="dashboard-panel min-w-0 p-3 xl:sticky xl:top-20">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <nav aria-label={t("archiveTitle")} className="min-w-0">
              <p className="px-1 text-xs font-semibold text-[var(--color-foreground)]">
                {t("archiveTitle")}
              </p>
              <div className="mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1 xl:grid xl:grid-cols-3 xl:overflow-visible">
                {versions.map((candidate) => {
                  const isActive = candidate === version;
                  return (
                    <Link
                      key={candidate}
                      href={`/patches/${candidate}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-10 shrink-0 items-center justify-center rounded border px-2.5 font-mono text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] xl:min-w-0 ${
                        isActive
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      {t("patchPrefix")} {candidate}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <nav
              aria-label={t("characterCount", { count: summary.characterCount })}
              className="min-w-0 border-t border-[var(--color-border)] pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-3"
            >
              <p className="px-1 text-xs font-semibold text-[var(--color-foreground)]">
                {t("characterCount", { count: summary.characterCount })}
              </p>
              <div className="mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1 xl:max-h-[52vh] xl:flex-col xl:overflow-y-auto xl:pr-1">
                {displayNotes.map((note) => (
                  <a
                    key={note.characterCode}
                    href={`#character-${note.characterCode}`}
                    className="group flex min-h-10 shrink-0 items-center gap-2 rounded border border-transparent px-2 text-xs text-[var(--color-muted-foreground)] outline-none hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] xl:w-full"
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-[var(--color-surface-2)]">
                      <Image
                        src={note.portrait}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </span>
                    <span className="max-w-24 truncate xl:max-w-none">{note.name}</span>
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </aside>

        <section className="dashboard-panel min-w-0 overflow-hidden">
          <header className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
            <h2 className="min-w-0 [overflow-wrap:anywhere] text-xl font-bold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-2xl">
              {t("detailHeading", { patch: version })}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {t("characterCount", { count: summary.characterCount })} ·{" "}
              {t("totalChanges", { count: summary.totalChanges })}
            </p>
          </header>

          <div className="divide-y divide-[var(--color-border)]">
            {displayNotes.map((note) => (
              <article
                id={`character-${note.characterCode}`}
                key={note.characterCode}
                className="min-w-0 scroll-mt-24 px-4 py-5 sm:px-5 lg:grid lg:grid-cols-[116px_minmax(0,1fr)] lg:gap-5"
              >
                <header className="flex min-w-0 items-center gap-3 lg:block">
                  <Link
                    href={`/character/${note.characterCode}`}
                    className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] lg:h-20 lg:w-20"
                  >
                    <Image
                      src={note.portrait}
                      alt={note.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 lg:mt-3">
                    <Link
                      href={`/character/${note.characterCode}`}
                      className="block truncate text-base font-bold text-[var(--color-foreground)] outline-none hover:text-[var(--color-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] lg:text-lg"
                    >
                      {note.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
                      #{note.characterCode}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1 lg:mt-2">
                      {note.changeTypes.map((type) => (
                        <ChangeTypeBadgeStatic
                          key={type}
                          type={type}
                          count={note.changes.filter((change) => change.changeType === type).length}
                          label={tPatch(`types.${type}`)}
                        />
                      ))}
                    </div>
                  </div>
                </header>

                {showDetailedPatchNotes ? (
                  <ul className="mt-4 min-w-0 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] lg:mt-0">
                    {note.changes.map((change, changeIndex) => {
                      const detailText = change.description.join(" ");
                      return (
                        <li
                          key={`${note.characterCode}-${changeIndex}`}
                          className="grid min-w-0 gap-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-3"
                        >
                          <div className="pt-0.5">
                            <ChangeTypeBadgeStatic
                              type={change.changeType}
                              label={tPatch(`types.${change.changeType}`)}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="min-w-0 [overflow-wrap:anywhere] text-sm font-semibold leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
                              {change.target}
                            </h3>
                            {change.valueSummary ? (
                              <p className="mt-1 min-w-0 [overflow-wrap:anywhere] font-mono text-xs leading-5 text-[var(--color-foreground)] sm:text-[13px]">
                                {change.valueSummary}
                              </p>
                            ) : null}
                            {detailText ? (
                              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
                                {detailText}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-4 min-w-0 border-y border-[var(--color-border)] py-3 lg:mt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {note.changeTypes.map((type) => (
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
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
