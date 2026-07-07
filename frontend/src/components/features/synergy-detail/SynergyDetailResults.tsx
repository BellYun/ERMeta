"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { X, Users, Loader2, Info, Share2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons";
import { useTraitNames } from "@/hooks/useTraitNames";
import { analytics, type SynergySortBy } from "@/lib/analytics";
import { resolveCharacterName } from "@/lib/characterMap";
import { isMobileDevice } from "@/lib/device";
import { FetchHttpError, FetchRetriesExhaustedError, fetchWithRetry } from "@/lib/fetchWithRetry";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import {
  getAllCharacterCodes,
  getFallbackMap,
  parseSortByParam,
  SORT_OPTIONS,
} from "../synergy/constants";
import { ComboWeaponCard, type GroupedCombo } from "./ComboWeaponCard";
import type { TrioWeaponResult, SortBy } from "./types";
import {
  SYNERGY_DETAIL_ALLIES_CHANGED_EVENT,
  type AllySelection,
  type SynergyDetailAlliesChangedDetail,
} from "./WeaponAllySelector";

const MIN_MEANINGFUL_GAMES = 10;
const VIRTUAL_CARD_ESTIMATE = 92;
const VISIBLE_RESULTS_STEP = 30;

/** 무기·코어 무시하고 캐릭터(c1,c2,c3) 기준으로 그룹화 */
function groupByCharWeapon(results: TrioWeaponResult[]): GroupedCombo[] {
  const map = new Map<
    string,
    {
      c1: number;
      w1: number;
      c2: number;
      w2: number;
      c3: number;
      w3: number;
      topVariantGames: number;
      totalGames: number;
      totalWins: number;
      totalRP: number;
      rankSum: number;
      variants: TrioWeaponResult[];
    }
  >();

  for (const r of results) {
    const key = `${r.character1}-${r.character2}-${r.character3}`;
    const existing = map.get(key);
    const games = r.totalGames;
    const wins = (r.winRate * games) / 100;
    const rp = r.averageRP * games * 3; // averageRP는 /3 된 값이므로 복원
    const rankSum = r.averageRank * games;

    if (!existing) {
      map.set(key, {
        c1: r.character1,
        w1: r.weaponType1,
        c2: r.character2,
        w2: r.weaponType2,
        c3: r.character3,
        w3: r.weaponType3,
        topVariantGames: games,
        totalGames: games,
        totalWins: wins,
        totalRP: rp,
        rankSum,
        variants: [r],
      });
    } else {
      existing.totalGames += games;
      existing.totalWins += wins;
      existing.totalRP += rp;
      existing.rankSum += rankSum;
      existing.variants.push(r);
      // 무기 대표 = totalGames 가장 큰 variant의 무기
      if (games > existing.topVariantGames) {
        existing.topVariantGames = games;
        existing.w1 = r.weaponType1;
        existing.w2 = r.weaponType2;
        existing.w3 = r.weaponType3;
      }
    }
  }

  return Array.from(map.values()).map((v) => ({
    character1: v.c1,
    weaponType1: v.w1,
    character2: v.c2,
    weaponType2: v.w2,
    character3: v.c3,
    weaponType3: v.w3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? (v.totalWins / v.totalGames) * 100 : 0,
    averageRP: v.totalGames > 0 ? v.totalRP / v.totalGames / 3 : 0,
    averageRank: v.totalGames > 0 ? v.rankSum / v.totalGames : 0,
    traitVariants: v.variants,
  }));
}

function sortAllyPair<T extends { charCode: number }>(allies: T[]): T[] {
  return [...allies].sort((a, b) => a.charCode - b.charCode);
}

function getAllyQueryKey(allies: AllySelection[]) {
  return sortAllyPair(allies)
    .map((ally) => `${ally.charCode}:${ally.weaponCode ?? 0}`)
    .join("|");
}

function buildDetailSearchParams(allies: AllySelection[]) {
  const params = new URLSearchParams({ sortBy: "totalGames", limit: "5000" });
  const queryAllies = sortAllyPair(allies);
  const a1 = queryAllies[0];
  if (a1) {
    params.set("character1", String(a1.charCode));
    if (a1.weaponCode) params.set("weapon1", String(a1.weaponCode));
  }
  const a2 = queryAllies[1];
  if (a2) {
    params.set("character2", String(a2.charCode));
    if (a2.weaponCode) params.set("weapon2", String(a2.weaponCode));
  }
  return params;
}

async function fetchDetailRows(allies: AllySelection[], signal?: AbortSignal) {
  const params = buildDetailSearchParams(allies);
  const data = await fetchWithRetry<{ results?: TrioWeaponResult[]; error?: string }>(
    `/api/stats/trios-weapon?${params.toString()}`,
    { signal }
  );
  return data.results ?? [];
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function prioritizeFocusGroups(
  groups: GroupedCombo[],
  selectedCharCodes: number[],
  focusCharWeapons: { charCode: number; weaponCode: number }[]
): GroupedCombo[] {
  if (focusCharWeapons.length === 0) return groups;

  const matchesFocus = (charCode: number, weaponType: number) =>
    focusCharWeapons.some(
      (focus) =>
        focus.charCode === charCode && (focus.weaponCode === 0 || focus.weaponCode === weaponType)
    );

  const matchesGroup = (group: GroupedCombo) => {
    const members = [
      { c: group.character1, w: group.weaponType1 },
      { c: group.character2, w: group.weaponType2 },
      { c: group.character3, w: group.weaponType3 },
    ];

    if (selectedCharCodes.length === 2) {
      const [allyA, allyB] = selectedCharCodes;
      const third = members.find((member) => member.c !== allyA && member.c !== allyB);
      return third !== undefined && matchesFocus(third.c, third.w);
    }

    if (selectedCharCodes.length === 1) {
      const selected = selectedCharCodes[0];
      return members
        .filter((member) => member.c !== selected)
        .some((member) => matchesFocus(member.c, member.w));
    }

    return false;
  };

  return [...groups.filter(matchesGroup), ...groups.filter((group) => !matchesGroup(group))];
}

export function SynergyDetailResults() {
  "use no memo";
  const { l10n } = useL10n();
  const t = useTranslations("synergyResults");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { focusCharWeapons } = useFocusCharWeapons();
  const [localAllies, setLocalAllies] = React.useState<
    [AllySelection | null, AllySelection | null]
  >([null, null]);

  // URL에서 아군+무기 읽기
  const urlAllies = React.useMemo(() => {
    const allies: { charCode: number; weaponCode: number | null }[] = [];
    const a1 = searchParams.get("ally1") ?? searchParams.get("a");
    const w1 = searchParams.get("w1");
    if (a1) {
      const code = parseInt(a1, 10);
      if (!isNaN(code) && getAllCharacterCodes().includes(code)) {
        allies.push({ charCode: code, weaponCode: w1 ? parseInt(w1, 10) || null : null });
      }
    }
    const a2 = searchParams.get("ally2") ?? searchParams.get("b");
    const w2 = searchParams.get("w2");
    if (a2) {
      const code = parseInt(a2, 10);
      if (
        !isNaN(code) &&
        getAllCharacterCodes().includes(code) &&
        !allies.some((a) => a.charCode === code)
      ) {
        allies.push({ charCode: code, weaponCode: w2 ? parseInt(w2, 10) || null : null });
      }
    }
    return allies;
  }, [searchParams]);

  React.useEffect(() => {
    const handleAlliesChanged = (event: Event) => {
      const detail = (event as CustomEvent<SynergyDetailAlliesChangedDetail>).detail;
      setLocalAllies([detail.ally1, detail.ally2]);
    };

    window.addEventListener(SYNERGY_DETAIL_ALLIES_CHANGED_EVENT, handleAlliesChanged);
    return () =>
      window.removeEventListener(SYNERGY_DETAIL_ALLIES_CHANGED_EVENT, handleAlliesChanged);
  }, []);

  const selectedAllies = React.useMemo(() => {
    const local = localAllies.filter(Boolean) as AllySelection[];
    return local.length > 0 ? local : urlAllies;
  }, [localAllies, urlAllies]);

  const selectedCharCodes = React.useMemo(
    () => selectedAllies.map((a) => a.charCode),
    [selectedAllies]
  );

  /**
   * 모바일 탭 지연 해소 핵심:
   * - WeaponAllySelector에서 아군을 선택하면 URL이 바뀌고 → searchParams 재방출 →
   *   selectedAllies가 즉시 새로워져 fetch/재렌더 체인이 urgent로 커밋되어
   *   다음 탭 이벤트가 150~300ms 뒤로 밀렸음.
   * - useDeferredValue로 selectedAllies를 지연값(deferredAllies)으로 분리하여
   *   fetch와 30개 ComboWeaponCard 재조정을 concurrent 저우선순위 렌더로 밀어낸다.
   * - WeaponAllySelector의 슬롯/셀 시각 반응은 자기 로컬 state로 처리되므로 영향 없음.
   */
  const deferredAllies = React.useDeferredValue(selectedAllies);
  const deferredCharCodes = React.useMemo(
    () => deferredAllies.map((a) => a.charCode),
    [deferredAllies]
  );

  const sortBy = React.useMemo(() => parseSortByParam(searchParams.get("sort")), [searchParams]);
  const [queryAllies, setQueryAllies] = React.useState<AllySelection[]>(deferredAllies);
  const [resultsState, setResultsState] = React.useState<{
    data: TrioWeaponResult[];
    error: unknown;
    loading: boolean;
  }>(() => ({
    data: [],
    error: null,
    loading: deferredAllies.length > 0,
  }));
  const [visibleCount, setVisibleCount] = React.useState(VISIBLE_RESULTS_STEP);

  /**
   * 1번 탭 즉각 반응 핵심:
   * - selectedAllies는 urgent, deferredAllies는 deferred → 탭 직후 두 값이 잠시 달라짐.
   * - 이 갭 동안 fetch는 아직 시작되지 않았고 loading state도 false지만 사용자 시점에서는
   *   이미 선택을 완료했으므로 empty state를 유지하면 "탭 → empty → next frame에 loading
   *   skeleton" 이중 페인트가 발생 (= 탭 click duration 증가).
   * - 두 값이 다르면 '선택 변경 진행 중'으로 간주하여 스켈레톤을 즉시 노출 → urgent render
   *   한 번으로 최종 형태에 수렴.
   */
  const isAllyChangeInFlight = React.useMemo(() => {
    if (selectedAllies.length === 0) return false;
    if (selectedAllies === deferredAllies) return false;
    if (selectedAllies.length !== deferredAllies.length) return true;
    for (let i = 0; i < selectedAllies.length; i++) {
      const s = selectedAllies[i];
      const d = deferredAllies[i];
      if (s.charCode !== d.charCode) return true;
      if ((s.weaponCode ?? null) !== (d.weaponCode ?? null)) return true;
    }
    return false;
  }, [selectedAllies, deferredAllies]);
  React.useEffect(() => {
    if (deferredAllies.length === 0) {
      setQueryAllies([]);
      return;
    }

    const timerId = setTimeout(() => {
      const nextKey = getAllyQueryKey(deferredAllies);
      setQueryAllies((prev) => (getAllyQueryKey(prev) === nextKey ? prev : deferredAllies));
    }, 180);

    return () => clearTimeout(timerId);
  }, [deferredAllies]);

  React.useEffect(() => {
    if (queryAllies.length === 0) {
      setResultsState({ data: [], error: null, loading: false });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setResultsState((prev) => ({ ...prev, error: null, loading: true }));

    fetchDetailRows(queryAllies, controller.signal)
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

  const deferredAlliesKey = React.useMemo(() => getAllyQueryKey(deferredAllies), [deferredAllies]);
  const queryAlliesKey = React.useMemo(() => getAllyQueryKey(queryAllies), [queryAllies]);
  const isQueryAlliesPending = deferredAllies.length > 0 && deferredAlliesKey !== queryAlliesKey;
  const showLoading = isAllyChangeInFlight || isQueryAlliesPending || resultsState.loading;
  const results = React.useMemo(
    () => (isQueryAlliesPending ? [] : resultsState.data),
    [isQueryAlliesPending, resultsState.data]
  );
  const error = React.useMemo(() => {
    const err = resultsState.error;
    if (!err || deferredAllies.length === 0 || isQueryAlliesPending) return null;
    if (err instanceof DOMException && err.name === "TimeoutError") return t("timeout");
    if (err instanceof FetchRetriesExhaustedError) return t("genericError");
    if (err instanceof FetchHttpError) {
      const body = err.body as { error?: string } | null;
      return body?.error ?? t("genericError");
    }
    return err instanceof Error ? err.message : t("genericError");
  }, [deferredAllies.length, isQueryAlliesPending, resultsState.error, t]);
  const [copied, setCopied] = React.useState(false);
  const virtualListRef = React.useRef<HTMLDivElement>(null);
  const [virtualScrollMargin, setVirtualScrollMargin] = React.useState(0);
  const traitNames = useTraitNames(l10n);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );
  const getWeaponName = React.useCallback((code: number) => resolveWeaponName(code, l10n), [l10n]);
  const getTraitName = React.useCallback((code: number) => traitNames[code] ?? null, [traitNames]);
  const isFocusPoolCombo = React.useCallback(
    (group: GroupedCombo) => {
      if (focusCharWeapons.length === 0) return false;

      const matchesFocus = (charCode: number, weaponCode: number) =>
        focusCharWeapons.some(
          (focus) =>
            focus.charCode === charCode &&
            (focus.weaponCode === 0 || focus.weaponCode === weaponCode)
        );
      const members = [
        { c: group.character1, w: group.weaponType1 },
        { c: group.character2, w: group.weaponType2 },
        { c: group.character3, w: group.weaponType3 },
      ];

      if (deferredCharCodes.length === 2) {
        const [allyA, allyB] = deferredCharCodes;
        const third = members.find((member) => member.c !== allyA && member.c !== allyB);
        return third !== undefined && matchesFocus(third.c, third.w);
      }

      if (deferredCharCodes.length === 1) {
        const selected = deferredCharCodes[0];
        return members
          .filter((member) => member.c !== selected)
          .some((member) => matchesFocus(member.c, member.w));
      }

      return false;
    },
    [deferredCharCodes, focusCharWeapons]
  );

  // Two-level aggregation + focus-priority sorting — deferred 기반
  const recommendations = React.useMemo(() => {
    if (deferredAllies.length === 0) return [];

    // Group by character+weapon (Level 1)
    const grouped = groupByCharWeapon(results);

    // Sort
    if (sortBy === "averageRP") {
      grouped.sort((a, b) => b.averageRP - a.averageRP);
    } else if (sortBy === "winRate") {
      grouped.sort((a, b) => b.winRate - a.winRate);
    } else if (sortBy === "averageRank") {
      grouped.sort((a, b) => a.averageRank - b.averageRank);
    } else {
      grouped.sort((a, b) => b.totalGames - a.totalGames);
    }

    const sampleAwareGroups =
      sortBy === "totalGames"
        ? grouped
        : [
            ...grouped.filter((group) => group.totalGames >= MIN_MEANINGFUL_GAMES),
            ...grouped.filter((group) => group.totalGames < MIN_MEANINGFUL_GAMES),
          ];

    return prioritizeFocusGroups(sampleAwareGroups, deferredCharCodes, focusCharWeapons);
  }, [results, deferredAllies, deferredCharCodes, focusCharWeapons, sortBy]);

  const visibleResetKey = React.useMemo(() => {
    const allyKey = deferredAllies
      .filter((ally): ally is NonNullable<typeof ally> => ally !== null)
      .map((ally) => `${ally.charCode}:${ally.weaponCode ?? 0}`)
      .join("|");
    const focusKey = focusCharWeapons
      .map((focus) => `${focus.charCode}:${focus.weaponCode}`)
      .join("|");
    return `${allyKey}::${focusKey}::${sortBy}`;
  }, [deferredAllies, focusCharWeapons, sortBy]);

  React.useEffect(() => {
    setVisibleCount(VISIBLE_RESULTS_STEP);
  }, [visibleResetKey]);

  const visibleRecommendations = React.useMemo(
    () => recommendations.slice(0, visibleCount),
    [recommendations, visibleCount]
  );
  const hasMoreRecommendations = visibleRecommendations.length < recommendations.length;

  const clearAllies = React.useCallback(() => {
    setLocalAllies([null, null]);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

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
    if (showLoading || deferredAllies.length === 0 || recommendations.length === 0) return;
    const a1 = deferredCharCodes[0] ?? null;
    const a2 = deferredCharCodes[1] ?? null;
    const allyKey = getAllyQueryKey(deferredAllies);
    const key = `${allyKey}|${sortBy}`;
    if (lastViewedKeyRef.current === key) return;
    const previousKey = lastViewedKeyRef.current;
    const previousAllyKey = previousKey ? previousKey.split("|").slice(0, -1).join("|") : null;
    const source =
      previousKey === null && typeof window !== "undefined" && window.location.search
        ? "url_restore"
        : previousAllyKey === allyKey
          ? "sort_change"
          : "filter_change";
    lastViewedKeyRef.current = key;
    explorationDepthRef.current += 1;
    funnelStateRef.current = {
      viewed: true,
      openedDetail: false,
      ally1Code: a1,
      ally2Code: a2,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      explorationDepth: explorationDepthRef.current,
    };
    analytics.synergyResultViewed({
      ally1Code: a1,
      ally2Code: a2,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      tier: "",
      patch: "",
      isWeaponScope: true,
    });
    analytics.synergyExplorationAdvanced({
      ally1Code: a1,
      ally2Code: a2,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      explorationDepth: explorationDepthRef.current,
      isWeaponScope: true,
      source,
    });
  }, [showLoading, recommendations, deferredAllies, deferredCharCodes, sortBy]);

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
      isWeaponScope: true,
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

  // synergy_recommendation_clicked — ref-stable 콜백 (ComboWeaponCard memo 보존)
  const recClickStateRef = React.useRef({ deferredCharCodes, sortBy });
  React.useEffect(() => {
    recClickStateRef.current = { deferredCharCodes, sortBy };
  }, [deferredCharCodes, sortBy]);
  const onRecommendationClick = React.useCallback((pickedCode: number, pickedRank: number) => {
    const { deferredCharCodes: allies, sortBy: currentSortBy } = recClickStateRef.current;
    funnelStateRef.current.openedDetail = true;
    analytics.synergyRecommendationClicked({
      ally1Code: allies[0] ?? null,
      ally2Code: allies[1] ?? null,
      pickedCode,
      pickedRank,
      sortBy: currentSortBy as SynergySortBy,
    });
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: visibleRecommendations.length,
    estimateSize: () => VIRTUAL_CARD_ESTIMATE,
    overscan: 6,
    scrollMargin: virtualScrollMargin,
  });

  React.useLayoutEffect(() => {
    if (visibleRecommendations.length === 0) return;
    const el = virtualListRef.current;
    if (!el) return;

    const updateScrollMargin = () => {
      setVirtualScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };

    updateScrollMargin();
    window.addEventListener("resize", updateScrollMargin);
    return () => {
      window.removeEventListener("resize", updateScrollMargin);
    };
  }, [visibleRecommendations.length]);

  React.useEffect(() => {
    rowVirtualizer.measure();
  }, [visibleRecommendations, rowVirtualizer]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {selectedAllies.length > 0 && (
            <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.1rem]">
              {selectedCharCodes.length === 1
                ? t("titleSingle", { ally: getCharName(selectedCharCodes[0]) })
                : t("titlePair", {
                    ally1: getCharName(selectedCharCodes[0]),
                    ally2: getCharName(selectedCharCodes[1]),
                  })}
            </h2>
          )}
          {focusCharWeapons.length > 0 && (
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-muted-foreground)]">
              {t("focusFilter", { count: focusCharWeapons.length })}
            </span>
          )}
          {selectedAllies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const ally1Code = selectedCharCodes[0] ?? null;
                  const ally2Code = selectedCharCodes[1] ?? null;
                  const title =
                    selectedCharCodes.length === 2
                      ? t("titlePair", {
                          ally1: getCharName(selectedCharCodes[0]),
                          ally2: getCharName(selectedCharCodes[1]),
                        })
                      : t("titleSingle", { ally: getCharName(selectedCharCodes[0]) });
                  const buildShareUrl = (method: "native" | "clipboard") => {
                    const u = new URL(window.location.href);
                    u.searchParams.set("utm_source", "ergg_share");
                    u.searchParams.set("utm_medium", method);
                    u.searchParams.set("utm_campaign", "synergy_detail");
                    return u.toString();
                  };
                  if (isMobileDevice() && typeof navigator.share === "function") {
                    navigator
                      .share({ title, url: buildShareUrl("native") })
                      .then(() => {
                        analytics.synergyShared({
                          ally1Code,
                          ally2Code,
                          scope: "synergy_detail",
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
                      scope: "synergy_detail",
                      method: "clipboard",
                    });
                  });
                }}
                className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
              >
                <Share2 className="h-3 w-3" />
                {copied ? t("copied") : t("share")}
              </button>
              <button
                type="button"
                onClick={clearAllies}
                className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-3 w-3" />
                {t("reset")}
              </button>
            </div>
          )}
        </div>

        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5 xl:w-auto">
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => updateSortBy(value)}
              className={cn(
                "dashboard-tab flex min-h-[30px] shrink-0 items-center px-3 py-1 text-[12px] font-semibold",
                sortBy === value
                  ? ""
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
              data-active={sortBy === value ? "true" : undefined}
            >
              {t(`sort.${labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 목록 */}
      <SectionErrorBoundary sectionName={t("sectionName")}>
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
              <Users className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="text-[15px] font-semibold text-[var(--color-foreground)]/92">
              {t("empty.prompt")}
            </p>
            <ol className="mt-4 flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--color-foreground)]/72">
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  1.
                </span>
                <span>{t("empty.step1")}</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  2.
                </span>
                <span>{t("empty.step2")}</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  3.
                </span>
                <span>{t("empty.step3")}</span>
              </li>
            </ol>
          </div>
        ) : showLoading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 text-[var(--color-primary-hover)]" />
              <p className="text-sm font-medium text-[var(--color-foreground)]/82">
                {t("loading")}
              </p>
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
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div data-sr-block className="flex flex-col gap-2">
            {selectedAllies.length === 1 && (
              <p className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-medium text-[var(--color-muted-foreground)]">
                <Info
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-hover)]"
                  strokeWidth={2.4}
                />
                {t("infoSingle")}
              </p>
            )}
            {selectedAllies.length === 2 && (
              <p className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-medium text-[var(--color-muted-foreground)]">
                <Info
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-hover)]"
                  strokeWidth={2.4}
                />
                {t("infoPair")}
              </p>
            )}
            <div
              ref={virtualListRef}
              className="relative"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const group = visibleRecommendations[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute left-0 top-0 w-full pb-2"
                    style={{
                      transform: `translateY(${virtualRow.start - virtualScrollMargin}px)`,
                    }}
                  >
                    <ComboWeaponCard
                      key={`${group.character1}-${group.weaponType1}-${group.character2}-${group.weaponType2}-${group.character3}-${group.weaponType3}`}
                      group={group}
                      rank={virtualRow.index + 1}
                      getCharName={getCharName}
                      getWeaponName={getWeaponName}
                      getTraitName={getTraitName}
                      selectedCharCodes={deferredCharCodes}
                      isFocusPoolCombo={isFocusPoolCombo(group)}
                      onRecommendationClick={onRecommendationClick}
                    />
                  </div>
                );
              })}
            </div>
            {hasMoreRecommendations ? (
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((current) =>
                    Math.min(current + VISIBLE_RESULTS_STEP, recommendations.length)
                  )
                }
                className="dashboard-tab mx-auto mt-3 min-h-[38px] px-4 text-sm font-semibold"
              >
                {t("more", {
                  visible: Math.min(visibleCount, recommendations.length),
                  total: recommendations.length,
                })}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <Users
              className="mb-3 h-10 w-10 text-[var(--color-foreground)]/35"
              strokeWidth={1.75}
            />
            <p className="text-[14px] font-medium text-[var(--color-foreground)]">
              {t("emptyNoData")}
            </p>
            <button
              onClick={clearAllies}
              className="mt-3 text-[12px] font-semibold text-[var(--color-primary-hover)] hover:underline active:opacity-70 min-h-[44px] px-2"
            >
              {t("clearAllies")}
            </button>
          </div>
        )}
      </SectionErrorBoundary>
    </>
  );
}
