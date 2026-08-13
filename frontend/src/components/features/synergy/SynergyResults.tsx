"use client";

import { X, Users, Loader2, Info, Share2 } from "lucide-react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharacters } from "@/hooks/useFocusCharacters";
import { analytics, type SynergyPrefetchTrigger, type SynergySortBy } from "@/lib/analytics";
import { resolveCharacterName } from "@/lib/characterMap";
import { isMobileDevice } from "@/lib/device";
import { FetchHttpError, FetchRetriesExhaustedError, fetchWithRetry } from "@/lib/fetchWithRetry";
import { withCurrentRouteLocale } from "@/lib/localizedPath";
import { getAllCharacterCodes, getFallbackMap, parseSortByParam, SORT_OPTIONS } from "./constants";
import type { TrioResult, SortBy } from "./types";
import { getThirdCharacter, deduplicateResults } from "./utils";
const ComboCard = React.lazy(() => import("./ComboCard").then((m) => ({ default: m.ComboCard })));
const MIN_MEANINGFUL_GAMES = 10;

interface TrioWeaponApiRow {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

function mergeTrioWeaponRowsByCharacters(rows: TrioWeaponApiRow[]): TrioResult[] {
  const merged = new Map<string, TrioResult>();

  for (const row of rows) {
    const characters = [row.character1, row.character2, row.character3].sort((a, b) => a - b);
    const key = characters.join("-");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        character1: characters[0],
        character2: characters[1],
        character3: characters[2],
        winRate: row.winRate,
        averageRP: row.averageRP,
        totalGames: row.totalGames,
        averageRank: row.averageRank,
      });
      continue;
    }

    const totalGames = existing.totalGames + row.totalGames;
    if (totalGames > 0) {
      existing.winRate =
        (existing.winRate * existing.totalGames + row.winRate * row.totalGames) / totalGames;
      existing.averageRP =
        (existing.averageRP * existing.totalGames + row.averageRP * row.totalGames) / totalGames;
      existing.averageRank =
        (existing.averageRank * existing.totalGames + row.averageRank * row.totalGames) /
        totalGames;
    }
    existing.totalGames = totalGames;
  }

  return Array.from(merged.values());
}

function sortCharacterPair(characters: number[]): number[] {
  return [...characters].sort((a, b) => a - b);
}

function getCharacterPairKey(characters: number[]) {
  return sortCharacterPair(characters).join(":");
}

function buildTrioWeaponSearchParams(selectedAllies: number[]) {
  const params = new URLSearchParams({ sortBy: "totalGames", limit: "5000" });
  const queryAllies = sortCharacterPair(selectedAllies);
  if (queryAllies[0] !== undefined) params.set("character1", String(queryAllies[0]));
  if (queryAllies[1] !== undefined) params.set("character2", String(queryAllies[1]));
  return params;
}

async function fetchTrioWeaponRows(selectedAllies: number[], signal?: AbortSignal) {
  const params = buildTrioWeaponSearchParams(selectedAllies);
  const data = await fetchWithRetry<{ results?: TrioWeaponApiRow[]; error?: string }>(
    `/api/stats/trios-weapon?${params.toString()}`,
    { signal }
  );
  return mergeTrioWeaponRowsByCharacters(data.results ?? []);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isFocusResult(rec: TrioResult, selectedAllies: number[], focusCharacters: number[]) {
  if (focusCharacters.length === 0) return false;
  const focusSet = new Set(focusCharacters);

  if (selectedAllies.length === 2) {
    const third = getThirdCharacter(rec, selectedAllies[0], selectedAllies[1]);
    return third != null && focusSet.has(third);
  }

  if (selectedAllies.length === 1) {
    const selected = selectedAllies[0];
    return [rec.character1, rec.character2, rec.character3]
      .filter((code) => code !== selected)
      .some((code) => focusSet.has(code));
  }

  return false;
}

function prioritizeFocusResults(
  results: TrioResult[],
  selectedAllies: number[],
  focusCharacters: number[]
): TrioResult[] {
  if (focusCharacters.length === 0) return results;

  return [
    ...results.filter((rec) => isFocusResult(rec, selectedAllies, focusCharacters)),
    ...results.filter((rec) => !isFocusResult(rec, selectedAllies, focusCharacters)),
  ];
}

/**
 * 시너지 결과 Island — URL params(ally1,ally2) + localStorage(focusCharacters) 기반
 * SynergyClient에서 분리된 독립 Client Component
 */
export function SynergyResults({ compact = false }: { compact?: boolean }) {
  const { l10n } = useL10n();
  const t = useTranslations("synergyMainResults");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { focusCharacters } = useFocusCharacters();

  // URL에서 아군 읽기
  const selectedAllies = React.useMemo(() => {
    const allies: number[] = [];
    const a1 = searchParams.get("ally1");
    const a2 = searchParams.get("ally2");
    if (a1) {
      const code = parseInt(a1, 10);
      if (!isNaN(code) && getAllCharacterCodes().includes(code)) allies.push(code);
    }
    if (a2) {
      const code = parseInt(a2, 10);
      if (!isNaN(code) && getAllCharacterCodes().includes(code) && !allies.includes(code))
        allies.push(code);
    }
    return allies;
  }, [searchParams]);

  const sortBy = React.useMemo(() => parseSortByParam(searchParams.get("sort")), [searchParams]);
  const [queryAllies, setQueryAllies] = React.useState<number[]>(selectedAllies);
  const [resultsState, setResultsState] = React.useState<{
    data: TrioResult[];
    error: unknown;
    loading: boolean;
  }>(() => ({
    data: [],
    error: null,
    loading: selectedAllies.length > 0,
  }));
  const [copied, setCopied] = React.useState(false);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );

  // 조건 변경 중에는 잠깐 기다렸다가 최종 조합만 요청한다.
  // 요청 파라미터는 정렬된 실험체 pair라서 A+B와 B+A가 같은 HTTP 캐시 키를 공유한다.
  React.useEffect(() => {
    if (selectedAllies.length === 0) {
      setQueryAllies([]);
      return;
    }

    const timerId = setTimeout(() => {
      const nextKey = getCharacterPairKey(selectedAllies);
      setQueryAllies((prev) => (getCharacterPairKey(prev) === nextKey ? prev : selectedAllies));
    }, 180);

    return () => {
      clearTimeout(timerId);
    };
  }, [selectedAllies]);

  React.useEffect(() => {
    if (queryAllies.length === 0) {
      setResultsState({ data: [], error: null, loading: false });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setResultsState((prev) => ({ ...prev, error: null, loading: true }));

    fetchTrioWeaponRows(queryAllies, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setResultsState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setResultsState({ data: [], error: err, loading: false });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryAllies]);

  const selectedAlliesKey = React.useMemo(
    () => getCharacterPairKey(selectedAllies),
    [selectedAllies]
  );
  const queryAlliesKey = React.useMemo(() => getCharacterPairKey(queryAllies), [queryAllies]);
  const isSelectionPending = selectedAllies.length > 0 && selectedAlliesKey !== queryAlliesKey;
  const trioResults = React.useMemo(
    () => (isSelectionPending ? [] : resultsState.data),
    [isSelectionPending, resultsState.data]
  );
  const loading = selectedAllies.length > 0 && (isSelectionPending || resultsState.loading);
  const error = React.useMemo(() => {
    const err = resultsState.error;
    if (!err || selectedAllies.length === 0 || isSelectionPending) return null;
    if (err instanceof DOMException && err.name === "TimeoutError") return t("timeout");
    if (err instanceof FetchRetriesExhaustedError) return t("genericError");
    if (err instanceof FetchHttpError) {
      const body = err.body as { error?: string } | null;
      return body?.error ?? t("genericError");
    }
    return err instanceof Error ? err.message : t("genericError");
  }, [isSelectionPending, resultsState.error, selectedAllies.length, t]);

  const recommendations = React.useMemo(() => {
    if (selectedAllies.length === 0) return [];

    const deduped = deduplicateResults(trioResults, selectedAllies, sortBy);
    const sorted = [
      ...deduped.filter((r) => r.averageRP >= 0),
      ...deduped.filter((r) => r.averageRP < 0),
    ];
    const sampleAwareSorted =
      sortBy === "totalGames"
        ? sorted
        : [
            ...sorted.filter((r) => r.totalGames >= MIN_MEANINGFUL_GAMES),
            ...sorted.filter((r) => r.totalGames < MIN_MEANINGFUL_GAMES),
          ];
    return prioritizeFocusResults(sampleAwareSorted, selectedAllies, focusCharacters).slice(0, 20);
  }, [trioResults, selectedAllies, focusCharacters, sortBy]);

  const clearAllies = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const updateSortBy = React.useCallback(
    (nextSortBy: SortBy) => {
      if (nextSortBy === sortBy) return;
      const params = new URLSearchParams(searchParams.toString());
      if (nextSortBy === "averageRP") params.delete("sort");
      else params.set("sort", nextSortBy);
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
      analytics.synergySortChanged(nextSortBy);
    },
    [pathname, router, searchParams, sortBy]
  );

  const prefetchedAnalysisRef = React.useRef(new Set<number>());
  const prefetchAnalysis = React.useCallback(
    (code: number, rank: number, trigger: SynergyPrefetchTrigger) => {
      if (prefetchedAnalysisRef.current.has(code)) return;
      prefetchedAnalysisRef.current.add(code);
      router.prefetch(withCurrentRouteLocale(pathname, `/character/${code}`));
      analytics.synergyRecommendationPrefetched({
        pickedCode: code,
        pickedRank: rank,
        trigger,
      });
    },
    [pathname, router]
  );

  // synergy_result_viewed — 같은 (ally1,ally2,sortBy) 조합은 중복 fire 금지
  const lastViewedKeyRef = React.useRef<string | null>(null);
  const explorationDepthRef = React.useRef(0);
  const funnelStateRef = React.useRef<{
    viewed: boolean;
    openedDetail: boolean;
    ally1Code: number | null;
    ally2Code: number | null;
    resultCount: number;
    sortBy: SynergySortBy;
    explorationDepth: number;
  }>({
    viewed: false,
    openedDetail: false,
    ally1Code: null,
    ally2Code: null,
    resultCount: 0,
    sortBy: "averageRP",
    explorationDepth: 0,
  });

  React.useEffect(() => {
    if (loading || selectedAllies.length === 0 || recommendations.length === 0) return;
    const key = `${selectedAllies[0] ?? "_"}|${selectedAllies[1] ?? "_"}|${sortBy}`;
    if (lastViewedKeyRef.current === key) return;
    const previousKey = lastViewedKeyRef.current;
    const previousPairKey = previousKey?.split("|").slice(0, 2).join("|") ?? null;
    const currentPairKey = `${selectedAllies[0] ?? "_"}|${selectedAllies[1] ?? "_"}`;
    const source =
      previousKey === null && typeof window !== "undefined" && window.location.search
        ? "url_restore"
        : previousPairKey === currentPairKey
          ? "sort_change"
          : "filter_change";
    lastViewedKeyRef.current = key;
    explorationDepthRef.current += 1;
    funnelStateRef.current = {
      viewed: true,
      openedDetail: false,
      ally1Code: selectedAllies[0] ?? null,
      ally2Code: selectedAllies[1] ?? null,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      explorationDepth: explorationDepthRef.current,
    };
    analytics.synergyResultViewed({
      ally1Code: selectedAllies[0] ?? null,
      ally2Code: selectedAllies[1] ?? null,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      tier: "",
      patch: "",
      isWeaponScope: false,
    });
    analytics.synergyExplorationAdvanced({
      ally1Code: selectedAllies[0] ?? null,
      ally2Code: selectedAllies[1] ?? null,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      explorationDepth: explorationDepthRef.current,
      isWeaponScope: false,
      source,
    });
  }, [loading, selectedAllies, sortBy, recommendations]);

  const emitFunnelExit = React.useCallback(() => {
    const state = funnelStateRef.current;
    if (!state.viewed) return;
    analytics.synergyFunnelExited({
      ally1Code: state.ally1Code,
      ally2Code: state.ally2Code,
      resultCount: state.resultCount,
      sortBy: state.sortBy,
      explorationDepth: state.explorationDepth,
      openedDetail: state.openedDetail,
      isWeaponScope: false,
    });
    state.viewed = false;
  }, []);

  React.useEffect(() => {
    const handlePageHide = () => emitFunnelExit();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") emitFunnelExit();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      emitFunnelExit();
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [emitFunnelExit]);

  return (
    <>
      {/* 정렬 기준 + 헤더 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => updateSortBy(value)}
              className="dashboard-tab min-h-[30px] px-2.5 py-1 text-xs"
              data-active={sortBy === value ? "true" : undefined}
            >
              {t(`sort.${labelKey}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedAllies.length > 0 && (
            <>
              <h2 className="dashboard-section-title text-sm font-semibold text-[var(--color-foreground)]">
                {selectedAllies.length === 1
                  ? t("titleSingle", { ally: getCharName(selectedAllies[0]) })
                  : t("titlePair", {
                      ally1: getCharName(selectedAllies[0]),
                      ally2: getCharName(selectedAllies[1]),
                    })}
                {focusCharacters.length > 0
                  ? ` (${t("focusFilter", { count: focusCharacters.length })})`
                  : ""}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const ally1Code = selectedAllies[0] ?? null;
                  const ally2Code = selectedAllies[1] ?? null;
                  const title =
                    selectedAllies.length === 2
                      ? t("titlePair", {
                          ally1: getCharName(selectedAllies[0]),
                          ally2: getCharName(selectedAllies[1]),
                        })
                      : t("titleSingle", { ally: getCharName(selectedAllies[0]) });
                  const buildShareUrl = (method: "native" | "clipboard") => {
                    const u = new URL(window.location.href);
                    u.searchParams.set("utm_source", "ergg_share");
                    u.searchParams.set("utm_medium", method);
                    u.searchParams.set("utm_campaign", "synergy");
                    return u.toString();
                  };
                  if (isMobileDevice() && typeof navigator.share === "function") {
                    navigator
                      .share({ title, url: buildShareUrl("native") })
                      .then(() => {
                        analytics.synergyShared({
                          ally1Code,
                          ally2Code,
                          scope: "synergy",
                          method: "native",
                        });
                      })
                      .catch(() => {});
                    return;
                  }
                  navigator.clipboard.writeText(buildShareUrl("clipboard")).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    analytics.synergyShared({
                      ally1Code,
                      ally2Code,
                      scope: "synergy",
                      method: "clipboard",
                    });
                  });
                }}
                className="inline-flex items-center gap-1 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
              >
                <Share2 className="h-3 w-3" />
                {copied ? t("copied") : t("share")}
              </button>
              <button
                type="button"
                onClick={clearAllies}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border-light)] transition-colors"
              >
                <X className="h-3 w-3" />
                {t("reset")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 결과 목록 */}
      <SectionErrorBoundary sectionName={t("sectionName")}>
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("empty.prompt")}</p>
            <div className="mt-3 flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
              <span>{t("empty.step1")}</span>
              <span>{t("empty.step2")}</span>
              <span>{t("empty.step3")}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">{t("loading")}</p>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="h-6 w-6 rounded-full bg-[var(--color-surface-2)]" />
                <div className="flex gap-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="h-10 w-10 rounded-md bg-[var(--color-surface-2)]" />
                  ))}
                </div>
                <div className="ml-auto flex gap-4">
                  <div className="h-4 w-16 rounded bg-[var(--color-surface-2)]" />
                  <div className="h-4 w-16 rounded bg-[var(--color-surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div data-sr-block className="flex flex-col gap-2">
            {selectedAllies.length === 1 && (
              <p className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {t("infoSingle")}
              </p>
            )}
            <React.Suspense
              fallback={<div className="h-64 rounded-md bg-[var(--color-surface-2)]" />}
            >
              {recommendations.map((rec, i) => (
                <ComboCard
                  key={`${rec.character1}-${rec.character2}-${rec.character3}`}
                  rec={rec}
                  rank={i + 1}
                  getCharName={getCharName}
                  selectedAllies={selectedAllies}
                  isFocusPoolCombo={isFocusResult(rec, selectedAllies, focusCharacters)}
                  isTopResult={i < 3}
                  compact={compact}
                  priorityImages={i < 5}
                  prefetchOnViewport={i < 4}
                  onPrefetchAnalysis={prefetchAnalysis}
                  onNavigateAnalysis={(code) => {
                    funnelStateRef.current.openedDetail = true;
                    analytics.synergyRecommendationClicked({
                      ally1Code: selectedAllies[0] ?? null,
                      ally2Code: selectedAllies[1] ?? null,
                      pickedCode: code,
                      pickedRank: i + 1,
                      sortBy: sortBy as SynergySortBy,
                    });
                    router.push(withCurrentRouteLocale(pathname, `/character/${code}`));
                  }}
                />
              ))}
            </React.Suspense>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("emptyNoData")}</p>
            <button
              onClick={clearAllies}
              className="mt-3 text-xs text-[var(--color-foreground)] hover:underline"
            >
              {t("clearAllies")}
            </button>
          </div>
        )}
      </SectionErrorBoundary>
    </>
  );
}
