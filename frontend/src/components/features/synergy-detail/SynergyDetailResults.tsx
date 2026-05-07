"use client";

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
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
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
  const t = useTranslations("synergyResults");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { focusCharWeapons } = useFocusCharWeapons();

  // URL에서 아군+무기 읽기
  const selectedAllies = React.useMemo(() => {
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
  const MIN_MEANINGFUL_GAMES = 20;

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
  // 첫 paint에는 3 카드만 commit해서 click duration을 짧게 가져가고,
  // 나머지는 requestIdleCallback로 idle frame마다 4장씩 점진 mount.
  // "더보기" 버튼은 사용자 의도가 명확하므로 30 단위 추가.
  // (2026-04-15 INP 개선: 6→3, 6→4 로 조정. CPU 10x throttle 워스트케이스에서 두 번째 탭 click
  //  duration 이 첫 탭의 response-commit frame 에 겹치는 것을 완화.)
  const INITIAL_VISIBLE = 3;
  const IDLE_BATCH = 4;
  const IDLE_TARGET = 30;
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);
  const traitNames = useTraitNames(l10n);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );
  const getWeaponName = React.useCallback((code: number) => resolveWeaponName(code, l10n), [l10n]);
  const getTraitName = React.useCallback((code: number) => traitNames[code] ?? null, [traitNames]);

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
          if (!res.ok) throw new Error(data.error ?? t("genericError"));
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
            setError(t("timeout"));
            return;
          }
          setError(err instanceof Error ? err.message : t("genericError"));
        });
    }, 300);

    setLoading(true);
    setVisibleCount(INITIAL_VISIBLE);
    return () => {
      clearTimeout(timerId);
      controller.abort();
      setLoading(false);
    };
  }, [deferredAllies, sortBy, t]);

  // 점진적 카드 mount — visibleCount를 idle frame마다 6씩 늘려 IDLE_TARGET까지 확장.
  // 사용자 click의 commit이 30개가 아닌 6개만 처리하므로 INP duration이 줄어들고,
  // 이어지는 idle frame에서 나머지 카드가 채워져 사용자가 스크롤하기 전에 mount 완료.
  React.useEffect(() => {
    if (visibleCount >= IDLE_TARGET) return;
    if (results.length === 0) return;
    type IdleId = ReturnType<typeof setTimeout> | number;
    const ric = (cb: () => void): IdleId =>
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(cb, { timeout: 500 })
        : setTimeout(cb, 0);
    const cic = (id: IdleId) => {
      if (typeof cancelIdleCallback === "function" && typeof id === "number") {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id as ReturnType<typeof setTimeout>);
      }
    };
    const id = ric(() => {
      React.startTransition(() => {
        setVisibleCount((c) => Math.min(c + IDLE_BATCH, IDLE_TARGET));
      });
    });
    return () => cic(id);
  }, [visibleCount, results.length]);

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
        const aOk = a.totalGames >= MIN_MEANINGFUL_GAMES && a.averageRP >= 0;
        const bOk = b.totalGames >= MIN_MEANINGFUL_GAMES && b.averageRP >= 0;
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
  }, [results, deferredAllies, deferredCharCodes, focusCharWeapons, sortBy, MIN_MEANINGFUL_GAMES]);

  const clearAllies = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // synergy_result_viewed — 같은 (ally1,ally2,sortBy) 조합은 중복 fire 금지
  const lastViewedKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (showLoading || deferredAllies.length === 0 || recommendations.length === 0) return;
    const a1 = deferredCharCodes[0] ?? null;
    const a2 = deferredCharCodes[1] ?? null;
    const key = `${a1 ?? "_"}|${a2 ?? "_"}|${sortBy}`;
    if (lastViewedKeyRef.current === key) return;
    lastViewedKeyRef.current = key;
    analytics.synergyResultViewed({
      ally1Code: a1,
      ally2Code: a2,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      tier: "",
      patch: "",
      isWeaponScope: true,
    });
  }, [showLoading, recommendations, deferredAllies, deferredCharCodes, sortBy]);

  // synergy_recommendation_clicked — ref-stable 콜백 (ComboWeaponCard memo 보존)
  const recClickStateRef = React.useRef({ deferredCharCodes, sortBy });
  React.useEffect(() => {
    recClickStateRef.current = { deferredCharCodes, sortBy };
  }, [deferredCharCodes, sortBy]);
  const onRecommendationClick = React.useCallback((pickedCode: number, pickedRank: number) => {
    const { deferredCharCodes: allies, sortBy: currentSortBy } = recClickStateRef.current;
    analytics.synergyRecommendationClicked({
      ally1Code: allies[0] ?? null,
      ally2Code: allies[1] ?? null,
      pickedCode,
      pickedRank,
      sortBy: currentSortBy as SynergySortBy,
    });
  }, []);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {selectedAllies.length > 0 && (
            <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[1.1rem]">
              {selectedCharCodes.length === 1
                ? t("titleSingle", { ally: getCharName(selectedCharCodes[0]) })
                : t("titlePair", {
                    ally1: getCharName(selectedCharCodes[0]),
                    ally2: getCharName(selectedCharCodes[1]),
                  })}
            </h2>
          )}
          {focusCharWeapons.length > 0 && (
            <span className="rounded-full border border-[var(--color-accent-purple)]/45 bg-[var(--color-accent-purple)]/16 px-2.5 py-1 text-[11.5px] font-semibold text-[#d8b4fe]">
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
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-medium text-[var(--color-primary-hover)] hover:bg-[var(--color-primary)]/18 transition-colors"
              >
                <Share2 className="h-3 w-3" />
                {copied ? t("copied") : t("share")}
              </button>
              <button
                type="button"
                onClick={clearAllies}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <X className="h-3 w-3" />
                {t("reset")}
              </button>
            </div>
          )}
        </div>

        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-[16px] border border-[var(--color-border-light)] bg-[rgba(8,12,24,0.55)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:w-auto">
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => {
                setSortBy(value);
                analytics.synergySortChanged(value);
              }}
              className={cn(
                "flex min-h-[40px] shrink-0 items-center rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors",
                sortBy === value
                  ? "bg-[var(--color-primary)] text-white shadow-[0_6px_16px_-10px_rgba(96,165,250,0.9)]"
                  : "text-[var(--color-foreground)]/72 hover:text-[var(--color-foreground)] hover:bg-[rgba(255,255,255,0.06)]"
              )}
            >
              {t(`sort.${labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 목록 */}
      <SectionErrorBoundary sectionName={t("sectionName")}>
        {selectedAllies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(96,165,250,0.28)] bg-[linear-gradient(180deg,rgba(96,165,250,0.05),rgba(255,255,255,0.02)_60%)] py-14 px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(96,165,250,0.28)] bg-[rgba(96,165,250,0.12)] text-[var(--color-primary-hover)]">
              <Users className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="text-[15px] font-semibold text-[var(--color-foreground)]/92">
              {t("empty.prompt")}
            </p>
            <ol className="mt-4 flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--color-foreground)]/72">
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-black text-[#d8b4fe]/90">1.</span>
                <span>{t("empty.step1")}</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-black text-[#93c5fd]/90">2.</span>
                <span>{t("empty.step2")}</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-black text-[#fcd34d]/90">3.</span>
                <span>{t("empty.step3")}</span>
              </li>
            </ol>
          </div>
        ) : showLoading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-hover)]" />
              <p className="text-sm font-medium text-[var(--color-foreground)]/82">
                {t("loading")}
              </p>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-3 animate-pulse"
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
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] py-16">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div data-sr-block className="flex flex-col gap-2">
            {selectedAllies.length === 1 && (
              <p className="flex items-center gap-2 rounded-xl border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)] px-3 py-2 text-[12px] font-medium text-[var(--color-foreground)]/82">
                <Info
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-hover)]"
                  strokeWidth={2.4}
                />
                {t("infoSingle")}
              </p>
            )}
            {selectedAllies.length === 2 && (
              <p className="flex items-center gap-2 rounded-xl border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)] px-3 py-2 text-[12px] font-medium text-[var(--color-foreground)]/82">
                <Info
                  className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-hover)]"
                  strokeWidth={2.4}
                />
                {t("infoPair")}
              </p>
            )}
            {recommendations.slice(0, visibleCount).map((group, i) => (
              <ComboWeaponCard
                key={`${group.character1}-${group.weaponType1}-${group.character2}-${group.weaponType2}-${group.character3}-${group.weaponType3}`}
                group={group}
                rank={i + 1}
                getCharName={getCharName}
                getWeaponName={getWeaponName}
                getTraitName={getTraitName}
                selectedCharCodes={deferredCharCodes}
                onRecommendationClick={onRecommendationClick}
              />
            ))}
            {recommendations.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="w-full min-h-[44px] rounded-[18px] border border-[var(--color-border-light)] bg-[rgba(96,165,250,0.06)] py-3 text-[13.5px] font-semibold text-[var(--color-foreground)]/85 hover:text-[var(--color-foreground)] hover:bg-[rgba(96,165,250,0.12)] hover:border-[var(--color-primary)]/35 transition-colors"
              >
                {t("more", { visible: visibleCount, total: recommendations.length })}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.025)] py-14 px-6 text-center">
            <Users
              className="mb-3 h-10 w-10 text-[var(--color-foreground)]/35"
              strokeWidth={1.75}
            />
            <p className="text-[14px] font-medium text-[var(--color-foreground)]/80">
              {focusCharWeapons.length > 0 ? t("emptyFiltered") : t("emptyNoData")}
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
