import { ArrowUpRight, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  assignTier,
  computeMetaScores,
  getMetaRankingKey,
} from "@/components/features/tier-ranking/utils";
import { TierBadge } from "@/components/features/TierBadge";
import {
  getForecastItemChanges,
  getSharedTraitChanges,
  INDIRECT_PATCH_SOURCE,
} from "@/data/patch-indirect-changes";
import { localizePatchChanges, hasPatchChangeLocalization } from "@/data/patch-note-localization";
import { getCharacterPatchNote, type PatchChange } from "@/data/patch-notes";
import { getCharacterTierForecasts } from "@/data/patch-tier-forecasts";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import {
  buildHomeMetaView,
  DEFAULT_HOME_TIER,
  HOME_META_TARGET_PATCH,
  isHomeMetaTargetReady,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";
import { diffPatchValue } from "@/lib/patchValueDiff";
import { loadL10nSeed } from "@/lib/serverL10n";
import { resolveWeaponName } from "@/lib/weaponMap";

const fallback = buildFallbackMap();
const TIER_ORDER = { D: 0, C: 1, B: 2, A: 3, S: 4 } as const;

function PatchValue({ summary }: { summary: string }) {
  const diff = diffPatchValue(summary);
  if (!diff) return summary;
  const renderParts = (parts: typeof diff.before) =>
    parts.map((part, index) => (part.changed ? <mark key={index}>{part.text}</mark> : part.text));
  return (
    <>
      <span data-side="before">{renderParts(diff.before)}</span>→
      <span data-side="after">{renderParts(diff.after)}</span>
    </>
  );
}

export async function PatchHomePage({
  locale,
  currentPatch,
  homeMetaStats,
}: {
  locale: string;
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
}) {
  const t = await getTranslations({ locale, namespace: "patchHome" });
  const patchText = await getTranslations({ locale, namespace: "patches" });
  const nav = await getTranslations({ locale, namespace: "navigation" });
  const l10n = new Map(
    Object.entries(loadL10nSeed(LANGUAGE_BY_ROUTE_LOCALE[locale as RouteLocale]) ?? {})
  );
  const view = buildHomeMetaView(homeMetaStats, DEFAULT_HOME_TIER);
  const ready =
    currentPatch !== HOME_META_TARGET_PATCH ||
    isHomeMetaTargetReady(homeMetaStats.collectedGames ?? 0);
  const scores = computeMetaScores(view.rankingData.rankings);
  const comparisons = ready
    ? view.rankingData.rankings
        .flatMap((row) => {
          const forecast = getCharacterTierForecasts(currentPatch, row.characterNum).find(
            (item) => item.weaponCode === row.bestWeapon
          );
          return forecast
            ? [{ row, forecast, actual: assignTier(scores.get(getMetaRankingKey(row)) ?? 0) }]
            : [];
        })
        .sort((a, b) => b.row.totalGames - a.row.totalGames)
    : [];
  const rankingsHref = `/${locale}/rankings`;
  const renderChange = (change: PatchChange, index: number) => (
    <li key={index}>
      <span className="home-forecast-change-type" data-type={change.changeType}>
        {t(`changeTypes.${change.changeType}`)}
      </span>
      <span>
        <strong>{change.target}</strong>
        <span className="home-forecast-change-value" data-type={change.changeType}>
          {change.valueSummary ? (
            <PatchValue summary={change.valueSummary} />
          ) : (
            change.description.join(" ")
          )}
        </span>
      </span>
    </li>
  );
  const traitChanges = getSharedTraitChanges(currentPatch);
  function renderComparison({ row, forecast, actual }: (typeof comparisons)[number]) {
    const previous = view.rankingData.previousRankings?.find(
      (item) => item.characterNum === row.characterNum && item.bestWeapon === row.bestWeapon
    );
    const metricFields = ["averageRP", "winRate", "top3Rate", "pickRate"] as const;
    const metricLabels = {
      averageRP: "rp",
      winRate: "winRate",
      top3Rate: "forecastTop3",
      pickRate: "pickRate",
    } as const;
    const itemChanges = getForecastItemChanges(currentPatch, row.characterNum, row.bestWeapon);
    const note = getCharacterPatchNote(row.characterNum, currentPatch);
    const allChanges = note ? localizePatchChanges(note, locale as RouteLocale) : [];
    const changes = allChanges.filter(
      (change) =>
        change.weaponMasteryCode === undefined || change.weaponMasteryCode === row.bestWeapon
    );
    const status =
      TIER_ORDER[actual] > TIER_ORDER[forecast.tierHigh]
        ? "above"
        : TIER_ORDER[actual] < TIER_ORDER[forecast.tierLow]
          ? "below"
          : "within";
    const statusLabel =
      status === "within"
        ? "forecastWithin"
        : status === "above"
          ? "forecastAbove"
          : "forecastBelow";
    return (
      <article className="home-forecast-row" key={`${row.characterNum}:${row.bestWeapon}`}>
        <Link
          className="home-forecast-identity"
          href={`/${locale}/character/${row.characterNum}?weapon=${row.bestWeapon}`}
        >
          <Image src={getCharacterMiniWebpUrl(row.characterNum)} alt="" width={40} height={40} />
          <span>
            <strong>{resolveCharacterName(row.characterNum, l10n, fallback)}</strong>
            <small>{resolveWeaponName(row.bestWeapon, l10n)}</small>
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <dl className="home-forecast-tiers">
          <div>
            <dt>{t("forecastBefore")}</dt>
            <dd>
              <TierBadge tier={forecast.currentTier} />
            </dd>
          </div>
          <div>
            <dt>{t("forecastExpected")}</dt>
            <dd>
              <TierBadge tier={forecast.tierMid} />
              <small>
                {t("forecastRange", {
                  range:
                    forecast.tierHigh === forecast.tierLow
                      ? forecast.tierLow
                      : `${forecast.tierHigh}–${forecast.tierLow}`,
                })}
              </small>
            </dd>
          </div>
          <div>
            <dt>{t("forecastActual")}</dt>
            <dd>
              <TierBadge tier={actual} />
              <span className="home-forecast-status" data-status={status}>
                <span aria-hidden="true">
                  {status === "within" ? "✓" : status === "above" ? "↑" : "↓"}
                </span>{" "}
                {t(statusLabel)}
              </span>
            </dd>
          </div>
        </dl>
        <p className="home-forecast-sample">
          {t("sampleLabel")} <strong>{row.totalGames.toLocaleString(locale)}</strong>
        </p>
        <div className="home-forecast-performance">
          <dl>
            {metricFields.map((metric) => {
              const value = row[metric];
              const old = previous && previous.totalGames > 0 ? previous[metric] : null;
              const delta = old === null ? null : Number((value - old).toFixed(1));
              const unit = metric === "averageRP" ? "" : "%";
              return (
                <div key={metric}>
                  <dt>{t(metricLabels[metric])}</dt>
                  <dd>
                    <strong>{row.totalGames > 0 ? `${value.toFixed(1)}${unit}` : "—"}</strong>
                  </dd>
                  <dd
                    className="home-forecast-performance__delta"
                    data-direction={
                      delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down"
                    }
                  >
                    {delta === null || row.totalGames <= 0
                      ? t("forecastNoBaseline")
                      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${metric === "averageRP" ? " RP" : "%p"}`}
                  </dd>
                </div>
              );
            })}
          </dl>
          <details className="home-forecast-performance__details">
            <summary>{t("forecastDetails")}</summary>
            <p className="home-forecast-performance__basis">
              {t("forecastPerformanceBasis", {
                previous: homeMetaStats.previousPatch ?? "—",
                current: currentPatch,
              })}
            </p>
            <dl>
              {metricFields.map((metric) => (
                <div key={metric}>
                  <dt>{t(metricLabels[metric])}</dt>
                  <dd>
                    {previous && previous.totalGames > 0
                      ? `${previous[metric].toFixed(1)}${metric === "averageRP" ? "" : "%"}`
                      : "—"}{" "}
                    →{" "}
                    {row.totalGames > 0
                      ? `${row[metric].toFixed(1)}${metric === "averageRP" ? "" : "%"}`
                      : "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="home-forecast-performance__basis">
              {t("forecastPerformanceSamples", {
                previous: previous ? previous.totalGames.toLocaleString(locale) : "—",
                current: row.totalGames.toLocaleString(locale),
              })}
            </p>{" "}
          </details>
        </div>
        <div className="home-forecast-changes">
          <p className="home-forecast-changes-label">{t("changesLabel")}</p>
          {changes.length ? (
            <div>
              <ul>{changes.slice(0, 1).map(renderChange)}</ul>
              {changes.length > 1 && (
                <details>
                  <summary>{t("changesMore", { count: changes.length - 1 })}</summary>
                  <ul>{changes.slice(1).map(renderChange)}</ul>
                </details>
              )}
              {locale !== "ko" &&
                !hasPatchChangeLocalization(currentPatch, locale as RouteLocale) && (
                  <p className="home-forecast-changes-source">{patchText("detailSourceNotice")}</p>
                )}
            </div>
          ) : (
            <p className="home-forecast-changes-source">{t("changesEmpty")}</p>
          )}
        </div>
        {itemChanges.length > 0 && (
          <div className="home-forecast-changes">
            <p className="home-forecast-changes-label">{t("itemChangesLabel")}</p>
            <div>
              <p className="home-forecast-changes-source">{t("itemChangesBasis")}</p>
              <ul>{itemChanges.slice(0, 1).map(renderChange)}</ul>
              {itemChanges.length > 1 && (
                <details>
                  <summary>{t("changesMore", { count: itemChanges.length - 1 })}</summary>
                  <ul>{itemChanges.slice(1).map(renderChange)}</ul>
                </details>
              )}
              {locale !== "ko" && (
                <p className="home-forecast-changes-source">{patchText("detailSourceNotice")}</p>
              )}
            </div>
          </div>
        )}
      </article>
    );
  }
  return (
    <div className="page-shell home-shell patch-home patch-home--editorial">
      <section className="home-entry" aria-labelledby="home-entry-title">
        <header>
          <p className="patch-home__kicker">ER&amp;GG · {t("patch", { patch: currentPatch })}</p>
          <h1 id="home-entry-title">{t("welcomeTitle")}</h1>
        </header>
        <div className="home-entry__paths">
          <article className="home-entry__team">
            <p className="home-entry__eyebrow">{t("welcomeTeamLabel")}</p>
            <h2>{t("welcomeTeamTitle")}</h2>
            <p className="home-entry__description">{t("welcomeTeamBody")}</p>
            <div className="home-entry__demo" aria-label={t("welcomeExample")}>
              <p>{t("welcomeExample")}</p>
              <div className="home-entry__slots">
                {[6, 33].map((code) => (
                  <div key={code}>
                    <Image src={getCharacterMiniWebpUrl(code)} alt="" width={60} height={60} />
                    <span>{resolveCharacterName(code, l10n, fallback)}</span>
                  </div>
                ))}
                <ArrowRight aria-hidden="true" size={18} />
                <div className="home-entry__empty">
                  <span aria-hidden="true">?</span>
                  <small>{t("welcomeMyPick")}</small>
                </div>
              </div>
              <div className="home-entry__result">
                <strong>{t("welcomeResult")}</strong>
                <span>{t("welcomeResultBody")}</span>
              </div>
            </div>
            <Link className="home-entry__primary" href={`/${locale}/synergy-detail`}>
              {t("welcomeTeamCta")} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </article>
          <article className="home-entry__meta">
            <p className="home-entry__eyebrow">{t("welcomeMetaLabel")}</p>
            <h2>{t("welcomeMetaTitle")}</h2>
            <p className="home-entry__description">{t("welcomeMetaBody")}</p>
            {comparisons[0] ? (
              <div className="home-entry__meta-preview">
                <div className="home-entry__character">
                  <Image
                    src={getCharacterMiniWebpUrl(comparisons[0].row.characterNum)}
                    alt=""
                    width={44}
                    height={44}
                  />
                  <div>
                    <strong>
                      {resolveCharacterName(comparisons[0].row.characterNum, l10n, fallback)}
                    </strong>
                    <small>{resolveWeaponName(comparisons[0].row.bestWeapon, l10n)}</small>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t("forecastExpected")}</dt>
                    <dd>
                      <TierBadge tier={comparisons[0].forecast.tierMid} />
                    </dd>
                  </div>
                  <span aria-hidden="true">→</span>
                  <div>
                    <dt>{t("forecastActual")}</dt>
                    <dd>
                      <TierBadge tier={comparisons[0].actual} />
                    </dd>
                  </div>
                </dl>
                <p>{t("welcomeLive", { patch: currentPatch })}</p>
              </div>
            ) : (
              <p className="home-entry__meta-preview">{t("forecastEmpty")}</p>
            )}
            <Link
              className="home-entry__secondary"
              href={
                comparisons[0]
                  ? `/${locale}/character/${comparisons[0].row.characterNum}?weapon=${comparisons[0].row.bestWeapon}`
                  : rankingsHref
              }
            >
              {t("welcomeMetaCta")} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>
      <section className="home-current-meta" aria-labelledby="home-current-meta-title">
        <div className="patch-home__section-heading">
          <div>
            <h2 id="home-current-meta-title">{t("forecastTitle")}</h2>
            <p>{t("forecastBasis", { patch: currentPatch })}</p>
          </div>
          <Link href={`/${locale}/patches/${currentPatch}`}>
            {t("forecastSource")} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="home-forecast-note">{t("forecastNote")}</p>
        {comparisons.length ? (
          <>
            <div className="home-forecast-list">
              {comparisons.slice(0, 6).map(renderComparison)}
            </div>
            {comparisons.length > 6 && (
              <details className="home-forecast-more">
                <summary>{t("forecastMore", { count: comparisons.length - 6 })}</summary>
                <div className="home-forecast-list">
                  {comparisons.slice(6).map(renderComparison)}
                </div>
              </details>
            )}
          </>
        ) : (
          <p className="home-current-meta__empty">{t("forecastEmpty")}</p>
        )}
        {traitChanges.length > 0 && (
          <div className="home-forecast-changes home-forecast-traits">
            <p className="home-forecast-changes-label">{t("traitChangesLabel")}</p>
            <div>
              <p className="home-forecast-changes-source">{t("traitChangesBasis")}</p>
              <ul>{traitChanges.map(renderChange)}</ul>
              {locale !== "ko" && (
                <p className="home-forecast-changes-source">{patchText("detailSourceNotice")}</p>
              )}
              <a href={INDIRECT_PATCH_SOURCE} target="_blank" rel="noreferrer">
                {t("indirectSource")} <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </section>
      <nav className="patch-home__destinations" aria-label={t("explore")}>
        <Link href={rankingsHref}>
          <span>{t("compare")}</span>
          <h2>{nav("characterRankings")}</h2>
          <p>{t("rankingBody")}</p>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link href={`/${locale}/synergy-detail`}>
          <span>{t("combine")}</span>
          <h2>{nav("synergyRecommendation")}</h2>
          <p>{t("comboBody")}</p>
          <ArrowRight aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
