import type { RoleAggregate } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";

interface RoleStrengthBlockProps {
  roleStats: RoleAggregate[];
  patches: string[];
}

export function RoleStrengthBlock({ roleStats, patches }: RoleStrengthBlockProps) {
  if (roleStats.length === 0 || patches.length === 0) return null;

  const allValues: number[] = [];
  for (const row of roleStats) {
    for (const patch of row.perPatch) {
      if (patch.stat) allValues.push(patch.stat.averageRP);
    }
    if (row.season) allValues.push(row.season.averageRP);
  }
  const maxAbs = Math.max(...allValues.map((value) => Math.abs(value)), 1);

  const seasonRows = roleStats.filter((row) => row.season != null) as Array<
    RoleAggregate & { season: NonNullable<RoleAggregate["season"]> }
  >;
  const seasonSorted = [...seasonRows].sort((a, b) => b.season.averageRP - a.season.averageRP);
  const strongestRole = seasonSorted[0] ?? null;
  const weakestRole = seasonSorted[seasonSorted.length - 1] ?? null;

  return (
    <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]/88">
              Role Heatmap
            </p>
            <h2 className="mt-2 text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.7rem]">
              직업군별 평균 RP
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              멀티롤 조합은 해당 직업군에 모두 반영했습니다. 시즌 전체 흐름과 패치별 강세를 함께
              읽기 좋게 정리했습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1">
              패치 {patches.length}개
            </span>
            <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1">
              오른쪽 열은 시즌 전체
            </span>
          </div>
        </div>

        {(strongestRole || weakestRole) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {strongestRole && (
              <SummaryCard
                label="시즌 최고 효율"
                role={strongestRole.role}
                value={strongestRole.season.averageRP}
                tone="positive"
              />
            )}
            {weakestRole && (
              <SummaryCard
                label="시즌 최저 효율"
                role={weakestRole.role}
                value={weakestRole.season.averageRP}
                tone="negative"
              />
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)]">
          <div className="overflow-x-auto pb-2 overscroll-x-contain">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-xs sm:min-w-[940px] sm:text-sm xl:min-w-[1040px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)]/60">
                  <th className="sticky left-0 z-10 border-b border-[var(--color-border)] bg-[rgba(15,23,42,0.98)] px-3 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    직업군
                  </th>
                  {patches.map((patch) => (
                    <th
                      key={patch}
                      className="border-b border-[var(--color-border)] px-2 py-3 text-center font-medium text-[var(--color-muted-foreground)] tabular-nums"
                    >
                      {patch}
                    </th>
                  ))}
                  <th className="border-b border-l border-[var(--color-border)] px-3 py-3 text-center font-semibold text-[var(--color-foreground)] tabular-nums">
                    시즌
                  </th>
                </tr>
              </thead>
              <tbody>
                {roleStats.map(({ role, perPatch, season }) => (
                  <tr key={role}>
                    <th className="sticky left-0 z-10 border-b border-[var(--color-border)]/30 bg-[rgba(11,15,26,0.96)] px-3 py-3 text-left font-semibold text-[var(--color-foreground)]">
                      {role}
                    </th>
                    {perPatch.map(({ patch, stat }) => (
                      <RoleCell key={patch} stat={stat} maxAbs={maxAbs} />
                    ))}
                    <RoleCell stat={season} maxAbs={maxAbs} isSeason />
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

function SummaryCard({
  label,
  role,
  value,
  tone,
}: {
  label: string;
  role: string;
  value: number;
  tone: "positive" | "negative";
}) {
  const isPositive = tone === "positive";
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-lg font-black tracking-[-0.04em] text-[var(--color-foreground)]">
          {role}
        </p>
        <p
          className={cn(
            "text-lg font-black tabular-nums",
            isPositive ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
          )}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(1)}
        </p>
      </div>
    </div>
  );
}

function RoleCell({
  stat,
  maxAbs,
  isSeason = false,
}: {
  stat: { totalGames: number; averageRP: number } | null;
  maxAbs: number;
  isSeason?: boolean;
}) {
  if (!stat) {
    return (
      <td
        className={cn(
          "border-b border-[var(--color-border)]/30 px-2 py-3 text-center text-[var(--color-muted-foreground)]/40 tabular-nums",
          isSeason && "border-l border-[var(--color-border)]"
        )}
      >
        —
      </td>
    );
  }

  const intensity = Math.min(Math.abs(stat.averageRP) / maxAbs, 1);
  const isPositive = stat.averageRP >= 0;
  const backgroundColor = isPositive
    ? `rgba(251, 191, 36, ${0.05 + intensity * 0.3})`
    : `rgba(248, 113, 113, ${0.05 + intensity * 0.28})`;

  return (
    <td
      className={cn(
        "border-b border-[var(--color-border)]/30 px-2 py-3 text-center font-semibold tabular-nums",
        isSeason && "border-l border-[var(--color-border)]",
        isPositive ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
      )}
      style={{ backgroundColor }}
      title={`${stat.totalGames.toLocaleString()}게임`}
    >
      {stat.averageRP >= 0 ? "+" : ""}
      {stat.averageRP.toFixed(1)}
    </td>
  );
}
