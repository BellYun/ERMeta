"use client";

import { Loader2, Share2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { analytics } from "@/lib/analytics";
import { resolveCharacterName } from "@/lib/characterMap";
import {
  loadPickPartners,
  sortPickPartners,
  type PickPartner,
  type PartnerSort,
} from "@/lib/pickPartnerStats";
import { buildSynergyShareUrl } from "@/lib/synergyShare";
import { MINIMUM_GAMES_OPTIONS, parseMinimumGamesParam } from "@/lib/synergyUrlState";
import { getFallbackMap } from "./constants";
import { SinglePartnerCard } from "./SinglePartnerCard";

const SORTS = ["tierScore", "averageRP", "winRate", "averageRank", "totalGames"] as const;

export function SinglePartnerResults({
  ally,
  focus,
  onReset,
  analyticsEnabled = true,
}: {
  ally: { charCode: number; weaponCode: number | null };
  focus: { charCode: number; weaponCode: number }[];
  onReset: () => void;
  analyticsEnabled?: boolean;
}) {
  const t = useTranslations("singlePartnerResults");
  const resultsT = useTranslations("synergyResults");
  const metricT = useTranslations("synergyComboCard");
  const { l10n } = useL10n();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const charCode = ally.charCode;
  const weaponCode = ally.weaponCode;
  const requestKey = `${charCode}:${weaponCode ?? 0}`;
  const rawSort = searchParams.get("sort");
  const sort: PartnerSort = SORTS.includes(rawSort as PartnerSort)
    ? (rawSort as PartnerSort)
    : "tierScore";
  const minimumGames = parseMinimumGamesParam(searchParams.get("minGames"));
  const [state, setState] = React.useState<{ key: string; data: PickPartner[]; error: boolean }>({
    key: "",
    data: [],
    error: false,
  });
  const [shareStatus, setShareStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const [retry, setRetry] = React.useState(0);
  const [page, setPage] = React.useState({ key: "", count: 30 });
  const isCurrent = state.key === requestKey;
  const loading = !isCurrent;
  React.useEffect(() => {
    let cancelled = false;
    loadPickPartners(charCode, weaponCode)
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, data, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key: requestKey, data: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [charCode, weaponCode, requestKey, retry]);
  const recommendations = React.useMemo(
    () => sortPickPartners(isCurrent ? state.data : [], sort, minimumGames, focus),
    [isCurrent, state.data, sort, minimumGames, focus]
  );
  const lastViewed = React.useRef("");
  const isWeaponScope = pathname.includes("synergy-detail");
  React.useEffect(() => {
    const key = `${requestKey}:${sort}:${minimumGames}`;
    if (
      !analyticsEnabled ||
      !isCurrent ||
      state.error ||
      recommendations.length === 0 ||
      key === lastViewed.current
    )
      return;
    lastViewed.current = key;
    analytics.synergyResultViewed({
      ally1Code: charCode,
      ally2Code: null,
      ally1WeaponCode: weaponCode,
      selectionCount: 1,
      resultCount: recommendations.length,
      sortBy: sort,
      tier: "DIAMOND+",
      patch: "S10-S12.4",
      isWeaponScope,
    });
  }, [
    analyticsEnabled,
    charCode,
    weaponCode,
    requestKey,
    sort,
    minimumGames,
    isCurrent,
    state.error,
    recommendations.length,
    isWeaponScope,
  ]);
  const share = async () => {
    try {
      const method = typeof navigator.share === "function" ? "native" : "clipboard";
      const url = buildSynergyShareUrl(window.location.href, [charCode], method);
      if (method === "native")
        await navigator.share({ title: t("title", { ally: charName(charCode) }), url });
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
      }
      if (analyticsEnabled)
        analytics.synergyShared({
          ally1Code: charCode,
          ally2Code: null,
          scope: isWeaponScope ? "synergy_detail" : "synergy",
          method,
        });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("error");
    }
  };
  const listKey = `${requestKey}:${sort}:${minimumGames}:${focus.map((f) => `${f.charCode}:${f.weaponCode}`).join("|")}`;
  const visibleCount = page.key === listKey ? page.count : 30;
  const charName = (code: number) => resolveCharacterName(code, l10n, getFallbackMap());
  const changeParam = (name: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value === "0") params.delete(name);
    else params.set(name, value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    if (analyticsEnabled && name === "sort") analytics.synergySortChanged(value as PartnerSort);
  };
  return (
    <div data-testid="single-partner-results" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-foreground)]">
            {t("title", { ally: charName(charCode) })}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
            {t("scope")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--color-border)] px-2 text-xs"
          >
            <Share2 className="h-3 w-3" />
            {resultsT(shareStatus === "copied" ? "copied" : "share")}
          </button>
          <button
            type="button"
            onClick={onReset}
            aria-label={resultsT("clearAllies")}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] px-2 text-xs"
          >
            <X className="h-3 w-3" />
            {resultsT("reset")}
          </button>
        </div>
      </div>
      {shareStatus === "error" && (
        <p role="status" className="text-xs">
          {resultsT("genericError")}
        </p>
      )}
      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{t("description")}</p>
      {focus.length > 0 && (
        <p className="text-xs font-semibold text-[var(--color-accent-foreground)]">
          {resultsT("focusFilter", { count: focus.length })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs">
          {resultsT("minimumGames")}
          <select
            aria-label={resultsT("minimumGames")}
            value={minimumGames}
            onChange={(event) => changeParam("minGames", event.target.value)}
            className="min-h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          >
            {MINIMUM_GAMES_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? resultsT("allSamples") : resultsT("gamesAtLeast", { count: value })}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          {t("sort")}
          <select
            aria-label={t("sort")}
            value={sort}
            onChange={(event) => changeParam("sort", event.target.value)}
            className="min-h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          >
            {SORTS.map((value) => (
              <option key={value} value={value}>
                {resultsT(`sort.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status" className="flex items-center gap-2 py-8 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {resultsT("loading")}
        </p>
      ) : state.error ? (
        <div role="alert" className="py-8 text-sm">
          <p>{resultsT("genericError")}</p>
          <button
            type="button"
            className="mt-3 min-h-9 rounded-md border border-[var(--color-border)] px-3"
            onClick={() => {
              setState({ key: "", data: [], error: false });
              setRetry((n) => n + 1);
            }}
          >
            {t("retry")}
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <p role="status" className="py-8 text-sm text-[var(--color-muted-foreground)]">
          {minimumGames > 0 && state.data.length > 0 ? t("noSamples") : t("noData")}
        </p>
      ) : (
        <>
          <div
            className="composition-comparison-scroll"
            data-sort-by={sort}
            role="region"
            aria-label={t("title", { ally: charName(charCode) })}
            tabIndex={0}
          >
            <div className="composition-comparison-heading">
              <span className="composition-comparison-heading__identity">{t("lineup")}</span>
              {(
                [
                  ["winRate", "winRate"],
                  ["averageRP", "rp"],
                  ["totalGames", "games"],
                  ["averageRank", "averageRank"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeParam("sort", value)}
                  aria-pressed={sort === value}
                  data-active={sort === value || undefined}
                >
                  {metricT(label)}
                </button>
              ))}
            </div>
            {recommendations.slice(0, visibleCount).map((partner, index) => {
              const inPool = focus.some(
                (f) =>
                  f.charCode === partner.characterCode &&
                  (f.weaponCode === 0 ||
                    partner.weaponCode === 0 ||
                    f.weaponCode === partner.weaponCode)
              );
              return (
                <SinglePartnerCard
                  key={`${partner.characterCode}:${partner.weaponCode}`}
                  ally={ally}
                  partner={partner}
                  rank={index + 1}
                  inPool={inPool}
                  onRecommendationClick={() => {
                    if (analyticsEnabled)
                      analytics.synergyRecommendationClicked({
                        ally1Code: charCode,
                        ally2Code: null,
                        ally1WeaponCode: weaponCode,
                        selectionCount: 1,
                        pickedCode: partner.characterCode,
                        pickedRank: index + 1,
                        sortBy: sort,
                        isWeaponScope,
                      });
                  }}
                />
              );
            })}
          </div>
          {visibleCount < recommendations.length && (
            <button
              type="button"
              onClick={() => setPage({ key: listKey, count: visibleCount + 30 })}
              className="min-h-10 rounded-md border border-[var(--color-border)] text-sm"
            >
              {t("showMore")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
