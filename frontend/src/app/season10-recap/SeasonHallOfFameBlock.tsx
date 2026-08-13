"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getCharacterImageUrl, getCharacterName } from "@/lib/characterMap";
import type {
  PerPatchStat,
  RecapPatchNote,
  RecapEntry,
  SeasonAggregateEntry,
  TierRpTrends,
} from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import type { ChartDatum } from "./SeasonHallOfFameChart";

// recharts 는 ~250KB 크기로 lazy 로드하고, ssr:false 로 차트 마크업을 hydrate 이후 평가한다.
const SeasonHallOfFameChart = dynamic(() => import("./SeasonHallOfFameChart"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-md bg-[var(--color-surface-2)]" />,
});

interface SeasonHallOfFameBlockProps {
  entries: SeasonAggregateEntry[];
  totalPatches: number;
  patches: string[];
  tierRpTrends: TierRpTrends;
}

type RankingTier = "diamondPlus" | "mithrilPlus";

function comboKey(entry: SeasonAggregateEntry): string {
  return `${entry.characterNum}-${entry.bestWeapon}`;
}

export function SeasonHallOfFameBlock({
  entries,
  totalPatches,
  patches,
  tierRpTrends,
}: SeasonHallOfFameBlockProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rankingTier, setRankingTier] = useState<RankingTier>("diamondPlus");
  const rankedEntries = useMemo(
    () =>
      entries
        .flatMap((entry) => {
          const stat = rankingTier === "diamondPlus" ? entry : entry.mithrilPlus;
          return stat ? [{ entry, stat }] : [];
        })
        .sort(
          (a, b) => b.stat.averageRP - a.stat.averageRP || b.stat.totalGames - a.stat.totalGames
        ),
    [entries, rankingTier]
  );

  const changeRankingTier = (tier: RankingTier) => {
    setRankingTier(tier);
    setOpenKey(null);
  };

  return (
    <section id="season-recap-ranking" className="dashboard-panel scroll-mt-24 p-4 lg:scroll-mt-20">
      <div className="flex flex-col gap-4">
        <div className="home-section-header flex flex-col gap-2 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
              시즌 누적
            </p>
            <h2 className="dashboard-section-title mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
              시즌 누적 랭킹
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              선택한 티어의 시즌 전체 평균 RP 기준 순위입니다. 행을 열면 실험체 평균과 전체 평균을
              패치별로 비교할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div
              className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              role="group"
              aria-label="랭킹 정렬 기준"
            >
              <RankingTierButton
                label="다이아+"
                active={rankingTier === "diamondPlus"}
                onClick={() => changeRankingTier("diamondPlus")}
              />
              <RankingTierButton
                label="미스릴+"
                active={rankingTier === "mithrilPlus"}
                onClick={() => changeRankingTier("mithrilPlus")}
              />
            </div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
              {rankingTier === "diamondPlus" ? "다이아+" : "미스릴+"} 표본 · 전체{" "}
              {rankedEntries.length}개 조합
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
          {rankedEntries.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">
              표본 확인 중
            </div>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]/40">
              {rankedEntries.map(({ entry, stat }, index) => {
                const key = comboKey(entry);
                return (
                  <SeasonRow
                    key={key}
                    rank={index + 1}
                    entry={entry}
                    rankingStat={stat}
                    rankingTier={rankingTier}
                    totalPatches={totalPatches}
                    patches={patches}
                    tierRpTrends={tierRpTrends}
                    isOpen={openKey === key}
                    onToggle={() => setOpenKey(openKey === key ? null : key)}
                  />
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function RankingTierButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)] shadow-sm"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      )}
    >
      {label}
    </button>
  );
}

function SeasonRow({
  rank,
  entry,
  rankingStat,
  rankingTier,
  totalPatches,
  patches,
  tierRpTrends,
  isOpen,
  onToggle,
}: {
  rank: number;
  entry: SeasonAggregateEntry;
  rankingStat: RecapEntry;
  rankingTier: RankingTier;
  totalPatches: number;
  patches: string[];
  tierRpTrends: TierRpTrends;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const name = getCharacterName(entry.characterNum);
  const weaponName = entry.bestWeapon > 0 ? resolveWeaponName(entry.bestWeapon) : "통합 집계";
  const imageUrl = getCharacterImageUrl(entry.characterNum);
  const href =
    entry.bestWeapon > 0
      ? `/character/${entry.characterNum}?weapon=${entry.bestWeapon}`
      : `/character/${entry.characterNum}`;
  const isTopRow = rank <= 3;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "group flex w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3",
          isOpen ? "bg-[var(--color-surface)]" : "hover:bg-[var(--color-surface-2)]",
          rank === 1 && !isOpen && "bg-[var(--color-accent-muted)]",
          isTopRow && rank !== 1 && !isOpen && "bg-[var(--color-surface)]"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums sm:h-9 sm:w-9 sm:text-base",
            rank === 1
              ? "border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-accent-foreground)]"
              : isTopRow
                ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
          )}
        >
          {rank}
        </span>

        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)] sm:h-11 sm:w-11">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="44px"
            priority={rank <= 5}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)] sm:text-[0.95rem]">
            {name}
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)] sm:text-xs">
            {weaponName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-muted-foreground)] sm:text-[11px]">
            <span className="tabular-nums">{rankingStat.totalGames.toLocaleString()}게임</span>
            <span>·</span>
            <span className="tabular-nums">승률 {rankingStat.winRate.toFixed(1)}%</span>
            {rankingTier === "diamondPlus" && entry.topAppearances > 0 && (
              <>
                <span>·</span>
                <AppearanceBadge appearances={entry.topAppearances} totalPatches={totalPatches} />
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-base font-semibold tabular-nums sm:text-lg",
              rankingStat.averageRP >= 0
                ? "text-[var(--color-accent-foreground)]"
                : "text-[var(--color-danger)]"
            )}
          >
            {rankingStat.averageRP >= 0 ? "+" : ""}
            {rankingStat.averageRP.toFixed(1)}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            {rankingTier === "diamondPlus" ? "다이아+" : "미스릴+"} 평균 RP
          </p>
        </div>

        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {isOpen && (
        <PatchBreakdown
          entry={entry}
          patches={patches}
          tierRpTrends={tierRpTrends}
          href={href}
          characterName={name}
        />
      )}
    </li>
  );
}

function PatchBreakdown({
  entry,
  patches,
  tierRpTrends,
  href,
  characterName,
}: {
  entry: SeasonAggregateEntry;
  patches: string[];
  tierRpTrends: TierRpTrends;
  href: string;
  characterName: string;
}) {
  return (
    <div className="border-t border-[var(--color-border)]/40 bg-[var(--color-surface)] px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          실험체 평균 RP vs 전체 평균 RP
        </span>
        <Link
          href={href}
          className="text-[11px] font-medium text-[var(--color-foreground)] hover:underline"
        >
          {characterName} 상세 →
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <RpComparisonGraphCard
          label="다이아+ 비교"
          description="막대: 실험체·무기 조합 · 선: 다이아+ 전체"
          patches={patches}
          scope={entry}
          benchmark={tierRpTrends.diamondPlus}
          patchNotes={entry.patchNotes}
        />
        <RpComparisonGraphCard
          label="미스릴+ 비교"
          description="막대: 실험체·무기 조합 · 선: 미스릴+ 전체"
          patches={patches}
          scope={entry.mithrilPlus}
          benchmark={tierRpTrends.mithrilPlus}
          patchNotes={entry.patchNotes}
        />
      </div>
    </div>
  );
}

interface RpScopeData {
  totalGames: number;
  averageRP: number;
  perPatch: PerPatchStat[];
}

function formatRp(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function buildChartData(patches: string[], scope: RpScopeData): ChartDatum[] {
  const byPatch = new Map(scope.perPatch.map((item) => [item.patch, item]));
  return patches.map((patch) => {
    const stat = byPatch.get(patch);
    return stat
      ? {
          patch,
          averageRP: stat.totalGames > 0 ? stat.averageRP : null,
          totalGames: stat.totalGames,
          hasData: stat.totalGames > 0,
        }
      : { patch, averageRP: null, totalGames: 0, hasData: false };
  });
}

function buildComparisonChartData(
  patches: string[],
  scope: RpScopeData,
  benchmark: RpScopeData,
  patchNotes: RecapPatchNote[]
): ChartDatum[] {
  const benchmarkByPatch = new Map(benchmark.perPatch.map((item) => [item.patch, item]));
  const notesByPatch = new Map(patchNotes.map((note) => [note.patch, note.changes]));

  return buildChartData(patches, scope).map((datum) => {
    const benchmarkStat = benchmarkByPatch.get(datum.patch);
    const overallAverageRP =
      benchmarkStat && benchmarkStat.totalGames > 0 ? benchmarkStat.averageRP : null;

    return {
      ...datum,
      overallAverageRP,
      patchChanges: notesByPatch.get(datum.patch) ?? [],
    };
  });
}

function RpComparisonGraphCard({
  label,
  description,
  patches,
  scope,
  benchmark,
  patchNotes,
}: {
  label: string;
  description: string;
  patches: string[];
  scope: RpScopeData | null;
  benchmark: RpScopeData;
  patchNotes: RecapPatchNote[];
}) {
  const difference = scope ? scope.averageRP - benchmark.averageRP : null;

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--color-foreground)]">{label}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">{description}</p>
        </div>
        {scope ? (
          <div className="text-right text-[10px] tabular-nums">
            <p className="font-bold text-[var(--color-accent-foreground)]">
              실험체 {formatRp(scope.averageRP)} RP
            </p>
            <p className="mt-0.5 font-semibold text-[var(--color-warning)]">
              평균 {formatRp(benchmark.averageRP)} RP
            </p>
            <p
              className={cn(
                "mt-0.5 font-bold",
                (difference ?? 0) >= 0
                  ? "text-[var(--color-stat-up)]"
                  : "text-[var(--color-danger)]"
              )}
            >
              차이 {formatRp(difference ?? 0)} RP
            </p>
          </div>
        ) : null}
      </div>

      {scope ? (
        <div className="mt-2 h-[220px] w-full">
          <SeasonHallOfFameChart
            data={buildComparisonChartData(patches, scope, benchmark, patchNotes)}
          />
        </div>
      ) : (
        <div className="mt-2 flex h-[220px] items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
          해당 조합의 미스릴+ 표본 없음
        </div>
      )}
    </div>
  );
}

function AppearanceBadge({
  appearances,
  totalPatches,
}: {
  appearances: number;
  totalPatches: number;
}) {
  const isPerfect = appearances === totalPatches && totalPatches > 0;

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        isPerfect ? "text-[var(--color-stat-up)]" : "text-[var(--color-muted-foreground)]"
      )}
    >
      주요권 {appearances}/{totalPatches}
    </span>
  );
}
