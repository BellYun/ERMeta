"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeaponIconSprite } from "@/components/ui/WeaponIconSprite";
import { getCharacterPatchNote } from "@/data/patch-notes";
import { getWeaponIconSpritePosition } from "@/generated/weaponIconSprite";
import { analytics, type TierGroupEnum } from "@/lib/analytics";
import type { CharacterRole } from "@/lib/characterMap";
import {
  resolveCharacterName,
  buildFallbackMap,
  getVersionedCharacterMiniWebpUrl,
  getComboRoles,
} from "@/lib/characterMap";
import { withCurrentSeoLocale } from "@/lib/localizedPath";
import type { CharacterRankingData, RankingResponse } from "@/lib/ranking";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { TierBadge } from "../TierBadge";
import { DeltaIndicator } from "./DeltaIndicator";
import { PatchNoteTooltip } from "./PatchNoteTooltip";
import { type DisplayRow, type PrevStats } from "./types";
import {
  assignTier,
  computeMetaRankPositions,
  computeMetaScores,
  getMetaRankingKey,
  sortRankingsByMetaScore,
} from "./utils";

function getPatchChangeBadge(patchNote: NonNullable<DisplayRow["patchNote"]>) {
  const types = patchNote.changes.map((change) => change.changeType);

  if (types.length > 0 && types.every((type) => type === "buff")) {
    return {
      label: "버프",
      icon: ArrowUp,
      className:
        "border-[var(--color-stat-up)]/20 bg-[var(--color-stat-up)]/10 text-[var(--color-stat-up)]",
    };
  }

  if (types.length > 0 && types.every((type) => type === "nerf")) {
    return {
      label: "너프",
      icon: ArrowDown,
      className:
        "border-[var(--color-stat-down)]/20 bg-[var(--color-stat-down)]/10 text-[var(--color-stat-down)]",
    };
  }

  return {
    label: "조정",
    icon: ArrowUpDown,
    className:
      "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
  };
}

function RankChangeIndicator({ change }: { change: DisplayRow["rankChange"] }) {
  const t = useTranslations("tierRanking.rankChange");

  if (change === null) return null;

  const isNew = change === "new";
  const isUp = typeof change === "number" && change > 0;
  const isDown = typeof change === "number" && change < 0;
  const label = isNew
    ? t("new")
    : isUp
      ? t("up", { count: change })
      : isDown
        ? t("down", { count: Math.abs(change) })
        : t("unchanged");
  const value = isNew ? "NEW" : isUp ? `▲${change}` : isDown ? `▼${Math.abs(change)}` : "–";

  return (
    <span
      title={label}
      className={cn(
        "font-mono text-[9px] font-semibold leading-none tabular-nums",
        isUp
          ? "text-[var(--color-stat-up)]"
          : isDown
            ? "text-[var(--color-stat-down)]"
            : isNew
              ? "text-[var(--color-accent-gold)]"
              : "text-[var(--color-muted-foreground)]"
      )}
    >
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

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
      prevMap.set(getMetaRankingKey(r), {
        pickRate: prevGrandTotal > 0 ? (r.totalGames / prevGrandTotal) * 100 : 0,
        winRate: r.winRate,
        averageRP: r.averageRP,
      });
    }
  }

  const scores = computeMetaScores(rankings);
  const sorted = sortRankingsByMetaScore(rankings, scores);
  const previousRankPositions = computeMetaRankPositions(previousRankings);
  const hasPreviousRankings = previousRankings.length > 0;

  return sorted.map((r, i) => {
    const rank = i + 1;
    const rankingKey = getMetaRankingKey(r);
    const previousRank = previousRankPositions.get(rankingKey);

    return {
      rank,
      rankChange: !hasPreviousRankings
        ? null
        : previousRank === undefined
          ? "new"
          : previousRank - rank,
      code: r.characterNum,
      roles: getComboRoles(r.characterNum, r.bestWeapon),
      weaponCode: r.bestWeapon,
      hasWeaponIcon: getWeaponIconSpritePosition(r.bestWeapon) !== null,
      name: resolveCharacterName(r.characterNum, l10n, fallbackMap),
      weaponName: resolveWeaponName(r.bestWeapon, l10n),
      imageUrl: getVersionedCharacterMiniWebpUrl(r.characterNum),
      tier: assignTier(scores.get(rankingKey) ?? 0),
      pickRate: r.pickRate,
      winRate: r.winRate,
      averageRP: r.averageRP,
      prev: prevMap.get(rankingKey) ?? null,
      patchNote: getCharacterPatchNote(r.characterNum, currentPatch) ?? null,
    };
  });
}

interface TierRankingTableProps {
  initialData?: RankingResponse;
}

export function TierRankingTable({ initialData }: TierRankingTableProps) {
  const t = useTranslations("tierRanking");
  const [activeRole, setActiveRole] = React.useState<RoleTabValue>(ALL_ROLE);
  const rankingData = initialData ?? null;
  const patch = rankingData?.patchVersion ?? "";
  const matchmakingTier = rankingData?.tier ?? "";
  const isLoading = !initialData;
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("rank");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [showAll, setShowAll] = React.useState(false);
  const DEFAULT_VISIBLE = 20;
  const { l10n } = useL10n();
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

  const rows = React.useMemo(() => {
    if (!rankingData) return [];
    return buildDisplayRows(
      rankingData.rankings,
      rankingData.previousRankings,
      rankingData.patchVersion ?? patch ?? "",
      l10n
    );
  }, [rankingData, l10n, patch]);

  const previousRoleRankPositions = React.useMemo(() => {
    if (!rankingData || activeRole === ALL_ROLE) return null;

    const role = activeRole;
    return computeMetaRankPositions(rankingData.previousRankings, (ranking) =>
      getComboRoles(ranking.characterNum, ranking.bestWeapon).includes(role)
    );
  }, [activeRole, rankingData]);

  const filtered = React.useMemo(() => {
    const roleRankedRows =
      activeRole === ALL_ROLE
        ? rows
        : rows
            .filter((row) => row.roles.includes(activeRole))
            .map((row, index) => {
              const rank = index + 1;
              const previousRank = previousRoleRankPositions?.get(
                getMetaRankingKey({ characterNum: row.code, bestWeapon: row.weaponCode })
              );

              return {
                ...row,
                rank,
                rankChange:
                  rankingData?.previousRankings.length === 0
                    ? null
                    : previousRank === undefined
                      ? "new"
                      : previousRank - rank,
              } satisfies DisplayRow;
            });

    if (sortKey === "rank") {
      return sortDir === "asc" ? roleRankedRows : [...roleRankedRows].reverse();
    }

    return [...roleRankedRows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [activeRole, previousRoleRankPositions, rankingData, rows, sortDir, sortKey]);

  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  React.useEffect(() => {
    setActiveKey(null);
  }, [patch, matchmakingTier, activeRole, sortKey, sortDir, showAll]);

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
      matchmakingTier: matchmakingTier as TierGroupEnum,
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
      <Tabs
        value={activeRole}
        onValueChange={(value) => {
          const nextRole = value as RoleTabValue;
          setActiveRole(nextRole);
          analytics.rankingTierTabChanged(nextRole);
        }}
      >
        <TabsList aria-label={t("columns.character")} className="tier-role-tabs w-full sm:w-auto">
          {roleTabs.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="min-h-11 sm:min-h-10">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Table ── */}
      <div className="tier-ranking-surface">
        {/* Desktop Table */}
        <div className="hidden sm:block">
          <Table className="tier-ranking-table">
            <TableHeader>
              <TableRow className="hover:bg-[var(--color-surface-2)]">
                <SortableHead
                  label="#"
                  sortKey="rank"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-14 text-center"
                />
                <TableHead className="w-12 px-2">{t("columns.tier")}</TableHead>
                <TableHead className="px-2">{t("columns.character")}</TableHead>
                <SortableHead
                  label={t("columns.pickRate")}
                  sortKey="pickRate"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-28 text-left"
                  tooltip={t("tooltips.pickRate")}
                />
                <SortableHead
                  label={t("columns.winRate")}
                  sortKey="winRate"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-28 text-left"
                  tooltip={t("tooltips.winRate")}
                />
                <SortableHead
                  label={t("columns.averageRp")}
                  sortKey="averageRP"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-32 text-left"
                  tooltip={t("tooltips.averageRp")}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[var(--color-border)]/30">
                      <TableCell className="px-3 py-2.5 text-center">
                        <Skeleton className="h-4 w-5 mx-auto" />
                      </TableCell>
                      <TableCell className="px-2 py-2.5">
                        <Skeleton className="h-6 w-6 rounded" />
                      </TableCell>
                      <TableCell className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-left">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-left">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-left">
                        <Skeleton className="h-4 w-14" />
                      </TableCell>
                    </TableRow>
                  ))
                : visible.map((char) => {
                    const key = `${char.code}-${char.weaponCode}`;
                    return (
                      <TableRow
                        key={key}
                        className={cn(
                          "group cursor-pointer border-b border-[var(--color-border)]/35 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]",
                          char.rank <= 3
                            ? "data-table-highlight"
                            : "hover:bg-[var(--color-surface-2)]"
                        )}
                        role="link"
                        tabIndex={0}
                        onClick={() => {
                          navigateToCharacter(char);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigateToCharacter(char);
                          }
                        }}
                        onMouseEnter={() => {
                          if (char.patchNote) setActiveKey(key);
                        }}
                        onMouseLeave={() => {
                          if (char.patchNote) setActiveKey(null);
                        }}
                      >
                        {/* Rank */}
                        <TableCell className="px-3 py-1.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn(
                                "font-mono text-sm font-bold leading-none tabular-nums",
                                char.rank <= 3
                                  ? "text-[var(--color-accent-gold)]"
                                  : "text-[var(--color-muted-foreground)]"
                              )}
                            >
                              {char.rank}
                            </span>
                            <RankChangeIndicator change={char.rankChange} />
                          </div>
                        </TableCell>
                        {/* Tier */}
                        <TableCell className="px-2 py-1.5">
                          <TierBadge tier={char.tier} />
                        </TableCell>
                        {/* Character */}
                        <TableCell className="px-2 py-1.5">
                          <div className="relative flex items-center gap-2.5">
                            <div className="relative h-7 w-7 shrink-0">
                              <span className="absolute inset-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                                <Image
                                  src={char.imageUrl}
                                  alt={char.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  sizes="28px"
                                />
                              </span>
                              {char.patchNote && (
                                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded border border-[var(--color-surface)] bg-[var(--color-muted-foreground)]" />
                              )}
                              {char.hasWeaponIcon ? (
                                <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-4 w-4 place-items-center rounded-full border shadow-sm">
                                  <WeaponIconSprite code={char.weaponCode} size={12} />
                                </span>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-[var(--color-foreground)] truncate block">
                                  {char.name}
                                </span>
                                {char.patchNote &&
                                  (() => {
                                    const badge = getPatchChangeBadge(char.patchNote);
                                    return (
                                      <button
                                        type="button"
                                        aria-label={`${t("patchNoteButton", {
                                          patch: char.patchNote.patch,
                                        })} · ${badge.label}`}
                                        onClick={(e) => togglePatchNote(e, key)}
                                        className={cn(
                                          "relative min-h-7 shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold leading-none after:absolute after:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                                          badge.className
                                        )}
                                      >
                                        {badge.label}
                                      </button>
                                    );
                                  })()}
                              </span>
                              <span className="text-[11px] text-[var(--color-muted-foreground)] truncate block">
                                {char.weaponName}
                              </span>
                            </div>
                            {char.patchNote && activeKey === key && (
                              <PatchNoteTooltip patchNote={char.patchNote} />
                            )}
                          </div>
                        </TableCell>
                        {/* Pick Rate */}
                        <TableCell className="px-3 py-1.5 text-left">
                          <span className="tier-ranking-value">
                            <span>{char.pickRate.toFixed(1)}%</span>
                            <DeltaIndicator
                              current={char.pickRate}
                              previous={char.prev?.pickRate}
                              suffix="p"
                            />
                          </span>
                        </TableCell>
                        {/* Win Rate */}
                        <TableCell className="px-3 py-1.5 text-left">
                          <span className="tier-ranking-value">
                            <span>{char.winRate.toFixed(1)}%</span>
                            <DeltaIndicator
                              current={char.winRate}
                              previous={char.prev?.winRate}
                              suffix="p"
                            />
                          </span>
                        </TableCell>
                        {/* Average RP */}
                        <TableCell className="px-3 py-1.5 text-left">
                          <span className="tier-ranking-value">
                            <span
                              className={cn(
                                char.averageRP >= 0
                                  ? "text-[var(--color-accent-gold)]"
                                  : "text-[var(--color-muted-foreground)]"
                              )}
                            >
                              {char.averageRP >= 0 ? "+" : ""}
                              {char.averageRP.toFixed(1)}
                            </span>
                            <DeltaIndicator
                              current={char.averageRP}
                              previous={char.prev?.averageRP}
                            />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isLoading && visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-[var(--color-muted-foreground)] py-16"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List */}
        <div className="sm:hidden">
          <div className="grid grid-cols-[34px_minmax(0,1.7fr)_48px_48px_60px] items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/72 px-2.5 py-2 text-[9px] font-semibold text-[var(--color-muted-foreground)]">
            <span className="text-center">#</span>
            <span>{t("columns.character")}</span>
            <button
              type="button"
              onClick={() => handleSort("winRate")}
              aria-pressed={sortKey === "winRate"}
              className={cn(
                "min-h-11 whitespace-nowrap text-right",
                sortKey === "winRate"
                  ? "text-[var(--color-accent-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {t("columns.winRate")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("pickRate")}
              aria-pressed={sortKey === "pickRate"}
              className={cn(
                "min-h-11 whitespace-nowrap text-right",
                sortKey === "pickRate"
                  ? "text-[var(--color-accent-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {t("columns.pickRate")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("averageRP")}
              aria-pressed={sortKey === "averageRP"}
              className={cn(
                "min-h-11 whitespace-nowrap text-right",
                sortKey === "averageRP"
                  ? "text-[var(--color-accent-foreground)]"
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
                  className="grid grid-cols-[34px_minmax(0,1.7fr)_48px_48px_60px] items-center gap-1.5 px-2.5 py-2"
                >
                  <Skeleton className="h-4 w-5 shrink-0" />
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Skeleton className="h-5 w-5 rounded shrink-0" />
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <Skeleton className="h-3 w-18" />
                  </div>
                  <Skeleton className="ml-auto h-3 w-9" />
                  <Skeleton className="ml-auto h-3 w-9" />
                  <Skeleton className="ml-auto h-3 w-11" />
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
                    className={cn(
                      "relative grid grid-cols-[34px_minmax(0,1.7fr)_48px_48px_60px] items-center gap-1.5 px-2.5 py-2 cursor-pointer touch-manipulation active:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]",
                      char.rank <= 3 && "data-table-highlight"
                    )}
                    role="link"
                    tabIndex={0}
                    onClick={() => {
                      navigateToCharacter(char);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigateToCharacter(char);
                      }
                    }}
                  >
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-0.5 text-center">
                      <span
                        className={cn(
                          "font-mono text-xs font-bold leading-none tabular-nums",
                          char.rank <= 3
                            ? "text-[var(--color-accent-gold)]"
                            : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {char.rank}
                      </span>
                      <RankChangeIndicator change={char.rankChange} />
                    </div>
                    {/* Tier */}
                    <div className="flex min-w-0 items-center gap-1.5">
                      <TierBadge tier={char.tier} className="text-[10px]" />
                      <div className="relative h-8 w-8 shrink-0">
                        <span className="absolute inset-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                          <Image
                            src={char.imageUrl}
                            alt={char.name}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="32px"
                          />
                        </span>
                        {char.patchNote && (
                          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded border border-[var(--color-surface)] bg-[var(--color-muted-foreground)]" />
                        )}
                        {char.hasWeaponIcon ? (
                          <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-4 w-4 place-items-center rounded-full border shadow-sm">
                            <WeaponIconSprite code={char.weaponCode} size={12} />
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-semibold leading-tight text-[var(--color-foreground)]">
                            {char.name}
                          </p>
                          {char.patchNote &&
                            (() => {
                              const badge = getPatchChangeBadge(char.patchNote);
                              const BadgeIcon = badge.icon;
                              return (
                                <button
                                  type="button"
                                  aria-label={`${t("patchNoteButton", {
                                    patch: char.patchNote.patch,
                                  })} · ${badge.label}`}
                                  onClick={(e) => togglePatchNote(e, key)}
                                  className={cn(
                                    "relative grid h-5 w-5 shrink-0 place-items-center rounded-full border after:absolute after:-inset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                                    badge.className
                                  )}
                                >
                                  <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                                  <span className="sr-only">{badge.label}</span>
                                </button>
                              );
                            })()}
                        </div>
                        <p className="truncate text-[9px] text-[var(--color-muted-foreground)]">
                          {char.weaponName}
                        </p>
                      </div>
                    </div>
                    <span className="text-right font-mono text-[11px] font-medium tabular-nums text-[var(--color-foreground)]">
                      {char.winRate.toFixed(1)}%
                    </span>
                    <span className="text-right font-mono text-[11px] font-medium tabular-nums text-[var(--color-foreground)]">
                      {char.pickRate.toFixed(1)}%
                    </span>
                    <span
                      className={cn(
                        "text-right font-mono text-xs font-semibold tabular-nums",
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
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAll((v) => !v)}
          className="w-full text-xs text-[var(--color-muted-foreground)]"
        >
          {showAll ? t("collapse") : t("showAll", { count: filtered.length })}
        </Button>
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
    <TableHead
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-2", className)}
    >
      <button
        type="button"
        className={cn(
          "group/th inline-flex min-h-10 w-full select-none items-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
          className?.includes("text-right")
            ? "justify-end"
            : className?.includes("text-left")
              ? "justify-start"
              : "justify-center",
          isActive
            ? "text-[var(--color-accent-foreground)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        )}
        onClick={() => onSort(sortKey)}
        aria-label={tooltip ? `${label} — ${tooltip}` : label}
      >
        {label}
        {tooltip && <CircleHelp className="h-3 w-3 shrink-0 opacity-55" aria-hidden="true" />}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown
            className="h-3 w-3 shrink-0 opacity-0 group-hover/th:opacity-45 group-focus-visible/th:opacity-45"
            aria-hidden="true"
          />
        )}
      </button>
    </TableHead>
  );
}
