import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  assignTier,
  computeMetaScores,
  getMetaRankingKey,
} from "@/components/features/tier-ranking/utils";
import { TierBadge } from "@/components/features/TierBadge";
import { PATCH_12_4_SOURCE } from "@/data/12.4-balance-context";
import {
  getForecastItemChanges,
  getSharedTraitChanges,
  INDIRECT_PATCH_SOURCE,
} from "@/data/patch-indirect-changes";
import { localizePatchChanges, hasPatchChangeLocalization } from "@/data/patch-note-localization";
import { getCharacterPatchNote, type PatchChange } from "@/data/patch-notes";
import { getPatchTierForecasts, type PatchTierForecast } from "@/data/patch-tier-forecasts";
import { LANGUAGE_BY_ROUTE_LOCALE, type ActiveRouteLocale, type RouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import type { Tier } from "@/lib/design-tokens";
import {
  buildHomeMetaView,
  DEFAULT_HOME_TIER,
  HOME_META_TARGET_PATCH,
  isHomeMetaTargetReady,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";
import { diffPatchValue } from "@/lib/patchValueDiff";
import type { CharacterRankingData } from "@/lib/ranking";
import { localizeRoutePath } from "@/lib/seoLocales";
import { loadL10nSeed } from "@/lib/serverL10n";
import { resolveWeaponName } from "@/lib/weaponMap";

const fallback = buildFallbackMap();
const TIER_ORDER = { D: 0, C: 1, B: 2, A: 3, S: 4 } as const;

interface ForecastComparison {
  characterCode: number;
  forecast: PatchTierForecast;
  row: CharacterRankingData | null;
  actual: Tier | null;
}

export function isPatchForecastActualReady(
  currentPatch: string,
  homeMetaStats: HomeMetaStats
): boolean {
  // 12.4 changed Gambit RP multipliers; do not turn raw RP-based tiers into
  // observed patch results until Gambit participation can be separated.
  if (currentPatch === "12.4") return false;
  const hasCurrentData = homeMetaStats.rows.some(
    (row) => row.patchVersion === currentPatch && row.totalGames > 0
  );
  if (!hasCurrentData) return false;
  return (
    currentPatch !== HOME_META_TARGET_PATCH ||
    isHomeMetaTargetReady(homeMetaStats.collectedGames ?? 0)
  );
}

function forecastReasonSummary(reason: string) {
  const firstSentence = reason.match(/^.*?[.!?](?:\s|$)/u)?.[0]?.trim();
  return firstSentence || reason;
}

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

export async function PatchForecastComparison({
  locale,
  currentPatch,
  homeMetaStats,
  preview = false,
}: {
  locale: ActiveRouteLocale;
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
  preview?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "patchHome" });
  const patchText = await getTranslations({ locale, namespace: "patches" });
  const l10n = new Map(
    Object.entries(loadL10nSeed(LANGUAGE_BY_ROUTE_LOCALE[locale as RouteLocale]) ?? {})
  );
  const view = buildHomeMetaView(homeMetaStats, DEFAULT_HOME_TIER);
  const ready = isPatchForecastActualReady(currentPatch, homeMetaStats);
  const scores = computeMetaScores(view.rankingData.rankings);
  const actualRows = new Map(
    view.rankingData.rankings.map((row) => [`${row.characterNum}:${row.bestWeapon}`, row])
  );
  const comparisons: ForecastComparison[] = getPatchTierForecasts(currentPatch)
    .map(({ characterCode, ...forecast }) => {
      const row = actualRows.get(`${characterCode}:${forecast.weaponCode}`) ?? null;
      return {
        characterCode,
        forecast,
        row,
        actual: ready && row ? assignTier(scores.get(getMetaRankingKey(row)) ?? 0) : null,
      };
    })
    .sort((left, right) => {
      if (ready) {
        return (right.row?.totalGames ?? 0) - (left.row?.totalGames ?? 0);
      }
      const rightMovement = Math.abs(
        TIER_ORDER[right.forecast.tierMid] - TIER_ORDER[right.forecast.currentTier]
      );
      const leftMovement = Math.abs(
        TIER_ORDER[left.forecast.tierMid] - TIER_ORDER[left.forecast.currentTier]
      );
      return (
        rightMovement - leftMovement ||
        TIER_ORDER[right.forecast.tierMid] - TIER_ORDER[left.forecast.tierMid] ||
        left.characterCode - right.characterCode ||
        left.forecast.weaponCode - right.forecast.weaponCode
      );
    });
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
  function renderComparison({ characterCode, row, forecast, actual }: ForecastComparison) {
    const previous = view.rankingData.previousRankings?.find(
      (item) => item.characterNum === characterCode && item.bestWeapon === forecast.weaponCode
    );
    const metricFields = ["averageRP", "winRate", "top3Rate", "pickRate"] as const;
    const metricLabels = {
      averageRP: "rp",
      winRate: "winRate",
      top3Rate: "forecastTop3",
      pickRate: "pickRate",
    } as const;
    const itemChanges = getForecastItemChanges(currentPatch, characterCode, forecast.weaponCode);
    const note = getCharacterPatchNote(characterCode, currentPatch);
    const allChanges = note ? localizePatchChanges(note, locale as RouteLocale) : [];
    const changes = allChanges.filter(
      (change) =>
        change.weaponMasteryCode === undefined || change.weaponMasteryCode === forecast.weaponCode
    );
    const status = actual
      ? TIER_ORDER[actual] > TIER_ORDER[forecast.tierHigh]
        ? "above"
        : TIER_ORDER[actual] < TIER_ORDER[forecast.tierLow]
          ? "below"
          : "within"
      : null;
    const statusLabel =
      status === "within"
        ? "forecastWithin"
        : status === "above"
          ? "forecastAbove"
          : status === "below"
            ? "forecastBelow"
            : null;
    const movement =
      TIER_ORDER[forecast.tierMid] > TIER_ORDER[forecast.currentTier]
        ? "up"
        : TIER_ORDER[forecast.tierMid] < TIER_ORDER[forecast.currentTier]
          ? "down"
          : "flat";
    return (
      <article
        className="home-forecast-row"
        data-phase={actual ? "observed" : "forecast"}
        key={`${characterCode}:${forecast.weaponCode}`}
      >
        <Link
          className="home-forecast-identity"
          href={`${localizeRoutePath(`/character/${characterCode}`, locale)}?weapon=${forecast.weaponCode}`}
        >
          <Image src={getCharacterMiniWebpUrl(characterCode)} alt="" width={40} height={40} />
          <span>
            <strong>{resolveCharacterName(characterCode, l10n, fallback)}</strong>
            <small>{resolveWeaponName(forecast.weaponCode, l10n)}</small>
            <small className="home-forecast-movement" data-movement={movement}>
              {t(`forecastMovement.${movement}`)}
            </small>
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <dl className="home-forecast-tiers" data-phase={actual ? "observed" : "forecast"}>
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
          {actual && status && statusLabel ? (
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
          ) : null}
        </dl>
        {actual && row ? (
          <p className="home-forecast-sample">
            {t("sampleLabel")} <strong>{row.totalGames.toLocaleString(locale)}</strong>
          </p>
        ) : null}
        {!actual && forecast.reason ? (
          <div className="home-forecast-reason">
            <p>{t("forecastReason")}</p>
            <p>{forecastReasonSummary(forecast.reason)}</p>
          </div>
        ) : null}
        {actual && row ? (
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
        ) : null}
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
              <a
                href={currentPatch === "12.4" ? PATCH_12_4_SOURCE : INDIRECT_PATCH_SOURCE}
                target="_blank"
                rel="noreferrer"
              >
                {t("indirectSource")} <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </article>
    );
  }
  if (preview && currentPatch === "12.4" && comparisons.length === 0) {
    return (
      <section className="home-forecast-preview" aria-labelledby="home-forecast-preview-title">
        <div className="patch-home__section-heading">
          <div>
            <h2 id="home-forecast-preview-title">{t("patchImpactTitle")}</h2>
            <p>{t("patchImpactBody")}</p>
          </div>
        </div>
        <Link className="home-forecast-preview__cta" href={`/${locale}/patch-analysis/12.4`}>
          {t("patchImpactLink")} <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }
  if (preview) {
    const observedCandidates = comparisons.filter(
      (comparison) => comparison.actual && (comparison.row?.totalGames ?? 0) >= 100
    );
    const featured = ready
      ? (observedCandidates
          .filter(
            ({ forecast, actual }) =>
              actual &&
              (TIER_ORDER[actual] > TIER_ORDER[forecast.tierHigh] ||
                TIER_ORDER[actual] < TIER_ORDER[forecast.tierLow])
          )
          .sort(
            (left, right) =>
              Math.abs(
                TIER_ORDER[right.actual ?? right.forecast.tierMid] -
                  TIER_ORDER[right.forecast.tierMid]
              ) -
                Math.abs(
                  TIER_ORDER[left.actual ?? left.forecast.tierMid] -
                    TIER_ORDER[left.forecast.tierMid]
                ) || (right.row?.totalGames ?? 0) - (left.row?.totalGames ?? 0)
          )[0] ?? observedCandidates[0])
      : comparisons[0];
    return (
      <section className="home-forecast-preview" aria-labelledby="home-forecast-preview-title">
        <div className="patch-home__section-heading">
          <div>
            <h2 id="home-forecast-preview-title">
              {t(ready ? "forecastTitle" : "forecastPendingTitle")}
            </h2>
            <p>
              {t(ready ? "forecastBasis" : "forecastPendingBasis", {
                patch: currentPatch,
              })}
            </p>
          </div>
        </div>
        {featured ? (
          renderComparison(featured)
        ) : (
          <p>{t(ready ? "forecastEmpty" : "forecastPendingEmpty")}</p>
        )}
        <Link
          className="home-forecast-preview__cta"
          href={`${localizeRoutePath(`/patch-forecast/${currentPatch}`, locale)}#forecast-results`}
        >
          {t(ready ? "forecastDetailsLink" : "forecastPendingDetailsLink")}{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }
  return (
    <section
      id="forecast-results"
      className="home-current-meta"
      aria-labelledby="home-current-meta-title"
    >
      <div className="patch-home__section-heading">
        <div>
          <h2 id="home-current-meta-title">
            {t(ready ? "forecastTitle" : "forecastPendingTitle")}
          </h2>
          <p>
            {t(ready ? "forecastBasis" : "forecastPendingBasis", {
              patch: currentPatch,
            })}
          </p>
        </div>
        <Link href={localizeRoutePath(`/patches/${currentPatch}`, locale)}>
          {t("forecastSource")} <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <p className="home-forecast-note">
        {t(
          currentPatch === "12.4"
            ? "forecastGambitPendingNote"
            : ready
              ? "forecastNote"
              : "forecastPendingNote"
        )}
      </p>
      {currentPatch === "12.4" && (
        <p className="home-forecast-note">{t("forecastNewItemsUncertain")}</p>
      )}
      {comparisons.length ? (
        <div className="home-forecast-list">{comparisons.map(renderComparison)}</div>
      ) : (
        <p className="home-current-meta__empty">
          {t(ready ? "forecastEmpty" : "forecastPendingEmpty")}
        </p>
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
  );
}
