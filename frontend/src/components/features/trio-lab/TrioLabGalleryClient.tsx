"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { getAllCharacterCodes, getFallbackMap } from "@/components/features/synergy/constants";
import { matchesChosungSearch } from "@/components/features/synergy/utils";
import { useL10n } from "@/components/L10nProvider";
import { VirtualCharacterGrid } from "@/components/ui/VirtualCharacterGrid";
import { usePathname } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
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
        setError(err instanceof Error ? err.message : "조합 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [poolKey, weaponFilterKey, weaponFilters]);

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
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 backdrop-blur-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-xs font-semibold text-[var(--color-foreground)]">
              조합 검색 · {pool.length}/{MAX_POOL} 슬롯
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {pool.length === 0
                ? "캐릭터를 최대 3명까지 채워 trio 조합을 검색하세요"
                : pool.length < MAX_POOL
                  ? `${pool.length}명이 모두 포함된 trio 표시 중`
                  : "선택한 3명의 trio 조합만 표시 중"}
            </p>
          </div>
          {pool.length > 0 && (
            <button
              type="button"
              onClick={clearPool}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 text-[11px] font-semibold text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3 w-3" strokeWidth={2.4} />
              검색 초기화
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
                  className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)]/40 px-2 text-center text-[11px] text-[var(--color-muted-foreground)]"
                >
                  캐릭터 {idx + 1}
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
                className="relative flex min-h-[112px] min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-[rgba(96,165,250,0.36)] bg-[rgba(96,165,250,0.10)] p-2"
              >
                <div className="flex min-w-0 items-center gap-2 pr-6">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
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
                  aria-label={`${getCharName(code)} 제거`}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[rgba(248,113,113,0.12)] hover:text-[var(--color-danger)]"
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
                {weapons.length > 1 ? (
                  <div className="mt-auto flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => selectWeaponFilter(code, null)}
                      className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                        selectedWeapon == null
                          ? "border-[rgba(96,165,250,0.38)] bg-[rgba(96,165,250,0.14)] text-[var(--color-primary-hover)]"
                          : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      전체
                    </button>
                    {weapons.map((weapon) => (
                      <button
                        key={`${code}-${weapon.weaponCode}`}
                        type="button"
                        onClick={() => selectWeaponFilter(code, weapon.weaponCode)}
                        className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                          selectedWeapon === weapon.weaponCode
                            ? "border-[rgba(251,191,36,0.36)] bg-[rgba(251,191,36,0.14)] text-[var(--color-accent-gold)]"
                            : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        }`}
                      >
                        {weapon.label}
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
            placeholder="캐릭터 검색 (초성 가능: ㅎㅇ)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => replaceUrlState({ ...currentState, search: "" })}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
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
          <div className="trio-lab-loader-bar absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-primary)]" />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 text-xs text-[var(--color-muted-foreground)]">
        <p>
          {loading ? "조합 로드 중…" : `${visibleCombos.length}/${combos.length}개 조합`}
          {pool.length > 0 && (
            <>
              {" · 검색 "}
              <span className="text-[var(--color-foreground)]">
                {pool.map((character) => getCharName(character)).join(" + ")}
              </span>
            </>
          )}
        </p>
        <label className="flex items-center gap-2">
          정렬
          <select
            value={sort}
            onChange={(event) =>
              replaceUrlState({
                ...currentState,
                sort: event.target.value as TrioSortBy,
              })
            }
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1.5 text-xs font-medium text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            aria-label="조합 정렬 기준"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && combos.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-72 animate-pulse rounded-2xl bg-[var(--color-surface-3)]"
            />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {pool.length === 0
            ? "캐릭터를 선택하면 조합 목록이 표시됩니다."
            : "조건에 맞는 조합이 없습니다. 검색 슬롯의 캐릭터를 다시 골라보세요."}
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
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              >
                더보기 · {Math.min(PAGE_SIZE, sortedCombos.length - visibleCount)}개
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
