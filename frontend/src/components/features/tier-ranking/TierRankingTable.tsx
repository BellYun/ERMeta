"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { getCharacterPatchNote } from "@/data/patch-notes";
import { analytics, type TierGroupEnum } from "@/lib/analytics";
import type { CharacterRole } from "@/lib/characterMap";
import {
  resolveCharacterName,
  buildFallbackMap,
  getCharacterImageUrl,
  getComboRoles,
} from "@/lib/characterMap";
import { withCurrentSeoLocale } from "@/lib/localizedPath";
import type { CharacterRankingData, RankingResponse } from "@/lib/ranking";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { useFilter } from "../FilterContext";
import { TierBadge } from "../TierBadge";
import { PatchNoteTooltip } from "./PatchNoteTooltip";
import type { PrevStats, DisplayRow } from "./types";
import { computeMetaScores, assignTier } from "./utils";

const fallbackMap = buildFallbackMap();
const ALL_ROLE = "all" as const;
type RoleTabValue = typeof ALL_ROLE | CharacterRole;

type SortKey = "rank" | "pickRate" | "winRate" | "averageRP";
type SortDir = "asc" | "desc";

function buildDisplayRows(
  rankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[],
  currentPatch: string,
  l10n: Map<string, string>
): DisplayRow[] {
  const prevMap = new Map<number, PrevStats>();
  if (previousRankings.length > 0) {
    const prevGrandTotal = previousRankings.reduce((s, r) => s + r.totalGames, 0);
    for (const r of previousRankings) {
      prevMap.set(r.characterNum, {
        pickRate: prevGrandTotal > 0 ? (r.totalGames / prevGrandTotal) * 100 : 0,
        winRate: r.winRate,
        averageRP: r.averageRP,
      });
    }
  }

  const scores = computeMetaScores(rankings);
  const sorted = [...rankings].sort((a, b) => {
    const sa = scores.get(a.characterNum * 1000 + a.bestWeapon) ?? 0;
    const sb = scores.get(b.characterNum * 1000 + b.bestWeapon) ?? 0;
    return sb - sa;
  });

  return sorted.map((r, i) => ({
    rank: i + 1,
    code: r.characterNum,
    roles: getComboRoles(r.characterNum, r.bestWeapon),
    weaponCode: r.bestWeapon,
    name: resolveCharacterName(r.characterNum, l10n, fallbackMap),
    weaponName: resolveWeaponName(r.bestWeapon, l10n),
    imageUrl: getCharacterImageUrl(r.characterNum),
    tier: assignTier(scores.get(r.characterNum * 1000 + r.bestWeapon) ?? 0),
    pickRate: r.pickRate,
    winRate: r.winRate,
    averageRP: r.averageRP,
    prev: prevMap.get(r.characterNum) ?? null,
    patchNote: getCharacterPatchNote(r.characterNum, currentPatch) ?? null,
  }));
}

interface TierRankingTableProps {
  initialData?: RankingResponse;
}

export function TierRankingTable({ initialData }: TierRankingTableProps) {
  const { patch, tier } = useFilter();
  const t = useTranslations("tierRanking");
  const [activeRole, setActiveRole] = React.useState<RoleTabValue>(ALL_ROLE);
  const [rankingData, setRankingData] = React.useState<RankingResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("rank");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [showAll, setShowAll] = React.useState(false);
  const DEFAULT_VISIBLE = 20;
  const { l10n } = useL10n();
  const isInitialRender = React.useRef(true);
  const pathname = usePathname();
  const router = useRouter();
  const roleTabs = React.useMemo(
    () => [
      { value: ALL_ROLE, label: t("roles.all") },
      { value: "탱커" as const, label: t("roles.tank") },
      { value: "전사" as const, label: t("roles.fighter") },
      { value: "암살자" as const, label: t("roles.assassin") },
      { value: "스킬딜러" as const, label: t("roles.skillAmp") },
      { value: "원거리 딜러" as const, label: t("roles.ranged") },
      { value: "지원가" as const, label: t("roles.support") },
    ],
    [t]
  );

  React.useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      if (initialData) return;
    }

    setIsLoading(true);
    const params = new URLSearchParams();
    if (patch) params.set("patchVersion", patch);
    params.set("tier", tier);

    fetch(`/api/character/mithril-rp-ranking?${params}`)
      .then((res) => res.json())
      .then((data: RankingResponse) => setRankingData(data))
      .catch(() => setRankingData(null))
      .finally(() => setIsLoading(false));
  }, [patch, tier]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = React.useMemo(() => {
    if (!rankingData) return [];
    return buildDisplayRows(
      rankingData.rankings,
      rankingData.previousRankings,
      rankingData.patchVersion ?? patch ?? "",
      l10n
    );
  }, [rankingData, l10n, patch]);

  const filtered = React.useMemo(() => {
    const base =
      activeRole === ALL_ROLE
        ? rows
        : rows.filter((c) => c.roles.includes(activeRole as CharacterRole));

    if (sortKey === "rank") {
      return sortDir === "asc" ? base : [...base].reverse();
    }

    return [...base].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [rows, activeRole, sortKey, sortDir]);

  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  React.useEffect(() => {
    setActiveKey(null);
  }, [patch, tier, activeRole, sortKey, sortDir, showAll]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  };

  const navigateToCharacter = (char: DisplayRow) => {
    analytics.rankingCharacterClicked({
      characterCode: char.code,
      characterName: char.name,
      rank: char.rank,
      tier: char.tier ?? "",
      patch: patch ?? "",
      matchmakingTier: tier as TierGroupEnum,
    });
    router.push(
      withCurrentSeoLocale(pathname, `/character/${char.code}?weapon=${char.weaponCode}`)
    );
  };

  const togglePatchNote = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    e.stopPropagation();
    setActiveKey((current) => (current === key ? null : key));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Role Filter ── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {roleTabs.map(({ value, label }) => (
          <button
            key={value}
            className="role-pill shrink-0"
            data-active={activeRole === value}
            onClick={() => {
              setActiveRole(value);
              analytics.rankingTierTabChanged(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50">
                <SortableHead
                  label="#"
                  sortKey="rank"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-14 text-center"
                />
                <th className="px-2 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] w-12">
                  {t("columns.tier")}
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)]">
                  {t("columns.character")}
                </th>
                <SortableHead
                  label={t("columns.pickRate")}
                  sortKey="pickRate"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-28 text-right"
                  tooltip={t("tooltips.pickRate")}
                />
                <SortableHead
                  label={t("columns.winRate")}
                  sortKey="winRate"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-28 text-right"
                  tooltip={t("tooltips.winRate")}
                />
                <SortableHead
                  label={t("columns.averageRp")}
                  sortKey="averageRP"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-32 text-right"
                  tooltip={t("tooltips.averageRp")}
                />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]/30">
                      <td className="px-3 py-2.5 text-center">
                        <Skeleton className="h-4 w-5 mx-auto" />
                      </td>
                      <td className="px-2 py-2.5">
                        <Skeleton className="h-6 w-6 rounded" />
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                    </tr>
                  ))
                : visible.map((char) => {
                    const key = `${char.code}-${char.weaponCode}`;
                    return (
                      <tr
                        key={key}
                        className={cn(
                          "border-b border-[var(--color-border)]/30 last:border-b-0 cursor-pointer group transition-colors",
                          "hover:bg-[var(--color-surface-2)]"
                        )}
                        onClick={() => {
                          navigateToCharacter(char);
                        }}
                        onMouseEnter={() => {
                          if (char.patchNote) setActiveKey(key);
                        }}
                        onMouseLeave={() => {
                          if (char.patchNote) setActiveKey(null);
                        }}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              char.rank <= 3
                                ? "text-[var(--color-accent-gold)]"
                                : "text-[var(--color-muted-foreground)]"
                            )}
                          >
                            {char.rank}
                          </span>
                        </td>
                        {/* Tier */}
                        <td className="px-2 py-2">
                          <TierBadge tier={char.tier} />
                        </td>
                        {/* Character */}
                        <td className="px-2 py-2">
                          <div className="relative flex items-center gap-2.5">
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                              <Image
                                src={char.imageUrl}
                                alt={char.name}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                              {char.patchNote && (
                                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors truncate block">
                                  {char.name}
                                </span>
                                {char.patchNote && (
                                  <button
                                    type="button"
                                    aria-label={t("patchNoteButton", {
                                      patch: char.patchNote.patch,
                                    })}
                                    onClick={(e) => togglePatchNote(e, key)}
                                    className="shrink-0 rounded-md border border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.1)] px-1.5 py-0.5 text-[9px] font-black tracking-[0.08em] text-[var(--color-primary)] transition-colors hover:bg-[rgba(96,165,250,0.16)]"
                                  >
                                    PATCH
                                  </button>
                                )}
                              </span>
                              <span className="text-[11px] text-[var(--color-muted-foreground)] truncate block">
                                {char.weaponName}
                              </span>
                            </div>
                            {char.patchNote && activeKey === key && (
                              <PatchNoteTooltip patchNote={char.patchNote} />
                            )}
                          </div>
                        </td>
                        {/* Pick Rate */}
                        <td className="px-3 py-2 text-right">
                          <span className="text-sm tabular-nums text-[var(--color-foreground)]">
                            {char.pickRate.toFixed(1)}%
                          </span>
                        </td>
                        {/* Win Rate */}
                        <td className="px-3 py-2 text-right">
                          <span className="text-sm font-medium tabular-nums text-[var(--color-foreground)]">
                            {char.winRate.toFixed(1)}%
                          </span>
                        </td>
                        {/* Average RP */}
                        <td className="px-3 py-2 text-right">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              char.averageRP >= 0
                                ? "text-[var(--color-accent-gold)]"
                                : "text-[var(--color-muted-foreground)]"
                            )}
                          >
                            {char.averageRP >= 0 ? "+" : ""}
                            {char.averageRP.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-sm text-[var(--color-muted-foreground)] py-16"
                  >
                    {t("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="sm:hidden">
          <div className="grid grid-cols-[34px_minmax(0,1.45fr)_56px_56px_72px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/55 px-3 py-3 text-[11px] font-medium text-[var(--color-muted-foreground)]">
            <span className="text-center">#</span>
            <span>{t("columns.character")}</span>
            <button
              type="button"
              onClick={() => handleSort("winRate")}
              className={cn(
                "text-right transition-colors",
                sortKey === "winRate"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {t("columns.winRate")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("pickRate")}
              className={cn(
                "text-right transition-colors",
                sortKey === "pickRate"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {t("columns.pickRate")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("averageRP")}
              className={cn(
                "text-right transition-colors",
                sortKey === "averageRP"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {t("sort.averageRP")}
            </button>
          </div>

          {/* Mobile rows */}
          <div className="divide-y divide-[var(--color-border)]/30">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[34px_minmax(0,1.45fr)_56px_56px_72px] items-center gap-2 px-3 py-3"
                >
                  <Skeleton className="h-4 w-5 shrink-0" />
                  <div className="flex min-w-0 items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="ml-auto h-3.5 w-10" />
                  <Skeleton className="ml-auto h-3.5 w-10" />
                  <Skeleton className="ml-auto h-3.5 w-12" />
                </div>
              ))
            ) : visible.length === 0 ? (
              <div className="text-center text-sm text-[var(--color-muted-foreground)] py-12">
                {t("empty")}
              </div>
            ) : (
              visible.map((char) => {
                const key = `${char.code}-${char.weaponCode}`;
                return (
                  <div
                    key={key}
                    className="relative grid grid-cols-[34px_minmax(0,1.45fr)_56px_56px_72px] items-center gap-2 px-3 py-3 cursor-pointer active:bg-[var(--color-surface-2)] touch-manipulation transition-colors"
                    onClick={() => {
                      navigateToCharacter(char);
                    }}
                  >
                    {/* Rank */}
                    <span
                      className={cn(
                        "w-6 text-center text-[1.1rem] font-black tabular-nums",
                        char.rank <= 3
                          ? "text-[var(--color-accent-gold)]"
                          : "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      {char.rank}
                    </span>
                    {/* Tier */}
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TierBadge tier={char.tier} />
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                        <Image
                          src={char.imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                        {char.patchNote && (
                          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[0.95rem] font-semibold leading-tight text-[var(--color-foreground)]">
                            {char.name}
                          </p>
                          {char.patchNote && (
                            <button
                              type="button"
                              aria-label={t("patchNoteButton", { patch: char.patchNote.patch })}
                              onClick={(e) => togglePatchNote(e, key)}
                              className="shrink-0 rounded-md border border-[rgba(96,165,250,0.28)] bg-[rgba(96,165,250,0.1)] px-1.5 py-0.5 text-[9px] font-black tracking-[0.08em] text-[var(--color-primary)]"
                            >
                              PATCH
                            </button>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                          {char.weaponName}
                        </p>
                      </div>
                    </div>
                    <span className="text-right text-[0.95rem] font-medium tabular-nums text-[var(--color-foreground)]">
                      {char.winRate.toFixed(1)}%
                    </span>
                    <span className="text-right text-[0.95rem] font-medium tabular-nums text-[var(--color-foreground)]">
                      {char.pickRate.toFixed(1)}%
                    </span>
                    <span
                      className={cn(
                        "text-right text-[1rem] font-semibold tabular-nums",
                        char.averageRP >= 0
                          ? "text-[var(--color-accent-gold)]"
                          : "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      {char.averageRP >= 0 ? "+" : ""}
                      {char.averageRP.toFixed(1)}
                    </span>
                    {char.patchNote && activeKey === key && (
                      <PatchNoteTooltip patchNote={char.patchNote} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 전체 보기 토글 ── */}
      {!isLoading && hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          {showAll ? t("collapse") : t("showAll", { count: filtered.length })}
        </button>
      )}
    </div>
  );
}

/* ─── Sortable Table Header ─── */

function SortableHead({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
  tooltip,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  tooltip?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-xs font-medium select-none cursor-pointer transition-colors group/th",
        isActive
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {tooltip && (
          <span className="relative group/tip">
            <svg
              className="w-3 h-3 opacity-40 group-hover/tip:opacity-80 transition-opacity cursor-help"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1 1 0 110 2 1 1 0 010-2zM6.5 7h2v4.5h-2V7z" />
            </svg>
            <span className="fixed hidden group-hover/tip:block px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[10px] text-[var(--color-foreground)] font-normal whitespace-nowrap shadow-lg z-[9999] -translate-x-1/2 mt-1">
              {tooltip}
            </span>
          </span>
        )}
        <SortIcon active={isActive} dir={dir} />
      </span>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={cn(
        "w-3 h-3 transition-all",
        active ? "opacity-100" : "opacity-0 group-hover/th:opacity-40"
      )}
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      {(!active || dir === "asc") && (
        <path d="M6 2L9 5.5H3L6 2Z" opacity={active && dir === "asc" ? 1 : 0.3} />
      )}
      {(!active || dir === "desc") && (
        <path d="M6 10L3 6.5H9L6 10Z" opacity={active && dir === "desc" ? 1 : 0.3} />
      )}
    </svg>
  );
}
