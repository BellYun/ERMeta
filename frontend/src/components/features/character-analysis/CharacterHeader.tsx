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
import { TierGroup } from "@/utils/tier";
import { TierBadge } from "../TierBadge";
import { StatCard, SkeletonCard } from "./StatCard";

const FALLBACK_MAP = buildFallbackMap();

type DisplayStat = CharacterStatsResponse | WeaponStatItem;

interface CharacterHeaderProps {
  selectedCode: number;
  selectedTier: string;
  setSelectedTier: (tier: string) => void;
  patches: string[];
  selectedPatch: string | null;
  setSelectedPatch: (patch: string) => void;
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
  patches,
  selectedPatch,
  setSelectedPatch,
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

  // 단일 + 누적(+) 옵션 (다이아 / 다이아+ / 메테오 / 메테오+ / 미스릴 이상 / 1000위)
  const tierOptionsList = React.useMemo(
    () => [
      { value: "DIAMOND", label: t("tiers.DIAMOND") },
      { value: "DIAMOND_PLUS", label: `${t("tiers.DIAMOND")}+` },
      { value: "METEORITE", label: t("tiers.METEORITE") },
      { value: "METEORITE_PLUS", label: `${t("tiers.METEORITE")}+` },
      { value: "MITHRIL_PLUS", label: t("tiers.MITHRIL") },
      { value: TierGroup.IN1000, label: t("tiers.IN1000") },
    ],
    [t]
  );

  const weaponOptions: Array<number | null> = stats?.weapons
    ? [null, ...stats.weapons.map((w) => w.bestWeapon ?? null)]
    : [null];

  const handleTierKey = (e: React.KeyboardEvent, index: number) => {
    const next = radioGroupKeyIndex(e.key, index, tierOptionsList.length);
    if (next === null) return;
    e.preventDefault();
    const nextTier = tierOptionsList[next].value;
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
      <div className="metric-card p-3 sm:p-4" data-accent={charTier ? "true" : undefined}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-md border bg-[var(--color-surface-2)] sm:h-24 sm:w-24",
                charTier ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"
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
            {charTier && (
              <div className="absolute -bottom-1.5 -right-1.5">
                <TierBadge tier={charTier} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <h2 className="dashboard-section-title text-[1.15rem] font-bold leading-tight text-[var(--color-foreground)] sm:text-xl">
                {characterName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {currentPatch && (
                  <span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("patch", { patch: currentPatch })}
                  </span>
                )}
                {displayStat && displayStat.totalGames > 0 && (
                  <span className="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                    {t("games", { count: displayStat.totalGames.toLocaleString() })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="radiogroup"
                aria-label={t("tierSelectorAria")}
                className="flex w-fit items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1"
              >
                {tierOptionsList.map((opt, i) => {
                  const isSelected = selectedTier === opt.value;
                  return (
                    <button
                      key={opt.value}
                      ref={(el) => {
                        tierRefs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => {
                        setSelectedTier(opt.value);
                        analytics.analysisTierChanged(opt.value);
                      }}
                      onKeyDown={(e) => handleTierKey(e, i)}
                      className={cn(
                        "dashboard-tab min-h-[30px] whitespace-nowrap px-2.5 py-1.5 text-[10px] sm:px-3 sm:text-[11px]"
                      )}
                      data-active={isSelected ? "true" : undefined}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {patches.length > 0 && (
                <label className="flex min-h-[34px] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 text-[10px] font-medium text-[var(--color-muted-foreground)] sm:text-[11px]">
                  <span>패치</span>
                  <select
                    value={selectedPatch ?? patches[0]}
                    onChange={(event) => setSelectedPatch(event.target.value)}
                    className="bg-transparent text-[var(--color-foreground)] outline-none"
                  >
                    {patches.map((patch) => (
                      <option key={patch} value={patch} className="bg-[var(--color-surface)]">
                        {patch}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>

        {!loading && stats?.weapons && stats.weapons.length > 0 && (
          <div className="mt-3.5 border-t border-[var(--color-border)] pt-3 sm:mt-4">
            <span className="mb-2 block text-[10px] font-medium text-[var(--color-muted-foreground)]">
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
                  "dashboard-tab shrink-0 gap-1.5 px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs"
                )}
                data-active={selectedWeapon == null ? "true" : undefined}
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
                      "dashboard-tab min-w-[88px] shrink-0 flex-col px-2.5 py-2 text-[11px] sm:min-w-[96px] sm:px-3 sm:text-xs"
                    )}
                    data-active={isSelected ? "true" : undefined}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="font-medium">
                        {resolveWeaponName(w.bestWeapon ?? null, l10n)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] tabular-nums",
                          isSelected
                            ? "text-[var(--color-accent-foreground)]"
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
                          "h-full rounded-full",
                          isSelected
                            ? "bg-[var(--color-accent)]"
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
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {currentPatch ? t("emptyPatchData") : t("loadingPatchInfo")}
          </p>
        </div>
      )}
    </div>
  );
}
