"use client";

import { X, Users, Loader2, Info, Share2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharacters } from "@/hooks/useFocusCharacters";
import { analytics, type SynergySortBy } from "@/lib/analytics";
import { resolveCharacterName } from "@/lib/characterMap";
import { isMobileDevice } from "@/lib/device";
import { cn } from "@/lib/utils";
import { getAllCharacterCodes, getFallbackMap, SORT_OPTIONS } from "./constants";
import type { TrioResult, SortBy } from "./types";
import { getThirdCharacter, deduplicateResults } from "./utils";
const ComboCard = React.lazy(() => import("./ComboCard").then((m) => ({ default: m.ComboCard })));

/**
 * 시너지 결과 Island — URL params(ally1,ally2) + localStorage(focusCharacters) 기반
 * SynergyClient에서 분리된 독립 Client Component
 */
export function SynergyResults({ compact = false }: { compact?: boolean }) {
  const { l10n } = useL10n();
  const t = useTranslations("synergyMainResults");
  const searchParams = useSearchParams();
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

  const [sortBy, setSortBy] = React.useState<SortBy>("recommended");
  const [trioResults, setTrioResults] = React.useState<TrioResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );

  // API 호출: 아군 선택 / 정렬 변경 시 (300ms 디바운스 + AbortController)
  React.useEffect(() => {
    if (selectedAllies.length === 0) {
      setTrioResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => {
      const params = new URLSearchParams({ sortBy, limit: "100" });
      if (selectedAllies[0] !== undefined) params.set("character1", String(selectedAllies[0]));
      if (selectedAllies[1] !== undefined) params.set("character2", String(selectedAllies[1]));

      setError(null);
      const timeout = AbortSignal.timeout(10_000);
      const signal = AbortSignal.any([controller.signal, timeout]);

      fetch(`/api/stats/trios?${params.toString()}`, { signal })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? t("genericError"));
          setTrioResults(data.results ?? []);
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return;
          if (err instanceof Error && err.name === "TimeoutError") {
            setError(t("timeout"));
            return;
          }
          setError(err instanceof Error ? err.message : t("genericError"));
        })
        .finally(() => setLoading(false));
    }, 300);

    setLoading(true);
    return () => {
      clearTimeout(timerId);
      controller.abort();
      setLoading(false);
    };
  }, [selectedAllies, sortBy, t]);

  const recommendations = React.useMemo(() => {
    if (selectedAllies.length === 0) return [];

    let scopedResults = trioResults;
    if (focusCharacters.length > 0) {
      const focusSet = new Set(focusCharacters);
      if (selectedAllies.length === 2) {
        const [allyA, allyB] = selectedAllies;
        scopedResults = trioResults.filter((rec) => {
          const third = getThirdCharacter(rec, allyA, allyB);
          return third != null && focusSet.has(third);
        });
      } else if (selectedAllies.length === 1) {
        const selected = selectedAllies[0];
        scopedResults = trioResults.filter((rec) => {
          const others = [rec.character1, rec.character2, rec.character3].filter(
            (c) => c !== selected
          );
          return others.some((c) => focusSet.has(c));
        });
      }
    }

    const deduped = deduplicateResults(scopedResults, selectedAllies, sortBy);
    const sorted =
      sortBy === "recommended"
        ? [
            ...deduped.filter((r) => r.totalGames > 10 && r.averageRP >= 0),
            ...deduped.filter((r) => r.totalGames > 10 && r.averageRP < 0),
            ...deduped.filter((r) => r.totalGames <= 10),
          ]
        : [...deduped.filter((r) => r.averageRP >= 0), ...deduped.filter((r) => r.averageRP < 0)];
    return sorted.slice(0, 20);
  }, [trioResults, selectedAllies, focusCharacters, sortBy]);

  const clearAllies = React.useCallback(() => {
    router.replace("/synergy-detail", { scroll: false });
  }, [router]);

  // synergy_result_viewed — 같은 (ally1,ally2,sortBy) 조합은 중복 fire 금지
  const lastViewedKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (loading || selectedAllies.length === 0 || recommendations.length === 0) return;
    const key = `${selectedAllies[0] ?? "_"}|${selectedAllies[1] ?? "_"}|${sortBy}`;
    if (lastViewedKeyRef.current === key) return;
    lastViewedKeyRef.current = key;
    analytics.synergyResultViewed({
      ally1Code: selectedAllies[0] ?? null,
      ally2Code: selectedAllies[1] ?? null,
      resultCount: recommendations.length,
      sortBy: sortBy as SynergySortBy,
      tier: "",
      patch: "",
      isWeaponScope: false,
    });
  }, [loading, selectedAllies, sortBy, recommendations]);

  return (
    <>
      {/* 정렬 기준 + 헤더 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-1">
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => {
                setSortBy(value);
                analytics.synergySortChanged(value);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                sortBy === value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
              )}
            >
              {t(`sort.${labelKey}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedAllies.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
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
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/50 transition-colors"
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("empty.prompt")}</p>
            <div className="flex flex-col gap-1 mt-3 text-xs text-[var(--color-muted-foreground)]">
              <span>{t("empty.step1")}</span>
              <span>{t("empty.step2")}</span>
              <span>{t("empty.step3")}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">{t("loading")}</p>
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
                {t("infoSingle")}
              </p>
            )}
            <React.Suspense
              fallback={
                <div className="h-64 rounded-xl bg-[var(--color-surface-2)] animate-pulse" />
              }
            >
              {recommendations.map((rec, i) => (
                <ComboCard
                  key={`${rec.character1}-${rec.character2}-${rec.character3}`}
                  rec={rec}
                  rank={i + 1}
                  getCharName={getCharName}
                  selectedAllies={selectedAllies}
                  compact={compact}
                  priorityImages={i < 5}
                  onNavigateAnalysis={(code) => {
                    analytics.synergyRecommendationClicked({
                      ally1Code: selectedAllies[0] ?? null,
                      ally2Code: selectedAllies[1] ?? null,
                      pickedCode: code,
                      pickedRank: i + 1,
                      sortBy: sortBy as SynergySortBy,
                    });
                    router.push(`/character/${code}`);
                  }}
                />
              ))}
            </React.Suspense>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {focusCharacters.length > 0 ? t("emptyFiltered") : t("emptyNoData")}
            </p>
            <button
              onClick={clearAllies}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              {t("clearAllies")}
            </button>
          </div>
        )}
      </SectionErrorBoundary>
    </>
  );
}
