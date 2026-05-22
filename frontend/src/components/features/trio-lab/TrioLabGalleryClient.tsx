"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { getAllCharacterCodes, getFallbackMap } from "@/components/features/synergy/constants";
import { matchesChosungSearch } from "@/components/features/synergy/utils";
import { useL10n } from "@/components/L10nProvider";
import { VirtualCharacterGrid } from "@/components/ui/VirtualCharacterGrid";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import { ComboGalleryCard } from "./ComboGalleryCard";
import {
  apiRowToCombo,
  SORT_LABELS,
  type ApiTrioWeaponRow,
  type TrioSortBy,
  type TrioWeaponCombo,
} from "./types";

interface TrioLabGalleryClientProps {
  initialCombos: TrioWeaponCombo[];
}

const MAX_POOL = 3;
const SORT_KEYS = Object.keys(SORT_LABELS) as TrioSortBy[];

export function TrioLabGalleryClient({ initialCombos }: TrioLabGalleryClientProps) {
  const { l10n } = useL10n();

  // SSOT: React state. URL searchParams 사용 안 함.
  const [pool, setPool] = React.useState<number[]>([]);
  const [sort, setSort] = React.useState<TrioSortBy>("recommended");
  const [search, setSearch] = React.useState("");

  const [combos, setCombos] = React.useState<TrioWeaponCombo[]>(initialCombos);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 캐릭터 맵 워밍업
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

  // pool 멤버 매칭은 전부 client-side. API 는 cache hit 극대화 위해 최저 코드 1명만 필터.
  // pool 순서 무관: [20,3,2] / [3,20,2] / [2,20,3] 모두 같은 cache key (character1=2) 공유.
  const poolKey = React.useMemo(() => [...pool].sort((a, b) => a - b).join(","), [pool]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ sortBy: sort, limit: "300" });
    if (poolKey) {
      const min = Math.min(...poolKey.split(",").map(Number));
      params.set("character1", String(min));
    }

    fetch(`/api/stats/trios-weapon?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((data: { results: ApiTrioWeaponRow[] }) => {
        const rows = data.results ?? [];
        const filtered = !poolKey
          ? rows
          : rows.filter((row) => {
              const chars = new Set([row.character1, row.character2, row.character3]);
              return poolKey
                .split(",")
                .map(Number)
                .every((c) => chars.has(c));
            });
        setCombos(filtered.slice(0, 60).map(apiRowToCombo));
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "조합 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [poolKey, sort]);

  const toggleCharacter = React.useCallback((code: number) => {
    setPool((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_POOL) return prev;
      return [...prev, code];
    });
  }, []);

  const removeFromPool = React.useCallback((code: number) => {
    setPool((prev) => prev.filter((c) => c !== code));
  }, []);

  const clearPool = React.useCallback(() => setPool([]), []);

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
      {/* 조합 검색 패널 */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-3 sm:p-4">
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

        {/* 조합 슬롯 표시 */}
        <div className="mb-3 flex gap-2">
          {Array.from({ length: MAX_POOL }).map((_, idx) => {
            const code = pool[idx];
            if (code == null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="flex h-16 flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)]/40 text-[11px] text-[var(--color-muted-foreground)]"
                >
                  캐릭터 {idx + 1}
                </div>
              );
            }
            return (
              <button
                key={code}
                type="button"
                onClick={() => removeFromPool(code)}
                aria-label={`${getCharName(code)} 제거`}
                className="group relative flex h-16 flex-1 items-center gap-2 overflow-hidden rounded-xl border border-[rgba(96,165,250,0.36)] bg-[rgba(96,165,250,0.10)] px-2 transition-colors hover:bg-[rgba(248,113,113,0.10)]"
              >
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
                <X
                  className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-danger)]"
                  strokeWidth={2.2}
                />
              </button>
            );
          })}
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="캐릭터 검색 (초성 가능: ㅎㅇ)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
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

      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 text-xs text-[var(--color-muted-foreground)]">
        <p>
          {loading ? "조합 로드 중…" : `${combos.length}개 조합`}
          {pool.length > 0 && (
            <>
              {" · 검색 "}
              <span className="text-[var(--color-foreground)]">
                {pool.map((c) => getCharName(c)).join(" + ")}
              </span>
            </>
          )}
        </p>
        <label className="flex items-center gap-2">
          정렬
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as TrioSortBy)}
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

      {error ? (
        <div className="rounded-2xl border border-[var(--color-danger)]/30 bg-[rgba(248,113,113,0.06)] p-6 text-center text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : loading && combos.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-[var(--color-surface-3)]" />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
          조건에 맞는 조합이 없습니다. 검색 슬롯의 캐릭터를 다시 골라보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo, idx) => (
            <ComboGalleryCard key={combo.id} combo={combo} rank={idx + 1} />
          ))}
        </div>
      )}
    </>
  );
}
