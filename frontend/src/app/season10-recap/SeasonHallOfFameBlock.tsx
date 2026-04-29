"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCharacterImageUrl, getCharacterName } from "@/lib/characterMap";
import type { SeasonAggregateEntry } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]/88">
              Season Board
            </p>
            <h2 className="mt-2 text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.7rem]">
              시즌 누적 랭킹
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              시즌 전체 평균 RP 기준 순위입니다. 행을 열면 해당 조합의 패치별 RP 흐름을 바로 볼 수
              있습니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
            전체 {entries.length}개 조합
          </span>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)]">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">
              데이터 없음
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
          "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3",
          isOpen ? "bg-[rgba(255,255,255,0.05)]" : "hover:bg-[rgba(255,255,255,0.04)]",
          isTopRow && !isOpen && "bg-[rgba(251,191,36,0.04)]"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums sm:h-9 sm:w-9 sm:text-base",
            rank === 1
              ? "bg-[rgba(251,191,36,0.18)] text-[var(--color-accent-gold)]"
              : isTopRow
                ? "bg-[rgba(96,165,250,0.16)] text-[var(--color-primary)]"
                : "bg-[rgba(255,255,255,0.06)] text-[var(--color-muted-foreground)]"
          )}
        >
          {rank}
        </span>

        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-2)] sm:h-11 sm:w-11">
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
              "text-base font-black tabular-nums sm:text-lg",
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
            "h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform",
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

interface ChartDatum {
  patch: string;
  averageRP: number | null;
  totalGames: number;
  hasData: boolean;
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
    <div className="border-t border-[var(--color-border)]/40 bg-[rgba(255,255,255,0.03)] px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Patch Breakdown
        </span>
        <Link
          href={href}
          className="text-[11px] font-medium text-[var(--color-primary)] hover:underline"
        >
          {characterName} 상세 →
        </Link>
      </div>

      <div className="h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="patch"
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeOpacity={0.6} />
            <Tooltip content={<RPTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
            <Bar dataKey="averageRP" radius={[4, 4, 0, 0]}>
              {data.map((datum) => (
                <Cell
                  key={datum.patch}
                  fill={
                    !datum.hasData
                      ? "var(--color-border)"
                      : (datum.averageRP ?? 0) >= 0
                        ? "var(--color-accent-gold)"
                        : "var(--color-danger)"
                  }
                  fillOpacity={datum.hasData ? 0.86 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RPTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.96)] px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[var(--color-foreground)]">{datum.patch} 패치</p>
      {datum.hasData ? (
        <>
          <p
            className={cn(
              "mt-1 text-xs font-bold tabular-nums",
              (datum.averageRP ?? 0) >= 0
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-danger)]"
            )}
          >
            평균 RP {(datum.averageRP ?? 0) >= 0 ? "+" : ""}
            {(datum.averageRP ?? 0).toFixed(1)}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
            {datum.totalGames.toLocaleString()}게임
          </p>
        </>
      ) : (
        <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">데이터 없음</p>
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
        isPerfect ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
      )}
    >
      TOP 5 {appearances}/{totalPatches}
    </span>
  );
}
