"use client";

import { X, Users, Loader2, Info, Share2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import * as React from "react";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons";
import { analytics } from "@/lib/analytics";
import { resolveCharacterName } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { getAllCharacterCodes, getFallbackMap, SORT_OPTIONS } from "../synergy/constants";
import { ComboWeaponCard, type GroupedCombo } from "./ComboWeaponCard";
import type { TrioWeaponResult, SortBy } from "./types";

/** mainCore 무시하고 캐릭터+무기 기준으로 그룹화 */
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
      totalGames: number;
      totalWins: number;
      totalRP: number;
      rankSum: number;
      variants: TrioWeaponResult[];
    }
  >();

  for (const r of results) {
    const key = `${r.character1}-${r.weaponType1}-${r.character2}-${r.weaponType2}-${r.character3}-${r.weaponType3}`;
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

export function SynergyDetailResults() {
  const { l10n } = useL10n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { focusCharWeapons } = useFocusCharWeapons();

  // URL에서 아군+무기 읽기
  const selectedAllies = React.useMemo(() => {
    const allies: { charCode: number; weaponCode: number | null }[] = [];
    const a1 = searchParams.get("ally1");
    const w1 = searchParams.get("w1");
    if (a1) {
      const code = parseInt(a1, 10);
      if (!isNaN(code) && getAllCharacterCodes().includes(code)) {
        allies.push({ charCode: code, weaponCode: w1 ? parseInt(w1, 10) || null : null });
      }
    }
    const a2 = searchParams.get("ally2");
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

  const [sortBy, setSortBy] = React.useState<SortBy>("recommended");
  const [results, setResults] = React.useState<TrioWeaponResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
  const showLoading = loading || isAllyChangeInFlight;
  const [copied, setCopied] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(30);
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({});

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );
  const getTraitName = React.useCallback((code: number) => traitNames[code] ?? null, [traitNames]);

  // 특성 이름 로드
  React.useEffect(() => {
    fetch("/api/traits/names")
      .then((res) => res.json())
      .then((d) => {
        console.log("[SynergyDetailResults] traitNames:", d.names);
        setTraitNames(d.names ?? {});
      })
      .catch(() => {});
  }, []);

  // API 호출 — deferredAllies 기반 (아군 선택 탭 즉시성 확보)
  React.useEffect(() => {
    if (deferredAllies.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => {
      const params = new URLSearchParams({ sortBy, limit: "200" });
      const a1 = deferredAllies[0];
      if (a1) {
        params.set("character1", String(a1.charCode));
        if (a1.weaponCode) params.set("weapon1", String(a1.weaponCode));
      }
      const a2 = deferredAllies[1];
      if (a2) {
        params.set("character2", String(a2.charCode));
        if (a2.weaponCode) params.set("weapon2", String(a2.weaponCode));
      }

      setError(null);
      const timeout = AbortSignal.timeout(10_000);
      const signal = AbortSignal.any([controller.signal, timeout]);

      fetch(`/api/stats/trios-weapon?${params.toString()}`, { signal })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "API 오류");
          // setResults + setLoading(false)를 같은 startTransition 배치에 넣어
          // "로딩 꺼짐 → 결과 렌더 전" 사이 '결과 없음' 빈 화면이 깜빡이는 것을 방지.
          React.startTransition(() => {
            setResults(data.results ?? []);
            setLoading(false);
          });
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return;
          // 에러 경로는 urgent 유지 — 즉시 에러 메시지 표시
          setLoading(false);
          if (err instanceof Error && err.name === "TimeoutError") {
            setError("요청 시간이 초과되었습니다. 다시 시도해주세요.");
            return;
          }
          setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
        });
    }, 300);

    setLoading(true);
    setVisibleCount(30);
    return () => {
      clearTimeout(timerId);
      controller.abort();
      setLoading(false);
    };
  }, [deferredAllies, sortBy]);

  // Two-level aggregation + filtering — deferred 기반
  const recommendations = React.useMemo(() => {
    if (deferredAllies.length === 0) return [];

    let scopedResults = results;

    // 포커스 캐릭터+무기 풀 필터
    if (focusCharWeapons.length > 0) {
      const matchesFocus = (charCode: number, weaponType: number) =>
        focusCharWeapons.some(
          (f) => f.charCode === charCode && (f.weaponCode === 0 || f.weaponCode === weaponType)
        );

      if (deferredCharCodes.length === 2) {
        const [allyA, allyB] = deferredCharCodes;
        scopedResults = results.filter((rec) => {
          const members = [
            { c: rec.character1, w: rec.weaponType1 },
            { c: rec.character2, w: rec.weaponType2 },
            { c: rec.character3, w: rec.weaponType3 },
          ];
          const third = members.find((m) => m.c !== allyA && m.c !== allyB);
          return third !== undefined && matchesFocus(third.c, third.w);
        });
      } else if (deferredCharCodes.length === 1) {
        const selected = deferredCharCodes[0];
        scopedResults = results.filter((rec) => {
          const members = [
            { c: rec.character1, w: rec.weaponType1 },
            { c: rec.character2, w: rec.weaponType2 },
            { c: rec.character3, w: rec.weaponType3 },
          ];
          const others = members.filter((m) => m.c !== selected);
          return others.some((m) => matchesFocus(m.c, m.w));
        });
      }
    }

    // Group by character+weapon (Level 1)
    const grouped = groupByCharWeapon(scopedResults);

    // Sort
    if (sortBy === "recommended") {
      grouped.sort((a, b) => {
        // 소표본 후순위
        const aOk = a.totalGames > 10 && a.averageRP >= 0;
        const bOk = b.totalGames > 10 && b.averageRP >= 0;
        if (aOk !== bOk) return aOk ? -1 : 1;
        return b.averageRP - a.averageRP;
      });
    } else if (sortBy === "averageRP") {
      grouped.sort((a, b) => b.averageRP - a.averageRP);
    } else if (sortBy === "winRate") {
      grouped.sort((a, b) => b.winRate - a.winRate);
    } else {
      grouped.sort((a, b) => b.totalGames - a.totalGames);
    }

    return grouped;
  }, [results, deferredAllies, deferredCharCodes, focusCharWeapons, sortBy]);

  const clearAllies = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return (
    <>
      {/* 정렬 기준 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setSortBy(value);
                analytics.synergySortChanged(value);
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[44px] flex items-center",
                sortBy === value
                  ? "bg-[var(--color-primary)] text-white active:bg-[var(--color-primary)]/80"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedAllies.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                {selectedCharCodes.length === 1
                  ? `${getCharName(selectedCharCodes[0])} 포함 상세 조합`
                  : `${getCharName(selectedCharCodes[0])} + ${getCharName(selectedCharCodes[1])} 상세 조합`}
                {focusCharWeapons.length > 0 ? ` (내 풀 ${focusCharWeapons.length}명 필터)` : ""}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const url = window.location.href;
                  const title =
                    selectedCharCodes.length === 2
                      ? `${getCharName(selectedCharCodes[0])} + ${getCharName(selectedCharCodes[1])} 상세 조합`
                      : `${getCharName(selectedCharCodes[0])} 포함 상세 조합`;
                  if (typeof navigator.share === "function") {
                    navigator
                      .share({ title, text: `${title} - 이리와지지 ER&GG`, url })
                      .catch(() => {});
                    return;
                  }
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2.5 py-1.5 min-h-[44px] text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 active:bg-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 transition-colors"
              >
                <Share2 className="h-3 w-3" />
                {copied ? "복사됨!" : "공유"}
              </button>
              <button
                type="button"
                onClick={clearAllies}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 min-h-[44px] text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] hover:border-[var(--color-border-light)] active:bg-[var(--color-surface-2)]/80 transition-colors"
              >
                <X className="h-3 w-3" />
                초기화
              </button>
            </>
          )}
        </div>
      </div>

      {/* 결과 목록 */}
      <SectionErrorBoundary sectionName="상세 조합 결과">
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              아군의 픽에 맞춰 무기별 상세 조합을 찾아보세요
            </p>
            <div className="flex flex-col gap-1 mt-3 text-xs text-[var(--color-muted-foreground)]">
              <span>1. 내 캐릭터 풀을 설정하세요 (선택사항)</span>
              <span>2. 아군의 캐릭터와 무기를 선택하세요</span>
              <span>3. 조합을 클릭하면 특성별 성능을 확인할 수 있어요</span>
            </div>
          </div>
        ) : showLoading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">조합 데이터 로딩 중...</p>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 animate-pulse"
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div data-sr-block className="flex flex-col gap-2">
            {selectedAllies.length === 1 && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)] bg-[var(--color-surface-2)] px-3 py-2 rounded-lg">
                <Info className="h-3.5 w-3.5 shrink-0" />
                1명 더 선택하면 더 정확한 추천을 받을 수 있어요 · 조합을 클릭하면 특성별
                브레이크다운을 볼 수 있어요
              </p>
            )}
            {selectedAllies.length === 2 && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)] bg-[var(--color-surface-2)] px-3 py-2 rounded-lg">
                <Info className="h-3.5 w-3.5 shrink-0" />
                조합을 클릭하면 특성별 브레이크다운을 볼 수 있어요
              </p>
            )}
            {recommendations.slice(0, visibleCount).map((group, i) => (
              <ComboWeaponCard
                key={`${group.character1}-${group.weaponType1}-${group.character2}-${group.weaponType2}-${group.character3}-${group.weaponType3}`}
                group={group}
                rank={i + 1}
                getCharName={getCharName}
                getTraitName={getTraitName}
                selectedCharCodes={deferredCharCodes}
              />
            ))}
            {recommendations.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="w-full py-3 min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80 transition-colors"
              >
                더보기 ({visibleCount}/{recommendations.length})
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {focusCharWeapons.length > 0
                ? "내 캐릭터 풀에 해당하는 조합이 없습니다. 캐릭터 풀을 넓혀보세요."
                : "해당 조합 데이터가 없습니다"}
            </p>
            <button
              onClick={clearAllies}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline active:opacity-70 min-h-[44px] px-2"
            >
              아군 초기화하기
            </button>
          </div>
        )}
      </SectionErrorBoundary>
    </>
  );
}
