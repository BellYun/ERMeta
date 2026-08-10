"use client";

import { useState } from "react";
import type { RoleAggregate, RoleStatsByTier, TierRpTrends } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";

interface RoleStrengthBlockProps {
  roleStatsByTier: RoleStatsByTier;
  patches: string[];
  benchmarks: TierRpTrends;
}

type RoleTier = keyof RoleStatsByTier;

export function RoleStrengthBlock({
  roleStatsByTier,
  patches,
  benchmarks,
}: RoleStrengthBlockProps) {
  const [roleTier, setRoleTier] = useState<RoleTier>("diamondPlus");
  const roleStats = roleStatsByTier[roleTier];
  const benchmark = benchmarks[roleTier];
  const tierLabel = roleTier === "diamondPlus" ? "다이아+" : "미스릴+";

  if (
    patches.length === 0 ||
    (roleStatsByTier.diamondPlus.length === 0 && roleStatsByTier.mithrilPlus.length === 0)
  ) {
    return null;
  }

  const benchmarkByPatch = new Map(benchmark.perPatch.map((stat) => [stat.patch, stat]));

  const allValues: number[] = [];
  const allDifferences: number[] = [];
  for (const row of roleStats) {
    for (const { patch, stat } of row.perPatch) {
      if (stat) {
        allValues.push(stat.averageRP);
        const patchBenchmark = benchmarkByPatch.get(patch);
        if (patchBenchmark) allDifferences.push(stat.averageRP - patchBenchmark.averageRP);
      }
    }
    if (row.season) {
      allValues.push(row.season.averageRP);
      allDifferences.push(row.season.averageRP - benchmark.averageRP);
    }
  }
  const maxAbs = Math.max(...allValues.map((value) => Math.abs(value)), 1);
  const maxAbsDifference = Math.max(...allDifferences.map((value) => Math.abs(value)), 0.1);

  const seasonRows = roleStats.filter((row) => row.season != null) as Array<
    RoleAggregate & { season: NonNullable<RoleAggregate["season"]> }
  >;
  const seasonSorted = [...seasonRows].sort((a, b) => b.season.averageRP - a.season.averageRP);
  const strongestRole = seasonSorted[0] ?? null;
  const weakestRole = seasonSorted[seasonSorted.length - 1] ?? null;
  const seasonMaxAbs = Math.max(...seasonRows.map((row) => Math.abs(row.season.averageRP)), 1);

  return (
    <section id="season-recap-roles" className="dashboard-panel scroll-mt-24 p-4 lg:scroll-mt-20">
      <div className="flex flex-col gap-4">
        <div className="home-section-header flex flex-col gap-2 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
              직업군 흐름
            </p>
            <h2 className="dashboard-section-title mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
              직업군별 평균 RP
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              멀티롤 조합은 해당 직업군에 모두 반영했습니다. 시즌 전체 흐름과 패치별 평균 RP를 함께
              정리했습니다.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div
              className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              role="group"
              aria-label="직업군 통계 티어"
            >
              <RoleTierButton
                label="다이아+"
                active={roleTier === "diamondPlus"}
                onClick={() => setRoleTier("diamondPlus")}
              />
              <RoleTierButton
                label="미스릴+"
                active={roleTier === "mithrilPlus"}
                onClick={() => setRoleTier("mithrilPlus")}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)] sm:justify-end">
              <span>{tierLabel} 표본</span>
              <span>패치 {patches.length}개</span>
              <span>배경색은 {tierLabel} 평균 대비</span>
              <span>오른쪽 열은 시즌 평균</span>
            </div>
          </div>
        </div>

        {(strongestRole || weakestRole) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {strongestRole && (
              <SummaryCard
                label="시즌 최고 평균 RP"
                role={strongestRole.role}
                value={strongestRole.season.averageRP}
              />
            )}
            {weakestRole && (
              <SummaryCard
                label="시즌 최저 평균 RP"
                role={weakestRole.role}
                value={weakestRole.season.averageRP}
              />
            )}
          </div>
        )}

        {seasonSorted.length > 0 ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  시즌 평균 RP 획득량
                </h3>
                <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                  0 RP를 기준으로 막대가 길수록 경기당 획득·손실 폭이 큽니다.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                평균 RP 높은 순
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {seasonSorted.map((row, index) => (
                <SeasonRoleBar
                  key={row.role}
                  rank={index + 1}
                  role={row.role}
                  stat={row.season}
                  maxAbs={seasonMaxAbs}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
          <div className="overflow-x-auto pb-2 overscroll-x-contain">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-xs tabular-nums sm:min-w-[940px] sm:text-sm xl:min-w-[1040px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)]">
                  <th className="sticky left-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                    직업군
                  </th>
                  {patches.map((patch) => (
                    <th
                      key={patch}
                      className="border-b border-[var(--color-border)] px-2 py-2.5 text-center text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]"
                    >
                      {patch}
                    </th>
                  ))}
                  <th className="border-b border-l border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-3 py-2.5 text-center text-[10px] font-bold uppercase text-[var(--color-accent-foreground)]">
                    시즌
                  </th>
                </tr>
              </thead>
              <tbody>
                {roleStats.map(({ role, perPatch, season }) => (
                  <tr key={role}>
                    <th className="sticky left-0 z-10 border-b border-[var(--color-border)]/30 bg-[var(--color-surface)] px-3 py-2.5 text-left font-semibold text-[var(--color-foreground)]">
                      {role}
                    </th>
                    {perPatch.map(({ patch, stat }) => (
                      <RoleCell
                        key={patch}
                        stat={stat}
                        maxAbs={maxAbs}
                        maxAbsDifference={maxAbsDifference}
                        benchmarkAverageRP={benchmarkByPatch.get(patch)?.averageRP ?? null}
                      />
                    ))}
                    <RoleCell
                      stat={season}
                      maxAbs={maxAbs}
                      maxAbsDifference={maxAbsDifference}
                      benchmarkAverageRP={benchmark.averageRP}
                      isSeason
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleTierButton({
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

function SummaryCard({ label, role, value }: { label: string; role: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <div className="metric-card px-4 py-3" data-accent={isPositive ? "true" : undefined}>
      <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-lg font-bold text-[var(--color-foreground)]">{role}</p>
        <p
          className={cn(
            "text-lg font-semibold tabular-nums",
            isPositive ? "text-[var(--color-accent-foreground)]" : "text-[var(--color-danger)]"
          )}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(1)}
        </p>
      </div>
    </div>
  );
}

function SeasonRoleBar({
  rank,
  role,
  stat,
  maxAbs,
}: {
  rank: number;
  role: string;
  stat: { totalGames: number; averageRP: number };
  maxAbs: number;
}) {
  const isPositive = stat.averageRP >= 0;
  const width = stat.averageRP === 0 ? 0 : Math.max((Math.abs(stat.averageRP) / maxAbs) * 50, 1.5);

  return (
    <div className="grid grid-cols-[82px_minmax(130px,1fr)_78px] items-center gap-3 sm:grid-cols-[110px_minmax(180px,1fr)_110px]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-4 text-right text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          {rank}
        </span>
        <span className="truncate text-xs font-bold text-[var(--color-foreground)] sm:text-sm">
          {role}
        </span>
      </div>

      <div className="relative h-6 overflow-hidden rounded bg-[var(--color-surface-2)]">
        <span className="absolute inset-y-0 left-1/2 z-10 w-px bg-[var(--color-muted-foreground)]/45" />
        <span
          className={cn(
            "absolute inset-y-1 rounded-sm",
            isPositive ? "bg-[var(--color-success)]/75" : "bg-[var(--color-danger)]/75"
          )}
          style={
            isPositive ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }
          }
        />
      </div>

      <div className="text-right">
        <p className="text-xs font-bold tabular-nums text-[var(--color-foreground)] sm:text-sm">
          {stat.averageRP >= 0 ? "+" : ""}
          {stat.averageRP.toFixed(1)} RP
        </p>
        <p className="mt-0.5 text-[9px] tabular-nums text-[var(--color-muted-foreground)]">
          {stat.totalGames.toLocaleString()}게임
        </p>
      </div>
    </div>
  );
}

function RoleCell({
  stat,
  maxAbs,
  maxAbsDifference,
  benchmarkAverageRP,
  isSeason = false,
}: {
  stat: { totalGames: number; averageRP: number } | null;
  maxAbs: number;
  maxAbsDifference: number;
  benchmarkAverageRP: number | null;
  isSeason?: boolean;
}) {
  if (!stat) {
    return (
      <td
        className={cn(
          "border-b border-[var(--color-border)]/30 px-2 py-2.5 text-center text-[var(--color-muted-foreground)]/40",
          isSeason && "border-l border-[var(--color-border)]"
        )}
      >
        —
      </td>
    );
  }

  const intensity = Math.min(Math.abs(stat.averageRP) / maxAbs, 1);
  const isPositive = stat.averageRP >= 0;
  const difference = benchmarkAverageRP == null ? null : stat.averageRP - benchmarkAverageRP;
  const differenceIntensity =
    difference == null ? 0 : Math.min(Math.abs(difference) / maxAbsDifference, 1);
  const backgroundColor =
    difference == null || difference === 0
      ? undefined
      : difference > 0
        ? `rgba(21, 128, 61, ${0.04 + differenceIntensity * 0.18})`
        : `rgba(220, 38, 38, ${0.04 + differenceIntensity * 0.16})`;

  return (
    <td
      className={cn(
        "border-b border-[var(--color-border)]/30 px-2 py-2.5 text-center font-semibold",
        isSeason && "border-l border-[var(--color-accent)]"
      )}
      style={{ backgroundColor }}
      title={`${stat.totalGames.toLocaleString()}게임`}
    >
      <span className="block text-[var(--color-foreground)]">
        {stat.averageRP >= 0 ? "+" : ""}
        {stat.averageRP.toFixed(1)}
      </span>
      <span className="relative mx-auto mt-1 block h-1.5 w-full max-w-14 overflow-hidden rounded-full bg-[var(--color-surface)]/70">
        <span className="absolute inset-y-0 left-1/2 z-10 w-px bg-[var(--color-muted-foreground)]/40" />
        <span
          className={cn(
            "absolute inset-y-0 rounded-full",
            isPositive ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
          )}
          style={
            isPositive
              ? { left: "50%", width: `${intensity * 50}%` }
              : { right: "50%", width: `${intensity * 50}%` }
          }
        />
      </span>
    </td>
  );
}
