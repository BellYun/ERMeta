"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { X, Users, Loader2, Info, Share2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons";
import { useTraitNames } from "@/hooks/useTraitNames";
import { analytics, type SynergySortBy } from "@/lib/analytics";
import {
  buildCompositionAffinityKey,
  type CompositionAffinityBatchResponse,
  type CompositionAffinityEvidence,
  type CompositionAffinityMemberInput,
} from "@/lib/characterAffinityComposition";
import { resolveCharacterName } from "@/lib/characterMap";
import { isMobileDevice } from "@/lib/device";
import { FetchHttpError, FetchRetriesExhaustedError, fetchWithRetry } from "@/lib/fetchWithRetry";
import { buildSynergyShareUrl } from "@/lib/synergyShare";
import { MINIMUM_GAMES_OPTIONS, parseMinimumGamesParam } from "@/lib/synergyUrlState";
import { comparePerformanceTierStats } from "@/lib/tierScoring";
import {
  filterTrioWeaponTuples,
  parseTrioWeaponTupleBucket,
  trioWeaponTupleToResult,
  type CachedTrioWeaponTuple,
} from "@/lib/trioWeaponTuple";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap, SORT_OPTIONS } from "../synergy/constants";
import { ComboWeaponCard, type GroupedCombo } from "./ComboWeaponCard";
import {
  type AllySelection,
  useSelectedAllies,
  useSynergyDetailSelection,
} from "./SynergyDetailSelectionStore";
import type { TrioWeaponResult, SortBy } from "./types";

const MIN_MEANINGFUL_GAMES = 10;
const VIRTUAL_CARD_ESTIMATE = 245; // 운영·역할·상성 설명이 포함된 접힌 카드의 실측 높이
const VISIBLE_RESULTS_STEP = 30;
const DETAIL_BUCKET_MEMORY_CACHE_LIMIT = 8;
const RESULT_QUERY_DEBOUNCE_MS = 50;
const RESULT_CARD_OVERSCAN = 3;

type DetailBucketData = CachedTrioWeaponTuple[] | TrioWeaponResult[];

const detailBucketMemoryCache = new Map<string, CachedTrioWeaponTuple[]>();
const detailBucketInFlight = new Map<string, Promise<DetailBucketData>>();
const affinityEvidenceMemoryCache = new Map<string, CompositionAffinityEvidence>();

const DETAIL_SORT_OPTIONS: {
  value: SortBy;
  labelKey: "tierScore" | "averageRP" | "winRate" | "averageRank" | "totalGames";
}[] = [{ value: "tierScore", labelKey: "tierScore" }, ...SORT_OPTIONS];

function parseDetailSortByParam(value: string | null): SortBy {
  return DETAIL_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortBy)
    : "tierScore";
}

/** 코어만 무시하고 실험체+무기(c:w) 기준으로 그룹화 */
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
    const key = [
      `${r.character1}:${r.weaponType1}`,
      `${r.character2}:${r.weaponType2}`,
      `${r.character3}:${r.weaponType3}`,
    ].join("-");
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

function getGroupAffinityMembers(group: GroupedCombo): CompositionAffinityMemberInput[] {
  return [
    { characterCode: group.character1, weapon: group.weaponType1 },
    { characterCode: group.character2, weapon: group.weaponType2 },
    { characterCode: group.character3, weapon: group.weaponType3 },
  ];
}

function sortAllyPair<T extends { charCode: number }>(allies: T[]): T[] {
  return [...allies].sort((a, b) => a.charCode - b.charCode);
}

function getAllyQueryKey(allies: AllySelection[]) {
  return sortAllyPair(allies)
    .map((ally) => `${ally.charCode}:${ally.weaponCode ?? 0}`)
    .join("|");
}

function buildLegacyDetailSearchParams(allies: AllySelection[]) {
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

function buildDetailTupleSearchParams(allies: AllySelection[]) {
  // 첫 번째 선택(A)을 고정 anchor로 사용해 B만 바뀔 때 같은 bucket을 재사용한다.
  const anchor = allies.find(
    (ally) => ally.charCode > 0 && ally.weaponCode != null && ally.weaponCode > 0
  );
  if (!anchor?.weaponCode) return null;

  return new URLSearchParams({
    format: "tuple",
    character1: String(anchor.charCode),
    weapon1: String(anchor.weaponCode),
  });
}

function isLegacyDetailResponse(
  value: unknown
): value is { results?: TrioWeaponResult[]; error?: string } {
  if (value == null || typeof value !== "object" || !("results" in value)) return false;
  const { results } = value as { results?: unknown };
  return results == null || Array.isArray(results);
}

function rememberDetailBucket(key: string, tuples: CachedTrioWeaponTuple[]) {
  detailBucketMemoryCache.delete(key);
  detailBucketMemoryCache.set(key, tuples);

  while (detailBucketMemoryCache.size > DETAIL_BUCKET_MEMORY_CACHE_LIMIT) {
    const oldestKey = detailBucketMemoryCache.keys().next().value;
    if (oldestKey == null) break;
    detailBucketMemoryCache.delete(oldestKey);
  }
}

async function fetchDetailTupleBucket(params: URLSearchParams): Promise<DetailBucketData> {
  const requestUrl = `/api/stats/trios-weapon?${params.toString()}`;
  const cached = detailBucketMemoryCache.get(requestUrl);
  if (cached) {
    detailBucketMemoryCache.delete(requestUrl);
    detailBucketMemoryCache.set(requestUrl, cached);
    return cached;
  }

  const existingRequest = detailBucketInFlight.get(requestUrl);
  if (existingRequest) return existingRequest;

  // 선택 B가 바뀌어도 같은 A+무기 bucket 요청을 공유한다. 호출부의 cancelled guard가
  // 이전 렌더의 state 반영만 막고, 이미 시작한 저카디널리티 요청은 끝까지 재사용한다.
  const request: Promise<DetailBucketData> = fetchWithRetry<unknown>(requestUrl)
    .then((payload) => {
      // E2E/preview의 기존 object mock과 순차 배포를 위한 호환 경로.
      if (isLegacyDetailResponse(payload)) return payload.results ?? [];

      const tuples = parseTrioWeaponTupleBucket(payload).items;
      rememberDetailBucket(requestUrl, tuples);
      return tuples;
    })
    .finally(() => {
      detailBucketInFlight.delete(requestUrl);
    });

  detailBucketInFlight.set(requestUrl, request);
  return request;
}

async function fetchDetailRows(allies: AllySelection[], signal?: AbortSignal) {
  const tupleParams = buildDetailTupleSearchParams(allies);
  if (tupleParams) {
    const bucket = await fetchDetailTupleBucket(tupleParams);
    if (bucket.length === 0) return [];

    // legacy object 응답에는 tuple(길이 10) 대신 result object가 들어온다.
    if (!Array.isArray(bucket[0])) return bucket as TrioWeaponResult[];

    return filterTrioWeaponTuples(bucket as CachedTrioWeaponTuple[], allies)
      .slice(0, 5000)
      .map(trioWeaponTupleToResult);
  }

  const params = buildLegacyDetailSearchParams(allies);
  const data = await fetchWithRetry<{ results?: TrioWeaponResult[]; error?: string }>(
    `/api/stats/trios-weapon?${params.toString()}`,
    { signal }
  );
  return data.results ?? [];
}

function getGroupWeaponForCharacter(group: GroupedCombo, charCode: number): number | null {
  if (group.character1 === charCode) return group.weaponType1;
  if (group.character2 === charCode) return group.weaponType2;
  if (group.character3 === charCode) return group.weaponType3;
  return null;
}

function buildCoreVariantSearchParams(allies: AllySelection[], group: GroupedCombo) {
  if (allies.length !== 2) return null;
  const queryAllies = sortAllyPair(allies);
  const ally1 = queryAllies[0];
  const ally2 = queryAllies[1];
  const pairWeapon1 = ally1.weaponCode ?? getGroupWeaponForCharacter(group, ally1.charCode);
  const pairWeapon2 = ally2.weaponCode ?? getGroupWeaponForCharacter(group, ally2.charCode);
  if (pairWeapon1 == null || pairWeapon2 == null) return null;

  return new URLSearchParams({
    pairCharacter1: String(ally1.charCode),
    pairWeapon1: String(pairWeapon1),
    pairCharacter2: String(ally2.charCode),
    pairWeapon2: String(pairWeapon2),
    trioCharacter1: String(group.character1),
    trioWeapon1: String(group.weaponType1),
    trioCharacter2: String(group.character2),
    trioWeapon2: String(group.weaponType2),
    trioCharacter3: String(group.character3),
    trioWeapon3: String(group.weaponType3),
  });
}

async function fetchCoreVariantRows(
  allies: AllySelection[],
  group: GroupedCombo,
  signal?: AbortSignal
) {
  const params = buildCoreVariantSearchParams(allies, group);
  if (!params) return group.traitVariants;

  const data = await fetchWithRetry<{ results?: TrioWeaponResult[]; error?: string }>(
    `/api/stats/trios-weapon/core-variants?${params.toString()}`,
    { signal }
  );
  return data.results && data.results.length > 0 ? data.results : group.traitVariants;
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

function buildResultVersion(selectionKey: string, groups: GroupedCombo[]): string {
  let hash = 2166136261;
  const append = (value: string | number) => {
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  };

  append(selectionKey);
  for (const group of groups) {
    append(group.character1);
    append(group.weaponType1);
    append(group.character2);
    append(group.weaponType2);
    append(group.character3);
    append(group.weaponType3);
    append(group.totalGames);
    append(group.winRate);
    append(group.averageRP);
    append(group.averageRank);
  }

  return `${selectionKey}:${groups.length}:${(hash >>> 0).toString(36)}`;
}

export function SynergyDetailResults() {
  "use no memo";
  const { l10n } = useL10n();
  const t = useTranslations("synergyResults");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { focusCharWeapons } = useFocusCharWeapons();
  const selectedAllies = useSelectedAllies();
  const resultAllies = React.useDeferredValue(selectedAllies);
  const setAllies = useSynergyDetailSelection((state) => state.setAllies);

  const resultCharCodes = React.useMemo(() => resultAllies.map((a) => a.charCode), [resultAllies]);

  /**
   * 모바일 탭 지연 해소 핵심:
   * - WeaponAllySelector는 scoped store를 직접 구독해 슬롯/셀을 즉시 갱신한다.
   * - 결과 패널도 최신 선택 snapshot을 구독하지만, fetch와 카드 재조정은
   *   useDeferredValue가 유지하는 이전 snapshot을 사용해 비긴급 경로로 분리한다.
   * - URL은 store와 동기화되지만 결과 렌더의 source of truth로 사용하지 않는다.
   */
  const urlSortBy = React.useMemo(
    () => parseDetailSortByParam(searchParams.get("sort")),
    [searchParams]
  );
  const urlMinimumGames = React.useMemo(
    () => parseMinimumGamesParam(searchParams.get("minGames")),
    [searchParams]
  );
  const [sortBy, setSortBy] = React.useState<SortBy>(urlSortBy);
  const [minimumGames, setMinimumGames] = React.useState(urlMinimumGames);

  React.useEffect(() => setSortBy(urlSortBy), [urlSortBy]);
  React.useEffect(() => setMinimumGames(urlMinimumGames), [urlMinimumGames]);

  const [queryAllies, setQueryAllies] = React.useState<AllySelection[]>(resultAllies);
  const [resultsState, setResultsState] = React.useState<{
    data: TrioWeaponResult[];
    error: unknown;
    loading: boolean;
    queryKey: string;
  }>(() => ({
    data: [],
    error: null,
    loading: resultAllies.length > 0,
    queryKey: "",
  }));
  const [visibleCount, setVisibleCount] = React.useState(VISIBLE_RESULTS_STEP);

  React.useEffect(() => {
    if (resultAllies.length === 0) {
      setQueryAllies([]);
      return;
    }

    const timerId = setTimeout(() => {
      const nextKey = getAllyQueryKey(resultAllies);
      setQueryAllies((prev) => (getAllyQueryKey(prev) === nextKey ? prev : resultAllies));
    }, RESULT_QUERY_DEBOUNCE_MS);

    return () => clearTimeout(timerId);
  }, [resultAllies]);

  React.useEffect(() => {
    if (queryAllies.length === 0) {
      setResultsState({ data: [], error: null, loading: false, queryKey: "" });
      return;
    }

    let cancelled = false;
    const requestKey = getAllyQueryKey(queryAllies);
    const controller = new AbortController();
    setResultsState((prev) => ({ ...prev, error: null, loading: true }));

    fetchDetailRows(queryAllies, controller.signal)
      .then((data) => {
        if (cancelled) return;
        React.startTransition(() => {
          setResultsState({ data, error: null, loading: false, queryKey: requestKey });
        });
      })
      .catch((err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setResultsState({ data: [], error: err, loading: false, queryKey: requestKey });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryAllies]);

  const resultAlliesKey = React.useMemo(() => getAllyQueryKey(resultAllies), [resultAllies]);
  const queryAlliesKey = React.useMemo(() => getAllyQueryKey(queryAllies), [queryAllies]);
  const isQueryAlliesPending = resultAllies.length > 0 && resultAlliesKey !== queryAlliesKey;
  const showLoading = isQueryAlliesPending || resultsState.loading;
  const results = React.useMemo(
    () => (isQueryAlliesPending ? [] : resultsState.data),
    [isQueryAlliesPending, resultsState.data]
  );
  const error = React.useMemo(() => {
    const err = resultsState.error;
    if (!err || resultAllies.length === 0 || isQueryAlliesPending) return null;
    if (err instanceof DOMException && err.name === "TimeoutError") return t("timeout");
    if (err instanceof FetchRetriesExhaustedError) return t("genericError");
    if (err instanceof FetchHttpError) {
      const body = err.body as { error?: string } | null;
      return body?.error ?? t("genericError");
    }
    return err instanceof Error ? err.message : t("genericError");
  }, [resultAllies.length, isQueryAlliesPending, resultsState.error, t]);
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

      if (resultCharCodes.length === 2) {
        const [allyA, allyB] = resultCharCodes;
        const third = members.find((member) => member.c !== allyA && member.c !== allyB);
        return third !== undefined && matchesFocus(third.c, third.w);
      }

      if (resultCharCodes.length === 1) {
        const selected = resultCharCodes[0];
        return members
          .filter((member) => member.c !== selected)
          .some((member) => matchesFocus(member.c, member.w));
      }

      return false;
    },
    [resultCharCodes, focusCharWeapons]
  );

  // Two-level aggregation + focus-priority sorting — deferred 기반
  const recommendations = React.useMemo(() => {
    if (resultAllies.length === 0) return [];

    // Group by character+weapon (Level 1)
    const grouped = groupByCharWeapon(results);
    const filteredBySample =
      minimumGames > 0 ? grouped.filter((group) => group.totalGames >= minimumGames) : grouped;

    // Sort
    if (sortBy === "tierScore") {
      filteredBySample.sort(comparePerformanceTierStats);
    } else if (sortBy === "averageRP") {
      filteredBySample.sort((a, b) => b.averageRP - a.averageRP);
    } else if (sortBy === "winRate") {
      filteredBySample.sort((a, b) => b.winRate - a.winRate);
    } else if (sortBy === "averageRank") {
      filteredBySample.sort((a, b) => a.averageRank - b.averageRank);
    } else {
      filteredBySample.sort((a, b) => b.totalGames - a.totalGames);
    }

    const sampleAwareGroups =
      sortBy === "totalGames"
        ? filteredBySample
        : [
            ...filteredBySample.filter((group) => group.totalGames >= MIN_MEANINGFUL_GAMES),
            ...filteredBySample.filter((group) => group.totalGames < MIN_MEANINGFUL_GAMES),
          ];

    return prioritizeFocusGroups(sampleAwareGroups, resultCharCodes, focusCharWeapons);
  }, [results, resultAllies, resultCharCodes, focusCharWeapons, minimumGames, sortBy]);

  const resultVersion = React.useMemo(
    () => buildResultVersion(resultsState.queryKey, recommendations),
    [resultsState.queryKey, recommendations]
  );

  const visibleResetKey = React.useMemo(() => {
    const allyKey = resultAllies
      .filter((ally): ally is NonNullable<typeof ally> => ally !== null)
      .map((ally) => `${ally.charCode}:${ally.weaponCode ?? 0}`)
      .join("|");
    const focusKey = focusCharWeapons
      .map((focus) => `${focus.charCode}:${focus.weaponCode}`)
      .join("|");
    return `${allyKey}::${focusKey}::${sortBy}::${minimumGames}`;
  }, [resultAllies, focusCharWeapons, minimumGames, sortBy]);

  React.useEffect(() => {
    setVisibleCount(VISIBLE_RESULTS_STEP);
  }, [visibleResetKey]);

  const visibleRecommendations = React.useMemo(
    () => recommendations.slice(0, visibleCount),
    [recommendations, visibleCount]
  );
  const hasMoreRecommendations = visibleRecommendations.length < recommendations.length;
  const [affinityEvidenceByKey, setAffinityEvidenceByKey] = React.useState<
    Record<string, CompositionAffinityEvidence>
  >({});

  React.useEffect(() => {
    if (visibleRecommendations.length === 0) return;

    const combos = visibleRecommendations.map(getGroupAffinityMembers);
    const cachedEntries = combos.flatMap((members) => {
      const key = buildCompositionAffinityKey(members);
      const evidence = affinityEvidenceMemoryCache.get(key);
      return evidence ? ([[key, evidence]] as const) : [];
    });
    if (cachedEntries.length > 0) {
      setAffinityEvidenceByKey((current) => ({
        ...current,
        ...Object.fromEntries(cachedEntries),
      }));
    }

    const missingCombos = combos.filter(
      (members) => !affinityEvidenceMemoryCache.has(buildCompositionAffinityKey(members))
    );
    if (missingCombos.length === 0) return;

    const controller = new AbortController();
    const requestChunks = Array.from({ length: Math.ceil(missingCombos.length / 60) }, (_, index) =>
      missingCombos.slice(index * 60, (index + 1) * 60)
    );
    Promise.all(
      requestChunks.map((combosChunk) =>
        fetchWithRetry<CompositionAffinityBatchResponse>("/api/analysis/composition-affinity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, combos: combosChunk }),
          signal: controller.signal,
          maxRetries: 1,
        })
      )
    )
      .then((responses) => {
        const affinityResults: Record<string, CompositionAffinityEvidence> = Object.assign(
          {},
          ...responses.map((response) => response.results)
        );
        for (const [key, evidence] of Object.entries(affinityResults)) {
          affinityEvidenceMemoryCache.set(key, evidence);
        }
        React.startTransition(() => {
          setAffinityEvidenceByKey((current) => ({ ...current, ...affinityResults }));
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("[synergy-detail] composition affinity request failed", error);
      });

    return () => controller.abort();
  }, [locale, visibleRecommendations]);

  const replaceSearchParams = React.useCallback(
    (params: URLSearchParams) => {
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", nextUrl);
    },
    [pathname]
  );

  const clearAllies = React.useCallback(() => {
    setAllies([null, null]);
    const params = new URLSearchParams(window.location.search);
    ["ally1", "w1", "ally2", "w2", "a", "b"].forEach((key) => params.delete(key));
    replaceSearchParams(params);
  }, [replaceSearchParams, setAllies]);

  const updateSortBy = React.useCallback(
    (nextSortBy: SortBy) => {
      if (nextSortBy === sortBy) return;
      setSortBy(nextSortBy);
      const params = new URLSearchParams(window.location.search);
      params.set("sort", nextSortBy);
      replaceSearchParams(params);
      analytics.synergySortChanged(nextSortBy);
    },
    [replaceSearchParams, sortBy]
  );

  const updateMinimumGames = React.useCallback(
    (nextMinimumGames: number) => {
      if (nextMinimumGames === minimumGames) return;
      setMinimumGames(nextMinimumGames);
      const params = new URLSearchParams(window.location.search);
      if (nextMinimumGames === 0) params.delete("minGames");
      else params.set("minGames", String(nextMinimumGames));
      replaceSearchParams(params);
    },
    [minimumGames, replaceSearchParams]
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
    sortBy: "tierScore",
    explorationDepth: 0,
  });

  React.useEffect(() => {
    if (showLoading || resultAllies.length === 0 || recommendations.length === 0) return;
    const a1 = resultCharCodes[0] ?? null;
    const a2 = resultCharCodes[1] ?? null;
    const allyKey = getAllyQueryKey(resultAllies);
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
  }, [showLoading, recommendations, resultAllies, resultCharCodes, sortBy]);

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
  const recClickStateRef = React.useRef({ resultCharCodes, sortBy });
  React.useEffect(() => {
    recClickStateRef.current = { resultCharCodes, sortBy };
  }, [resultCharCodes, sortBy]);
  const onRecommendationClick = React.useCallback((pickedCode: number, pickedRank: number) => {
    const { resultCharCodes: allies, sortBy: currentSortBy } = recClickStateRef.current;
    funnelStateRef.current.openedDetail = true;
    analytics.synergyRecommendationClicked({
      ally1Code: allies[0] ?? null,
      ally2Code: allies[1] ?? null,
      pickedCode,
      pickedRank,
      sortBy: currentSortBy as SynergySortBy,
    });
  }, []);

  const loadCoreVariants = React.useCallback(
    (group: GroupedCombo, signal?: AbortSignal) =>
      fetchCoreVariantRows(resultAllies, group, signal),
    [resultAllies]
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: visibleRecommendations.length,
    estimateSize: () => VIRTUAL_CARD_ESTIMATE,
    overscan: RESULT_CARD_OVERSCAN,
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

  // measureElement의 ref 콜백과 ResizeObserver가 실제 카드 높이를 갱신한다.
  // 여기서 measure()를 호출하면 펼친 카드의 캐시도 추정치로 초기화되어 다음 카드와 겹칠 수 있다.

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {resultAllies.length > 0 && (
            <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.1rem]">
              {resultCharCodes.length === 1
                ? t("titleSingle", { ally: getCharName(resultCharCodes[0]) })
                : t("titlePair", {
                    ally1: getCharName(resultCharCodes[0]),
                    ally2: getCharName(resultCharCodes[1]),
                  })}
            </h2>
          )}
          {focusCharWeapons.length > 0 && (
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-muted-foreground)]">
              {t("focusFilter", { count: focusCharWeapons.length })}
            </span>
          )}
          {resultAllies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const ally1Code = resultCharCodes[0] ?? null;
                  const ally2Code = resultCharCodes[1] ?? null;
                  const title =
                    resultCharCodes.length === 2
                      ? t("titlePair", {
                          ally1: getCharName(resultCharCodes[0]),
                          ally2: getCharName(resultCharCodes[1]),
                        })
                      : t("titleSingle", { ally: getCharName(resultCharCodes[0]) });
                  const buildShareUrl = (method: "native" | "clipboard") => {
                    return buildSynergyShareUrl(window.location.href, resultCharCodes, method);
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
                aria-label={t("clearAllies")}
                onClick={clearAllies}
                className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-3 w-3" />
                {t("reset")}
              </button>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
          <label className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-[var(--color-muted-foreground)]">
            <span>{t("minimumGames")}</span>
            <select
              aria-label={t("minimumGames")}
              value={minimumGames}
              onChange={(event) => updateMinimumGames(Number(event.target.value))}
              className="min-h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] font-semibold text-[var(--color-foreground)] outline-none focus:border-[var(--color-border-light)]"
            >
              {MINIMUM_GAMES_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? t("allSamples") : t("gamesAtLeast", { count: value })}
                </option>
              ))}
            </select>
          </label>
          <div className="flex w-full items-center gap-1 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5 xl:w-auto">
            {DETAIL_SORT_OPTIONS.map(({ value, labelKey }) => (
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
      </div>

      {/* 결과 목록 */}
      <SectionErrorBoundary sectionName={t("sectionName")}>
        {resultAllies.length === 0 ? (
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
          <div
            data-sr-block
            data-result-version={resultVersion}
            className="synergy-results-compact flex flex-col gap-1.5"
          >
            {resultAllies.length === 1 && (
              <p className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-medium text-[var(--color-muted-foreground)]">
                <Info
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-hover)]"
                  strokeWidth={2.4}
                />
                {t("infoSingle")}
              </p>
            )}
            {resultAllies.length === 2 && (
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
                      selectedCharCodes={resultCharCodes}
                      isFocusPoolCombo={isFocusPoolCombo(group)}
                      loadTraitVariants={loadCoreVariants}
                      onRecommendationClick={onRecommendationClick}
                      affinityEvidence={
                        affinityEvidenceByKey[
                          buildCompositionAffinityKey(getGroupAffinityMembers(group))
                        ]
                      }
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
              {minimumGames > 0
                ? t("emptyMinimumGames", { count: minimumGames })
                : t("emptyNoData")}
            </p>
            <button
              onClick={() => {
                if (minimumGames > 0) updateMinimumGames(0);
                else clearAllies();
              }}
              className="mt-3 text-[12px] font-semibold text-[var(--color-primary-hover)] hover:underline active:opacity-70 min-h-[44px] px-2"
            >
              {minimumGames > 0 ? t("showAllSamples") : t("clearAllies")}
            </button>
          </div>
        )}
      </SectionErrorBoundary>
    </>
  );
}
