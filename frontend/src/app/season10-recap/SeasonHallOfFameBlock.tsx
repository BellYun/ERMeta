"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getCharacterImageUrl, getCharacterName } from "@/lib/characterMap";
import type { SeasonAggregateEntry } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import type { ChartDatum } from "./SeasonHallOfFameChart";

// recharts 는 ~250KB 크기로 lazy 로드. PatchBreakdown 은 사용자가 행을 펼쳤을 때만 렌더되므로
// dynamic import 가 자연스럽다. ssr:false 로 차트 마크업이 hydrate 시점에만 평가된다.
const SeasonHallOfFameChart = dynamic(() => import("./SeasonHallOfFameChart"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-md bg-[var(--color-surface-2)]" />,
});

interface SeasonHallOfFameBlockProps {
  entries: SeasonAggregateEntry[];
  totalPatches: number;
  patches: string[];
}

function comboKey(entry: SeasonAggregateEntry): string {
  return `${entry.characterNum}-${entry.bestWeapon}`;
}

export function SeasonHallOfFameBlock({
  entries,
  totalPatches,
  patches,
}: SeasonHallOfFameBlockProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
              시즌 누적
            </p>
            <h2 className="dashboard-section-title mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
              시즌 누적 랭킹
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              시즌 전체 평균 RP 기준 순위입니다. 행을 열면 해당 조합의 패치별 RP 흐름을 확인할 수
              있습니다.
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
            전체 {entries.length}개 조합
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-white">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">
              표본 확인 중
            </div>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]/40">
              {entries.map((entry, index) => {
                const key = comboKey(entry);
                return (
                  <SeasonRow
                    key={key}
                    rank={index + 1}
                    entry={entry}
                    totalPatches={totalPatches}
                    patches={patches}
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

function SeasonRow({
  rank,
  entry,
  totalPatches,
  patches,
  isOpen,
  onToggle,
}: {
  rank: number;
  entry: SeasonAggregateEntry;
  totalPatches: number;
  patches: string[];
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
          isOpen ? "bg-white" : "hover:bg-[var(--color-surface-2)]",
          rank === 1 && !isOpen && "bg-[var(--color-accent-muted)]",
          isTopRow && rank !== 1 && !isOpen && "bg-white"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums sm:h-9 sm:w-9 sm:text-base",
            rank === 1
              ? "border border-[var(--color-accent)] bg-white text-[var(--color-accent-foreground)]"
              : isTopRow
                ? "border border-[var(--color-border)] bg-white text-[var(--color-foreground)]"
                : "border border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
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
            <span className="tabular-nums">{entry.totalGames.toLocaleString()}게임</span>
            <span>·</span>
            <span className="tabular-nums">승률 {entry.winRate.toFixed(1)}%</span>
            {entry.topAppearances > 0 && (
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
              entry.averageRP >= 0
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-danger)]"
            )}
          >
            {entry.averageRP >= 0 ? "+" : ""}
            {entry.averageRP.toFixed(1)}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</p>
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
        <PatchBreakdown entry={entry} patches={patches} href={href} characterName={name} />
      )}
    </li>
  );
}

function PatchBreakdown({
  entry,
  patches,
  href,
  characterName,
}: {
  entry: SeasonAggregateEntry;
  patches: string[];
  href: string;
  characterName: string;
}) {
  const byPatch = new Map(entry.perPatch.map((item) => [item.patch, item]));
  const data: ChartDatum[] = patches.map((patch) => {
    const stat = byPatch.get(patch);
    return stat
      ? {
          patch,
          averageRP: stat.averageRP,
          totalGames: stat.totalGames,
          hasData: true,
        }
      : { patch, averageRP: null, totalGames: 0, hasData: false };
  });

  return (
    <div className="border-t border-[var(--color-border)]/40 bg-white px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          패치별 흐름
        </span>
        <Link
          href={href}
          className="text-[11px] font-medium text-[var(--color-foreground)] hover:underline"
        >
          {characterName} 상세 →
        </Link>
      </div>

      <div className="h-[190px] w-full">
        <SeasonHallOfFameChart data={data} />
      </div>
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
