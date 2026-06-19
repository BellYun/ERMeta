"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import * as React from "react";
import { getAllCharacterCodes, getFallbackMap } from "@/components/features/synergy/constants";
import { matchesChosungSearch } from "@/components/features/synergy/utils";
import { useL10n } from "@/components/L10nProvider";
import { VirtualCharacterGrid } from "@/components/ui/VirtualCharacterGrid";
import { usePathname } from "@/i18n/navigation";
import type { RouteLocale } from "@/i18n/routing";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import { resolveWeaponName } from "@/lib/weaponMap";
import { ComboGalleryCard } from "./ComboGalleryCard";
import {
  buildTrioWeaponSearchRequests,
  filterRowsByPool,
  getCharacterWeaponOptions,
} from "./searchRequests";
import {
  mergeApiRowsByComboId,
  SORT_LABELS,
  sortTrioWeaponCombos,
  type ApiTrioWeaponRow,
  type TrioSortBy,
  type TrioWeaponCombo,
} from "./types";
import {
  buildTrioLabQueryString,
  buildTrioLabSearchParams,
  parseTrioLabUrlState,
  type TrioLabUrlState,
} from "./urlState";

interface TrioLabGalleryClientProps {
  initialCombos: TrioWeaponCombo[];
}

const MAX_POOL = 3;
const PAGE_SIZE = 60;
const MIN_MEANINGFUL_GAMES = 10;
const SORT_KEYS = Object.keys(SORT_LABELS) as TrioSortBy[];

const COPY = {
  ko: {
    explore: "조합 탐색",
    slots: "슬롯",
    emptyContext: "캐릭터를 선택하면 조건에 맞는 조합 표본이 표시됩니다",
    oneContext: (label: string) => `${label} 기준으로 함께 쓰인 2인 후보를 집계 중`,
    twoContext: (label: string) => `${label} 기준으로 세 번째 픽 후보를 집계 중`,
    threeContext: (label: string) => `${label} 조합의 무기 후보를 비교 중`,
    clear: "검색 초기화",
    slotLabels: ["캐릭터 선택", "추가 캐릭터", "마지막 캐릭터"],
    remove: (name: string) => `${name} 제거`,
    allWeapons: "전체",
    searchPlaceholder: "캐릭터 검색 (초성 가능: ㅎㅇ)",
    clearSearch: "검색어 지우기",
    loading: "조합 표본 로드 중…",
    comboCount: (visible: number, total: number) => `${visible}/${total}개 조합`,
    sortHint: "평균 RP와 표본 신뢰도를 우선 반영해 정렬합니다.",
    sort: "정렬",
    sortAria: "조합 정렬 기준",
    emptyNoPool: "캐릭터를 선택하면 조건에 맞는 조합 표본이 표시됩니다.",
    emptyWithPool: "조건에 맞는 조합 표본이 없습니다. 선택한 캐릭터나 무기를 조정해보세요.",
    loadError: "조합 데이터를 불러오지 못했습니다.",
    loadMore: (count: number) => `더보기 · ${count}개`,
    sortLabels: SORT_LABELS,
  },
  en: {
    explore: "Team search",
    slots: "slots",
    emptyContext: "Select characters to load matching team samples",
    oneContext: (label: string) => `Loading two-partner samples with ${label}`,
    twoContext: (label: string) => `Loading third-pick candidates for ${label}`,
    threeContext: (label: string) => `Comparing weapon options for ${label}`,
    clear: "Clear search",
    slotLabels: ["Select character", "Add character", "Last character"],
    remove: (name: string) => `Remove ${name}`,
    allWeapons: "All",
    searchPlaceholder: "Search characters",
    clearSearch: "Clear search",
    loading: "Loading team samples…",
    comboCount: (visible: number, total: number) => `${visible}/${total} teams`,
    sortHint: "Sorted with average RP and sample confidence prioritized.",
    sort: "Sort",
    sortAria: "Team sort option",
    emptyNoPool: "Select characters to load matching team samples.",
    emptyWithPool: "No matching team samples. Adjust selected characters or weapons.",
    loadError: "Could not load team data.",
    loadMore: (count: number) => `Load more · ${count}`,
    sortLabels: {
      recommended: "Metric order",
      averageRP: "Average RP",
      winRate: "Win rate",
      averageRank: "Average rank",
      totalGames: "Sample size",
    },
  },
  ja: {
    explore: "編成検索",
    slots: "枠",
    emptyContext: "キャラクターを選ぶと条件に合う編成サンプルを表示します",
    oneContext: (label: string) => `${label} と一緒に使われた2人候補を集計中`,
    twoContext: (label: string) => `${label} 基準で3人目候補を集計中`,
    threeContext: (label: string) => `${label} の武器候補を比較中`,
    clear: "検索をリセット",
    slotLabels: ["キャラクター選択", "追加キャラクター", "最後のキャラクター"],
    remove: (name: string) => `${name}を外す`,
    allWeapons: "すべて",
    searchPlaceholder: "キャラクターを検索",
    clearSearch: "検索語を消去",
    loading: "編成サンプルを読み込み中…",
    comboCount: (visible: number, total: number) => `${visible}/${total}編成`,
    sortHint: "平均RPとサンプル信頼度を優先して並べ替えます。",
    sort: "並び替え",
    sortAria: "編成の並び替え基準",
    emptyNoPool: "キャラクターを選ぶと条件に合う編成サンプルを表示します。",
    emptyWithPool: "条件に合う編成サンプルがありません。キャラクターや武器を調整してください。",
    loadError: "編成データを読み込めませんでした。",
    loadMore: (count: number) => `もっと見る · ${count}`,
    sortLabels: {
      recommended: "指標順",
      averageRP: "平均RP",
      winRate: "勝率",
      averageRank: "平均順位",
      totalGames: "サンプル数",
    },
  },
  "zh-Hans": {
    explore: "阵容搜索",
    slots: "槽位",
    emptyContext: "选择角色后会显示符合条件的阵容样本",
    oneContext: (label: string) => `正在统计与 ${label} 搭配的双人候选`,
    twoContext: (label: string) => `正在统计 ${label} 的第三人候选`,
    threeContext: (label: string) => `正在比较 ${label} 的武器候选`,
    clear: "重置搜索",
    slotLabels: ["选择角色", "添加角色", "最后角色"],
    remove: (name: string) => `移除 ${name}`,
    allWeapons: "全部",
    searchPlaceholder: "搜索角色",
    clearSearch: "清除搜索词",
    loading: "正在加载阵容样本…",
    comboCount: (visible: number, total: number) => `${visible}/${total} 个阵容`,
    sortHint: "优先考虑平均 RP 和样本可信度进行排序。",
    sort: "排序",
    sortAria: "阵容排序条件",
    emptyNoPool: "选择角色后会显示符合条件的阵容样本。",
    emptyWithPool: "没有符合条件的阵容样本。请调整所选角色或武器。",
    loadError: "无法加载阵容数据。",
    loadMore: (count: number) => `查看更多 · ${count}`,
    sortLabels: {
      recommended: "指标排序",
      averageRP: "平均 RP",
      winRate: "胜率",
      averageRank: "平均名次",
      totalGames: "样本数",
    },
  },
  "zh-Hant": {
    explore: "陣容搜尋",
    slots: "欄位",
    emptyContext: "選擇角色後會顯示符合條件的陣容樣本",
    oneContext: (label: string) => `正在統計與 ${label} 搭配的雙人候選`,
    twoContext: (label: string) => `正在統計 ${label} 的第三人候選`,
    threeContext: (label: string) => `正在比較 ${label} 的武器候選`,
    clear: "重設搜尋",
    slotLabels: ["選擇角色", "新增角色", "最後角色"],
    remove: (name: string) => `移除 ${name}`,
    allWeapons: "全部",
    searchPlaceholder: "搜尋角色",
    clearSearch: "清除搜尋字詞",
    loading: "正在載入陣容樣本…",
    comboCount: (visible: number, total: number) => `${visible}/${total} 個陣容`,
    sortHint: "優先考量平均 RP 與樣本可信度進行排序。",
    sort: "排序",
    sortAria: "陣容排序條件",
    emptyNoPool: "選擇角色後會顯示符合條件的陣容樣本。",
    emptyWithPool: "沒有符合條件的陣容樣本。請調整所選角色或武器。",
    loadError: "無法載入陣容資料。",
    loadMore: (count: number) => `查看更多 · ${count}`,
    sortLabels: {
      recommended: "指標排序",
      averageRP: "平均 RP",
      winRate: "勝率",
      averageRank: "平均名次",
      totalGames: "樣本數",
    },
  },
} as const;

function isSameState(a: TrioLabUrlState, b: TrioLabUrlState) {
  return (
    a.sort === b.sort &&
    a.search === b.search &&
    a.pool.length === b.pool.length &&
    a.pool.every((value, index) => value === b.pool[index]) &&
    a.pool.every(
      (character) => (a.weaponFilters[character] ?? 0) === (b.weaponFilters[character] ?? 0)
    )
  );
}

export function TrioLabGalleryClient({ initialCombos }: TrioLabGalleryClientProps) {
  const { l10n } = useL10n();
  const locale = useLocale() as RouteLocale;
  const copy = COPY[locale] ?? COPY.ko;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsState = React.useMemo(() => parseTrioLabUrlState(searchParams), [searchParams]);
  const [currentState, setCurrentState] = React.useState<TrioLabUrlState>(paramsState);
  const { pool, sort, search, weaponFilters } = currentState;

  const [combos, setCombos] = React.useState<TrioWeaponCombo[]>(initialCombos);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const didMountRef = React.useRef(false);

  React.useEffect(() => {
    setCurrentState((prev) => (isSameState(prev, paramsState) ? prev : paramsState));
  }, [paramsState]);

  React.useEffect(() => {
    const id = requestIdleCallback(() => {
      getFallbackMap();
      getAllCharacterCodes();
    });
    return () => cancelIdleCallback(id);
  }, []);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );
  const getWeaponName = React.useCallback((code: number) => resolveWeaponName(code, l10n), [l10n]);

  const poolKey = React.useMemo(() => [...pool].sort((a, b) => a - b).join(","), [pool]);
  const weaponFilterKey = React.useMemo(
    () =>
      [...pool]
        .sort((a, b) => a - b)
        .map((character) => `${character}-${weaponFilters[character] ?? 0}`)
        .join(","),
    [pool, weaponFilters]
  );
  const currentQueryString = React.useMemo(
    () => buildTrioLabQueryString(currentState),
    [currentState]
  );
  const sortedCombos = React.useMemo(() => {
    const sorted = sortTrioWeaponCombos(combos, sort);
    if (sort === "totalGames") return sorted;
    return [
      ...sorted.filter((combo) => combo.totalGames >= MIN_MEANINGFUL_GAMES),
      ...sorted.filter((combo) => combo.totalGames < MIN_MEANINGFUL_GAMES),
    ];
  }, [combos, sort]);
  const visibleCombos = React.useMemo(
    () => sortedCombos.slice(0, visibleCount),
    [sortedCombos, visibleCount]
  );
  const hasMore = visibleCount < sortedCombos.length;
  const selectedLabel = React.useMemo(
    () => pool.map((character) => getCharName(character)).join(" + "),
    [getCharName, pool]
  );
  const recommendationContext =
    pool.length === 0
      ? copy.emptyContext
      : pool.length === 1
        ? copy.oneContext(selectedLabel)
        : pool.length === 2
          ? copy.twoContext(selectedLabel)
          : copy.threeContext(selectedLabel);

  const replaceUrlState = React.useCallback(
    (nextState: TrioLabUrlState) => {
      const nextParams = buildTrioLabSearchParams(nextState, searchParams);
      const normalizedState = parseTrioLabUrlState(nextParams);
      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;

      if (normalizedState.sort !== currentState.sort) {
        setVisibleCount(PAGE_SIZE);
      }
      setCurrentState(normalizedState);
      window.history.replaceState(window.history.state, "", nextUrl);
    },
    [currentState.sort, pathname, searchParams]
  );

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (!poolKey) {
      setCombos([]);
      setVisibleCount(PAGE_SIZE);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const poolCodes = poolKey.split(",").map(Number);
    const requests = buildTrioWeaponSearchRequests(poolCodes, weaponFilters);

    Promise.all(
      requests.map((requestParams) => {
        const params = new URLSearchParams(requestParams);
        return fetch(`/api/stats/trios-weapon?${params.toString()}`, {
          signal: controller.signal,
        }).then((res) => {
          if (!res.ok) throw new Error(`API ${res.status}`);
          return res.json() as Promise<{ results: ApiTrioWeaponRow[] }>;
        });
      })
    )
      .then((responses) => {
        const rows = responses.flatMap((data) => data.results ?? []);
        const filtered = filterRowsByPool(rows, poolCodes, weaponFilters);
        setCombos(mergeApiRowsByComboId(filtered));
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : copy.loadError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [copy.loadError, poolKey, weaponFilterKey, weaponFilters]);

  const toggleCharacter = React.useCallback(
    (code: number) => {
      const nextPool = pool.includes(code)
        ? pool.filter((character) => character !== code)
        : pool.length >= MAX_POOL
          ? pool
          : [...pool, code];

      const nextWeaponFilters = { ...weaponFilters };
      if (pool.includes(code)) delete nextWeaponFilters[code];
      replaceUrlState({ ...currentState, pool: nextPool, weaponFilters: nextWeaponFilters });
    },
    [currentState, pool, replaceUrlState, weaponFilters]
  );

  const removeFromPool = React.useCallback(
    (code: number) => {
      const nextWeaponFilters = { ...weaponFilters };
      delete nextWeaponFilters[code];
      replaceUrlState({
        ...currentState,
        pool: pool.filter((character) => character !== code),
        weaponFilters: nextWeaponFilters,
      });
    },
    [currentState, pool, replaceUrlState, weaponFilters]
  );

  const clearPool = React.useCallback(
    () => replaceUrlState({ ...currentState, pool: [], weaponFilters: {} }),
    [currentState, replaceUrlState]
  );

  const selectWeaponFilter = React.useCallback(
    (character: number, weaponCode: number | null) => {
      const nextWeaponFilters = { ...weaponFilters };
      if (weaponCode == null) {
        delete nextWeaponFilters[character];
      } else {
        nextWeaponFilters[character] = weaponCode;
      }
      replaceUrlState({ ...currentState, weaponFilters: nextWeaponFilters });
    },
    [currentState, replaceUrlState, weaponFilters]
  );

  const deferredSearch = React.useDeferredValue(search);

  const filteredCodes = React.useMemo(() => {
    const all = getAllCharacterCodes();
    if (!deferredSearch.trim()) return all;
    const q = deferredSearch.trim();
    return all.filter((code) => matchesChosungSearch(getCharName(code), q));
  }, [deferredSearch, getCharName]);

  const isSelected = React.useCallback((code: number) => pool.includes(code), [pool]);
  const isDisabled = React.useCallback(
    (code: number) => !pool.includes(code) && pool.length >= MAX_POOL,
    [pool]
  );

  return (
    <>
      <section className="rounded-md border border-[var(--color-border)] bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
            <p className="text-xs font-semibold text-[var(--color-foreground)]">
              {copy.explore} · {pool.length}/{MAX_POOL} {copy.slots}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {recommendationContext}
            </p>
          </div>
          {pool.length > 0 && (
            <button
              type="button"
              onClick={clearPool}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 text-[11px] font-semibold text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3 w-3" strokeWidth={2.4} />
              {copy.clear}
            </button>
          )}
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {Array.from({ length: MAX_POOL }).map((_, idx) => {
            const code = pool[idx];
            if (code == null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="flex min-h-[112px] items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)]/40 px-2 text-center text-[11px] text-[var(--color-muted-foreground)]"
                >
                  {copy.slotLabels[idx]}
                </div>
              );
            }
            const weapons = getCharacterWeaponOptions(code).filter(
              (weapon) => weapon.weaponCode > 0
            );
            const selectedWeapon = weaponFilters[code] ?? null;

            return (
              <div
                key={code}
                className="relative flex min-h-[112px] min-w-0 flex-col gap-2 overflow-hidden rounded-md border border-[var(--color-border)] bg-white p-2"
              >
                <div className="flex min-w-0 items-center gap-2 pr-6">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <Image
                      src={getCharacterMiniWebpUrl(code)}
                      alt={getCharName(code)}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-[var(--color-foreground)]">
                    {getCharName(code)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromPool(code)}
                  aria-label={copy.remove(getCharName(code))}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
                {weapons.length > 1 ? (
                  <div className="mt-auto flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => selectWeaponFilter(code, null)}
                      className={`rounded border px-1.5 py-1 text-[10px] font-semibold ${
                        selectedWeapon == null
                          ? "border-[var(--color-border-light)] bg-white text-[var(--color-foreground)]"
                          : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      {copy.allWeapons}
                    </button>
                    {weapons.map((weapon) => (
                      <button
                        key={`${code}-${weapon.weaponCode}`}
                        type="button"
                        onClick={() => selectWeaponFilter(code, weapon.weaponCode)}
                        className={`rounded border px-1.5 py-1 text-[10px] font-semibold ${
                          selectedWeapon === weapon.weaponCode
                            ? "border-[var(--color-border-light)] bg-white text-[var(--color-foreground)]"
                            : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        }`}
                      >
                        {getWeaponName(weapon.weaponCode)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(event) =>
              replaceUrlState({
                ...currentState,
                search: event.target.value,
              })
            }
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-border-light)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => replaceUrlState({ ...currentState, search: "" })}
              aria-label={copy.clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          )}
        </div>

        <VirtualCharacterGrid
          codes={filteredCodes}
          getCharName={getCharName}
          isSelected={isSelected}
          isDisabled={isDisabled}
          onSelect={toggleCharacter}
          maxHeight="280px"
        />
      </section>

      {loading && (
        <div className="relative h-0.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-muted-foreground)]" />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 text-xs text-[var(--color-muted-foreground)]">
        <div className="min-w-0">
          <p className="truncate">
            {loading ? copy.loading : copy.comboCount(visibleCombos.length, combos.length)}
            {pool.length > 0 && (
              <>
                {" · "}
                <span className="text-[var(--color-foreground)]">{selectedLabel}</span>
              </>
            )}
          </p>
          {pool.length > 0 && (
            <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{copy.sortHint}</p>
          )}
        </div>
        <label className="flex items-center gap-2">
          {copy.sort}
          <select
            value={sort}
            onChange={(event) =>
              replaceUrlState({
                ...currentState,
                sort: event.target.value as TrioSortBy,
              })
            }
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1.5 text-xs font-medium text-[var(--color-foreground)] focus:border-[var(--color-border-light)] focus:outline-none"
            aria-label={copy.sortAria}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {copy.sortLabels[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && combos.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-72 rounded-md bg-[var(--color-surface-3)]"
            />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {pool.length === 0 ? copy.emptyNoPool : copy.emptyWithPool}
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCombos.map((combo, idx) => (
              <ComboGalleryCard
                key={combo.id}
                combo={combo}
                detailHref={`${pathname.replace(/\/$/, "")}/${combo.id}${currentQueryString}`}
                characterOrder={pool}
                rank={idx + 1}
                copyLocale={locale}
                getCharName={getCharName}
                getWeaponName={getWeaponName}
              />
            ))}
          </section>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) => Math.min(count + PAGE_SIZE, sortedCombos.length))
                }
                className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-5 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
              >
                {copy.loadMore(Math.min(PAGE_SIZE, sortedCombos.length - visibleCount))}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
