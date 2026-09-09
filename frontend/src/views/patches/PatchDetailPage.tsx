/* Hallmark · genre: modern-minimal · macrostructure: Editorial change log + anchored roster · design-system: design.md · designed-as-app
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteContentAd } from "@/components/ads/SiteContentAd";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import {
  PatchNotesBrowser,
  PatchVersionSelect,
} from "@/components/features/patches/PatchNotesBrowser";
import { TierBadge } from "@/components/features/TierBadge";
import { hasPatchChangeLocalization, localizePatchNotes } from "@/data/patch-note-localization";
import { getAllPatchVersions, getNotesByPatch, getPatchSummary } from "@/data/patch-notes";
import { getCharacterTierForecasts } from "@/data/patch-tier-forecasts";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import type { Tier } from "@/lib/design-tokens";
import { loadL10nMap } from "@/lib/serverL10n";
import { getStaticTranslator } from "@/lib/staticIntl";
import { resolveWeaponName } from "@/lib/weaponMap";

export const dynamicParams = false;

interface ValuePart {
  text: string;
  changed: boolean;
}

function splitChangedValueParts(before: string, after: string): ValuePart[] {
  const beforeNumbers = Array.from(before.matchAll(/-?\d+(?:\.\d+)?%?/g), (match) => match[0]);
  const afterNumbers = Array.from(after.matchAll(/-?\d+(?:\.\d+)?%?/g));

  if (beforeNumbers.length !== afterNumbers.length) {
    return [{ text: after, changed: true }];
  }

  const parts: ValuePart[] = [];
  let cursor = 0;
  let hasChangedNumber = false;

  afterNumbers.forEach((match, index) => {
    const start = match.index ?? cursor;
    if (start > cursor) {
      parts.push({ text: after.slice(cursor, start), changed: false });
    }

    const changed = match[0] !== beforeNumbers[index];
    hasChangedNumber ||= changed;
    parts.push({ text: match[0], changed });
    cursor = start + match[0].length;
  });

  if (cursor < after.length) {
    parts.push({ text: after.slice(cursor), changed: false });
  }

  if (!hasChangedNumber && before !== after) {
    return [{ text: after, changed: true }];
  }

  return parts;
}

function PatchValueSummary({
  value,
  changeType,
}: {
  value: string;
  changeType: "buff" | "nerf" | "rework";
}) {
  const arrowIndex = value.indexOf("→");
  if (arrowIndex < 0) return <>{value}</>;

  const before = value.slice(0, arrowIndex).trim();
  const after = value.slice(arrowIndex + 1).trim();
  const changedParts = splitChangedValueParts(before, after);
  const highlightClass =
    changeType === "buff"
      ? "bg-[color-mix(in_srgb,var(--color-stat-up)_12%,transparent)] text-[var(--color-stat-up)]"
      : changeType === "nerf"
        ? "bg-[color-mix(in_srgb,var(--color-stat-down)_12%,transparent)] text-[var(--color-stat-down)]"
        : "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]";

  return (
    <>
      <span className="text-[var(--color-muted-foreground)]">{before}</span>
      <span className="mx-1.5 text-[var(--color-muted-foreground)]">→</span>
      {changedParts.map((part, index) =>
        part.changed ? (
          <span
            key={`${part.text}-${index}`}
            data-patch-value-change
            className={`rounded-sm px-0.5 font-bold ${highlightClass}`}
          >
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        )
      )}
    </>
  );
}

function TierForecastResult({
  tierLow,
  tierMid,
  tierHigh,
  label,
}: {
  tierLow: Tier;
  tierMid: Tier;
  tierHigh: Tier;
  label: string;
}) {
  const hasRange = tierLow !== tierHigh;

  if (!hasRange) {
    return <TierBadge tier={tierMid} className="h-8 min-w-8 text-sm ring-2" />;
  }

  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <TierBadge tier={tierHigh} className="h-8 min-w-8 text-sm ring-2" />
      <span
        className="font-mono text-base font-bold text-[var(--color-muted-foreground)]"
        aria-hidden="true"
      >
        ~
      </span>
      <TierBadge tier={tierLow} className="h-8 min-w-8 text-sm ring-2" />
    </span>
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
  const notes = localizePatchNotes(getNotesByPatch(version), locale);
  const showDetailedPatchNotes = locale === "ko" || hasPatchChangeLocalization(version, locale);
  const showTierForecastReasons = locale === "ko";
  const l10n = loadL10nMap(language);
  const fallbackMap = buildFallbackMap();
  const nameCollator = new Intl.Collator(locale, { usage: "sort" });
  const currentVersionIndex = versions.indexOf(version);
  const newerVersion = currentVersionIndex > 0 ? versions[currentVersionIndex - 1] : null;
  const olderVersion = versions[currentVersionIndex + 1] ?? null;
  const displayNotes = notes
    .map((note) => {
      const changeTypes = Array.from(new Set(note.changes.map((change) => change.changeType)));
      const hasBuff = changeTypes.includes("buff");
      const hasNerf = changeTypes.includes("nerf");
      const groupType =
        changeTypes.includes("rework") || (hasBuff && hasNerf)
          ? "rework"
          : hasBuff
            ? "buff"
            : "nerf";

      return {
        ...note,
        name: resolveCharacterName(note.characterCode, l10n, fallbackMap),
        portrait: getCharacterMiniWebpUrl(note.characterCode),
        changeTypes,
        groupType,
        tierForecasts: getCharacterTierForecasts(version, note.characterCode),
      };
    })
    .sort((a, b) => nameCollator.compare(a.name, b.name) || a.characterCode - b.characterCode);

  const labels =
    locale === "ko"
      ? {
          all: "전체",
          buff: "상향",
          nerf: "하향",
          rework: "조정",
          search: "실험체 이름 검색",
          empty: "해당하는 변경 내역이 없습니다.",
          reset: "검색 초기화",
        }
      : locale === "ja"
        ? {
            all: "すべて",
            buff: "強化",
            nerf: "弱体化",
            rework: "調整",
            search: "キャラクターを検索",
            empty: "該当する変更はありません。",
            reset: "検索をリセット",
          }
        : {
            all: "All",
            buff: "Buffs",
            nerf: "Nerfs",
            rework: "Adjustments",
            search: "Search characters",
            empty: "No matching changes.",
            reset: "Clear search",
          };
  return (
    <div className="page-shell flex min-w-0 flex-col gap-6">
      <header className="min-w-0">
        <Link
          href="/patches"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft size={14} />
          {t("breadcrumb")}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            {t("detailHeading", { patch: version })}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("characterCount", { count: summary.characterCount })} ·{" "}
            {t("totalChanges", { count: summary.totalChanges })}
          </p>
        </div>
      </header>
      <PatchVersionSelect
        versions={versions}
        current={version}
        label={locale === "ko" ? "패치 선택" : t("breadcrumb")}
      />
      <PatchNotesBrowser
        key={version}
        labels={labels}
        midContent={<SiteContentAd />}
        entries={displayNotes.map((note) => ({
          code: note.characterCode,
          name: note.name,
          types: note.changeTypes,
          content: (
            <article
              id={`character-${note.characterCode}`}
              key={note.characterCode}
              className="min-w-0 scroll-mt-24 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
            >
              <header className="flex min-w-0 items-center gap-3 border-b border-[var(--color-border)] pb-4">
                <Link
                  href={`/character/${note.characterCode}`}
                  className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] lg:h-14 lg:w-14"
                >
                  <Image
                    src={note.portrait}
                    alt={note.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/character/${note.characterCode}`}
                    className="block truncate text-base font-bold text-[var(--color-foreground)] outline-none hover:text-[var(--color-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] lg:text-lg"
                  >
                    {note.name}
                  </Link>
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
                <ul className="min-w-0 divide-y divide-[var(--color-border)]">
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
                              <PatchValueSummary
                                value={change.valueSummary}
                                changeType={change.changeType}
                              />
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

              {note.tierForecasts.length > 0 ? (
                <section className="mt-4 min-w-0 rounded-md bg-[var(--color-surface-2)] p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t("tierForecastTitle")}
                  </h3>
                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4rem_7rem] gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span>{locale === "ko" ? "무기" : locale === "ja" ? "武器" : "Weapon"}</span>
                    <span>
                      {locale === "ko" ? "패치 전" : locale === "ja" ? "変更前" : "Before"}
                    </span>
                    <span>
                      {locale === "ko" ? "예상 티어" : locale === "ja" ? "予想" : "Expected"}
                    </span>
                  </div>
                  <div className="mt-2 divide-y divide-[var(--color-border)]">
                    {note.tierForecasts.map((forecast) => {
                      const hasRange = forecast.tierLow !== forecast.tierHigh;
                      const range = `${forecast.tierHigh}~${forecast.tierLow}`;

                      return (
                        <div key={forecast.weaponCode} className="min-w-0 py-3.5 sm:py-4">
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem_7rem] items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--color-foreground)] [overflow-wrap:anywhere]">
                              {resolveWeaponName(forecast.weaponCode, l10n)}
                            </span>
                            <span>
                              <TierBadge
                                tier={forecast.currentTier}
                                className="h-8 min-w-8 text-sm"
                              />
                            </span>
                            <TierForecastResult
                              tierLow={forecast.tierLow}
                              tierMid={forecast.tierMid}
                              tierHigh={forecast.tierHigh}
                              label={hasRange ? t("tierForecastRange", { range }) : range}
                            />
                          </div>
                          {showTierForecastReasons && forecast.reason ? (
                            <p className="mt-3 max-w-[72ch] text-sm leading-6 text-[var(--color-muted-foreground)]">
                              {forecast.reason}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </article>
          ),
        }))}
      />
      <nav
        aria-label={t("breadcrumb")}
        className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted-foreground)]"
      >
        <Link
          className="inline-flex min-h-11 items-center gap-2"
          href={newerVersion ? `/patches/${newerVersion}` : "/patches"}
        >
          <ArrowLeft size={16} />
          {newerVersion ?? t("breadcrumb")}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2"
          href={olderVersion ? `/patches/${olderVersion}` : "/patches"}
        >
          {olderVersion ?? t("breadcrumb")}
          <ArrowRight size={16} />
        </Link>
      </nav>
    </div>
  );
}
