"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import type {
  CharacterStatsResponse,
  WeaponStatItem,
} from "@/app/api/character/stats/[characterCode]/route";
import { useL10n } from "@/components/L10nProvider";
import { analytics } from "@/lib/analytics";
import { buildFallbackMap, getCharacterImageUrl, resolveCharacterName } from "@/lib/characterMap";
import type { Tier } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { METRICS_TIER_GROUPS, TierGroup } from "@/utils/tier";
import { TierBadge } from "../TierBadge";
import { StatCard, SkeletonCard } from "./StatCard";

const FALLBACK_MAP = buildFallbackMap();

type DisplayStat = CharacterStatsResponse | WeaponStatItem;

interface CharacterHeaderProps {
  selectedCode: number;
  selectedTier: TierGroup;
  setSelectedTier: (tier: TierGroup) => void;
  selectedWeapon: number | null;
  setSelectedWeapon: (weapon: number | null) => void;
  stats: CharacterStatsResponse | null;
  previousStats: CharacterStatsResponse | null;
  displayStat: DisplayStat | null;
  displayPrevStat: DisplayStat | null;
  charTier: Tier | null;
  currentPatch: string | null;
  loading: boolean;
  hasPreviousData: boolean;
}

const TIER_GLOW: Record<string, string> = {
  S: "shadow-[0_0_20px_-6px] shadow-[var(--color-tier-s)]/20",
  A: "shadow-[0_0_16px_-6px] shadow-[var(--color-tier-a)]/15",
};

/** WAI-ARIA Radio Group 키보드 네비게이션 — 화살표/Home/End */
function radioGroupKeyIndex(key: string, index: number, total: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % total;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}

export function CharacterHeader({
  selectedCode,
  selectedTier,
  setSelectedTier,
  selectedWeapon,
  setSelectedWeapon,
  stats,
  previousStats,
  displayStat,
  displayPrevStat,
  charTier,
  currentPatch,
  loading,
  hasPreviousData,
}: CharacterHeaderProps) {
  const { l10n } = useL10n();
  const t = useTranslations("characterHeader");
  const characterName = resolveCharacterName(selectedCode, l10n, FALLBACK_MAP);
  const tierRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const weaponRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const weaponOptions: Array<number | null> = stats?.weapons
    ? [null, ...stats.weapons.map((w) => w.bestWeapon ?? null)]
    : [null];

  const handleTierKey = (e: React.KeyboardEvent, index: number) => {
    const next = radioGroupKeyIndex(e.key, index, METRICS_TIER_GROUPS.length);
    if (next === null) return;
    e.preventDefault();
    const nextTier = METRICS_TIER_GROUPS[next];
    setSelectedTier(nextTier);
    analytics.analysisTierChanged(nextTier);
    tierRefs.current[next]?.focus();
  };

  const handleWeaponKey = (e: React.KeyboardEvent, index: number) => {
    const next = radioGroupKeyIndex(e.key, index, weaponOptions.length);
    if (next === null) return;
    e.preventDefault();
    const nextWeapon = weaponOptions[next];
    setSelectedWeapon(nextWeapon);
    if (nextWeapon != null) {
      analytics.weaponSelected(selectedCode, nextWeapon, resolveWeaponName(nextWeapon));
    }
    weaponRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Character Identity ── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[rgba(17,25,46,0.72)] p-3 sm:rounded-[24px] sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          charTier && TIER_GLOW[charTier]
        )}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/[0.03] via-transparent to-[var(--color-accent-purple)]/[0.02] pointer-events-none" />

        <div className="relative flex items-start gap-3 sm:gap-5">
          {/* Character Image - larger and more prominent */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl bg-[var(--color-surface-2)] ring-2",
                "h-16 w-16 sm:h-24 sm:w-24",
                charTier === "S"
                  ? "ring-[var(--color-tier-s)]/40"
                  : charTier === "A"
                    ? "ring-[var(--color-tier-a)]/30"
                    : "ring-[var(--color-border)]"
              )}
            >
              <Image
                src={getCharacterImageUrl(selectedCode)}
                alt={characterName}
                fill
                className="object-cover"
                sizes="96px"
                priority
                unoptimized
              />
            </div>
            {/* Tier badge overlaid on image corner */}
            {charTier && (
              <div className="absolute -bottom-1.5 -right-1.5">
                <TierBadge tier={charTier} />
              </div>
            )}
          </div>

          {/* Character Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <h2 className="text-[1.1rem] font-black leading-tight tracking-tight text-[var(--color-foreground)] sm:text-2xl">
                {characterName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {currentPatch && (
                  <span className="rounded-md border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[9px] font-medium text-[var(--color-primary)] sm:text-[10px]">
                    {t("patch", { patch: currentPatch })}
                  </span>
                )}
                {displayStat && displayStat.totalGames > 0 && (
                  <span className="rounded-md bg-[var(--color-surface-3)] px-2 py-0.5 text-[9px] text-[var(--color-muted-foreground)] sm:text-[10px]">
                    {t("games", { count: displayStat.totalGames.toLocaleString() })}
                  </span>
                )}
              </div>
            </div>

            {/* Tier selector — WAI-ARIA radiogroup */}
            <div
              role="radiogroup"
              aria-label={t("tierSelectorAria")}
              className="flex w-fit items-center gap-1 rounded-[14px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-1 sm:rounded-[16px]"
            >
              {METRICS_TIER_GROUPS.map((tg, i) => {
                const isSelected = selectedTier === tg;
                return (
                  <button
                    key={tg}
                    ref={(el) => {
                      tierRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => {
                      setSelectedTier(tg);
                      analytics.analysisTierChanged(tg);
                    }}
                    onKeyDown={(e) => handleTierKey(e, i)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[10px] font-medium whitespace-nowrap transition-all sm:rounded-xl sm:px-3 sm:text-[11px]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50",
                      isSelected
                        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-sm"
                        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    {t(`tiers.${tg}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Weapon Selector ── */}
        {!loading && stats?.weapons && stats.weapons.length > 0 && (
          <div className="relative mt-3.5 border-t border-[var(--color-border)]/60 pt-3 sm:mt-4 sm:pt-3.5">
            <span className="absolute -top-2.5 left-3 bg-[rgba(17,25,46,0.92)] px-2 text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              {t("weapon")}
            </span>
            <div
              role="radiogroup"
              aria-label={t("weaponSelectorAria")}
              className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide"
            >
              <button
                ref={(el) => {
                  weaponRefs.current[0] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selectedWeapon == null}
                tabIndex={selectedWeapon == null ? 0 : -1}
                onClick={() => setSelectedWeapon(null)}
                onKeyDown={(e) => handleWeaponKey(e, 0)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-all sm:rounded-xl sm:px-3 sm:text-xs",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50",
                  selectedWeapon == null
                    ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/30"
                )}
              >
                {t("all")}
              </button>
              {stats.weapons.map((w, i) => {
                const isSelected = selectedWeapon === w.bestWeapon;
                const weaponIndex = i + 1;
                return (
                  <button
                    key={w.bestWeapon ?? "none"}
                    ref={(el) => {
                      weaponRefs.current[weaponIndex] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => {
                      setSelectedWeapon(w.bestWeapon ?? null);
                      analytics.weaponSelected(
                        selectedCode,
                        w.bestWeapon ?? 0,
                        resolveWeaponName(w.bestWeapon ?? null, l10n)
                      );
                    }}
                    onKeyDown={(e) => handleWeaponKey(e, weaponIndex)}
                    className={cn(
                      "flex min-w-[88px] shrink-0 flex-col rounded-lg border px-2.5 py-2 text-[11px] transition-all sm:min-w-[96px] sm:rounded-xl sm:px-3 sm:text-xs",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50",
                      isSelected
                        ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="font-medium">
                        {resolveWeaponName(w.bestWeapon ?? null, l10n)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] tabular-nums",
                          isSelected
                            ? "text-[var(--color-primary)]/70"
                            : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {w.pickRate.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1 w-full rounded-full bg-[var(--color-border)]/60"
                      aria-hidden="true"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isSelected
                            ? "bg-[var(--color-primary)]"
                            : "bg-[var(--color-muted-foreground)]/50"
                        )}
                        style={{ width: `${w.pickRate}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : displayStat && displayStat.totalGames > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            label={t("pickRate")}
            value={`${(stats?.pickRate ?? displayStat.pickRate).toFixed(1)}%`}
            sub={
              selectedWeapon != null &&
              displayStat.pickRate !== (stats?.pickRate ?? displayStat.pickRate)
                ? t("weaponSub", { value: displayStat.pickRate.toFixed(1) })
                : undefined
            }
            delta={
              hasPreviousData
                ? (stats?.pickRate ?? displayStat.pickRate) -
                  (previousStats?.pickRate ?? displayPrevStat!.pickRate)
                : undefined
            }
            deltaLabel="%p"
            accent="blue"
          />
          <StatCard
            label={t("winRate")}
            value={`${displayStat.winRate.toFixed(1)}%`}
            delta={hasPreviousData ? displayStat.winRate - displayPrevStat!.winRate : undefined}
            deltaLabel="%p"
            gauge={{ current: displayStat.winRate, expected: 12.5, max: 25 }}
            accent="gold"
          />
          <StatCard
            label={t("averageRank")}
            value={`#${displayStat.averageRank.toFixed(1)}`}
            delta={
              hasPreviousData ? displayStat.averageRank - displayPrevStat!.averageRank : undefined
            }
            deltaInverted
            gauge={{ current: displayStat.averageRank, expected: 4.5, max: 8, inverted: true }}
            accent="purple"
          />
          <StatCard
            label={t("averageRp")}
            value={displayStat.averageRP.toFixed(1)}
            delta={hasPreviousData ? displayStat.averageRP - displayPrevStat!.averageRP : undefined}
            accent="green"
          />
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {currentPatch ? t("emptyPatchData") : t("loadingPatchInfo")}
          </p>
        </div>
      )}
    </div>
  );
}
