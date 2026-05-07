"use client";

import { BarChart2, ChevronRight, FileText, Loader2, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { useL10n } from "@/components/L10nProvider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { TierGroup } from "@/utils/tier";
import { CharacterHeader } from "./CharacterHeader";
import { SynergyPartnersSection } from "./SynergyPartnersSection";
import { assignCharTier, fetchStats } from "./utils";

// 탭 콘텐츠: lazy import (코드 스플릿)
const PatchComparisonTab = React.lazy(() =>
  import("./PatchComparisonTab").then((m) => ({ default: m.PatchComparisonTab }))
);
const PatchLogTab = React.lazy(() =>
  import("./PatchLogTab").then((m) => ({ default: m.PatchLogTab }))
);
const CharacterDetailedAnalyzer = React.lazy(() =>
  import("@/components/character/CharacterDetailedAnalyzer").then((m) => ({
    default: m.CharacterDetailedAnalyzer,
  }))
);

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
    </div>
  );
}

interface CharacterAnalysisClientProps {
  initialPatches?: string[];
  initialStats?: CharacterStatsResponse | null;
  initialPrevStats?: CharacterStatsResponse | null;
  code: number;
}

function readWeaponFromLocation(): number | null {
  if (typeof window === "undefined") return null;

  const rawWeapon = new URL(window.location.href).searchParams.get("weapon");
  if (!rawWeapon) return null;

  const weapon = Number.parseInt(rawWeapon, 10);
  return Number.isFinite(weapon) ? weapon : null;
}

export function CharacterAnalysisClient({
  initialPatches,
  initialStats,
  initialPrevStats,
  code,
}: CharacterAnalysisClientProps) {
  const { l10n } = useL10n();
  const t = useTranslations("characterAnalysis");
  const patches = React.useMemo(() => initialPatches ?? [], [initialPatches]);

  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL);

  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>((): number | null => {
    if (initialStats?.weapons && initialStats.weapons.length > 0) {
      return initialStats.weapons[0].bestWeapon ?? null;
    }
    return null;
  });

  React.useEffect(() => {
    const weapon = readWeaponFromLocation();
    if (weapon != null) {
      setSelectedWeapon(weapon);
    }
  }, [code]);

  // 무기 변경 시 URL 파라미터 동기화
  const handleWeaponChange = React.useCallback((weapon: number | null) => {
    setSelectedWeapon(weapon);
    const url = new URL(window.location.href);
    if (weapon != null) {
      url.searchParams.set("weapon", String(weapon));
    } else {
      url.searchParams.delete("weapon");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>(
    () => {
      if (!patches.length) return [];
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null);
      if (initialStats) initial[0] = initialStats;
      if (initialPrevStats) initial[1] = initialPrevStats;
      return initial;
    }
  );
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(initialStats ?? null);
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(
    initialPrevStats ?? null
  );
  const [loading, setLoading] = React.useState(false);

  // 나머지 패치 데이터 로드 (idle 시)
  React.useEffect(() => {
    if (patches.length <= 2) return;
    const remainingPatches = patches.slice(2);
    const fetchRemaining = () =>
      Promise.all(remainingPatches.map((p) => fetchStats(code, p, selectedTier))).then(
        (restResults) => {
          setAllPatchStats((prev) => {
            const merged = [...prev];
            restResults.forEach((r, i) => {
              merged[i + 2] = r;
            });
            return merged;
          });
        }
      );
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => {
        fetchRemaining();
      });
    } else {
      setTimeout(fetchRemaining, 200);
    }
  }, [patches, code, selectedTier]);

  // 티어 변경 시 데이터 리페치
  React.useEffect(() => {
    if (selectedTier === TierGroup.MITHRIL) {
      // 서버에서 받은 초기 데이터로 복원
      setStats(initialStats ?? null);
      setPreviousStats(initialPrevStats ?? null);
      setAllPatchStats(() => {
        const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null);
        if (initialStats) initial[0] = initialStats;
        if (initialPrevStats) initial[1] = initialPrevStats;
        return initial;
      });
      setSelectedWeapon(readWeaponFromLocation() ?? initialStats?.weapons?.[0]?.bestWeapon ?? null);
      return;
    }

    setLoading(true);
    setStats(null);
    setPreviousStats(null);
    setAllPatchStats([]);
    setSelectedWeapon(null);

    const priorityPatches = patches.slice(0, 2);
    Promise.all(priorityPatches.map((p) => fetchStats(code, p, selectedTier))).then(
      (priorityResults) => {
        const current = priorityResults[0] ?? null;
        setStats(current);
        setPreviousStats(priorityResults[1] ?? null);
        if (current?.weapons && current.weapons.length > 0) {
          setSelectedWeapon(current.weapons[0].bestWeapon ?? null);
        }
        const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null);
        priorityResults.forEach((r, i) => {
          initial[i] = r;
        });
        setAllPatchStats(initial);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier]);

  const currentPatch = patches[0] ?? null;

  const selectedWeaponStat = React.useMemo(() => {
    if (!stats?.weapons || selectedWeapon == null) return null;
    return stats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null;
  }, [stats, selectedWeapon]);

  const prevSelectedWeaponStat = React.useMemo(() => {
    if (!previousStats?.weapons || selectedWeapon == null) return null;
    return previousStats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null;
  }, [previousStats, selectedWeapon]);

  const displayStat = selectedWeaponStat ?? stats;
  const displayPrevStat = prevSelectedWeaponStat ?? previousStats;
  const charTier = displayStat && displayStat.totalGames > 0 ? assignCharTier(displayStat) : null;

  const chartData = React.useMemo(() => {
    return patches
      .map((patch, i) => {
        const s = allPatchStats[i];
        if (!s) return null;
        let winRate: number;
        let averageRP: number;
        if (selectedWeapon != null && s.weapons) {
          const w = s.weapons.find((ws) => ws.bestWeapon === selectedWeapon);
          if (!w || w.totalGames === 0) return null;
          winRate = w.winRate;
          averageRP = w.averageRP;
        } else {
          if (s.totalGames === 0) return null;
          winRate = s.winRate;
          averageRP = s.averageRP;
        }
        return {
          patch,
          winRate: parseFloat(winRate.toFixed(2)),
          averageRP: parseFloat(averageRP.toFixed(1)),
        };
      })
      .filter((d): d is { patch: string; winRate: number; averageRP: number } => d != null)
      .reverse();
  }, [patches, allPatchStats, selectedWeapon]);

  const hasPreviousData = displayPrevStat != null && (displayPrevStat.totalGames ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <CharacterHeader
            selectedCode={code}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            selectedWeapon={selectedWeapon}
            setSelectedWeapon={handleWeaponChange}
            stats={stats}
            previousStats={previousStats}
            displayStat={displayStat}
            displayPrevStat={displayPrevStat}
            charTier={charTier}
            currentPatch={currentPatch}
            loading={loading}
            hasPreviousData={hasPreviousData}
          />
        </section>

        {!loading && displayStat && displayStat.totalGames > 0 && (
          <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <Zap className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
                {t("quickSummary")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Tier */}
              <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-[rgba(255,255,255,0.04)] p-3 sm:rounded-[18px] sm:p-4">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  {t("summary.tier")}
                </span>
                {charTier && (
                  <span
                    className={cn(
                      "text-2xl font-black",
                      charTier === "S"
                        ? "text-[var(--color-tier-s)]"
                        : charTier === "A"
                          ? "text-[var(--color-tier-a)]"
                          : charTier === "B"
                            ? "text-[var(--color-tier-b)]"
                            : charTier === "C"
                              ? "text-[var(--color-tier-c)]"
                              : "text-[var(--color-tier-d)]"
                    )}
                  >
                    {charTier}
                  </span>
                )}
              </div>
              {/* Win Rate */}
              <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-[rgba(255,255,255,0.04)] p-3 sm:rounded-[18px] sm:p-4">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  {t("summary.winRate")}
                </span>
                <span
                  className={cn(
                    "text-2xl font-black tabular-nums",
                    displayStat.winRate > 12.5
                      ? "text-[var(--color-stat-up)]"
                      : "text-[var(--color-stat-down)]"
                  )}
                >
                  {displayStat.winRate.toFixed(1)}%
                </span>
              </div>
              {/* Best Weapon */}
              <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-[rgba(255,255,255,0.04)] p-3 sm:rounded-[18px] sm:p-4">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  {t("summary.recommendedWeapon")}
                </span>
                <span className="text-sm font-bold text-[var(--color-foreground)]">
                  {stats?.weapons?.[0]
                    ? resolveWeaponName(stats.weapons[0].bestWeapon ?? null, l10n)
                    : "\u2014"}
                </span>
              </div>
              {/* Pick Rate */}
              <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-[rgba(255,255,255,0.04)] p-3 sm:rounded-[18px] sm:p-4">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  {t("summary.pickRate")}
                </span>
                <span className="text-2xl font-black tabular-nums text-[var(--color-foreground)]">
                  {(stats?.pickRate ?? displayStat.pickRate).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-stretch sm:mt-4 sm:justify-end">
              <Link
                href={`/synergy-detail?ally1=${code}${selectedWeapon != null ? `&w1=${selectedWeapon}` : ""}`}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary)]/20 sm:min-h-0 sm:w-auto"
              >
                <Users className="h-3.5 w-3.5" />
                {t("synergyCta")}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}

        <SynergyPartnersSection characterCode={code} selectedWeapon={selectedWeapon} />
      </div>

      <div className="pt-0.5 sm:pt-1">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:text-[11px]">
            {t("deepDive")}
          </span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <BarChart2 className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
                {t("patchComparison")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <PatchComparisonTab
                chartData={chartData}
                stats={stats}
                loading={loading}
                selectedCode={code}
              />
            </Suspense>
          </section>

          <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <FileText className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
                {t("patchNotes")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <PatchLogTab patches={patches} selectedCode={code} />
            </Suspense>
          </section>

          <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5 xl:col-span-2">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <BarChart2 className="h-4 w-4 text-[var(--color-accent-gold)]" />
              <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
                {t("stats")}
              </h2>
            </div>
            <Suspense fallback={<TabFallback />}>
              <CharacterDetailedAnalyzer
                characterCode={code}
                tier={selectedTier}
                patchVersion={currentPatch}
                bestWeapon={selectedWeapon}
              />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
