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
    <section className="dashboard-panel p-4">
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
              멀티롤 조합은 해당 직업군에 모두 반영했습니다. 시즌 전체 흐름과 패치별 강세를 함께
              읽기 좋게 정리했습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span>패치 {patches.length}개</span>
            <span>오른쪽 열은 시즌 전체</span>
          </div>
        </div>

        {(strongestRole || weakestRole) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {strongestRole && (
              <SummaryCard
                label="시즌 효율"
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
  const backgroundColor = isPositive
    ? `rgba(21, 128, 61, ${0.04 + intensity * 0.18})`
    : `rgba(220, 38, 38, ${0.04 + intensity * 0.16})`;

  return (
    <td
      className={cn(
        "border-b border-[var(--color-border)]/30 px-2 py-2.5 text-center font-semibold",
        isSeason && "border-l border-[var(--color-accent)]",
        isPositive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
      )}
      style={{ backgroundColor }}
      title={`${stat.totalGames.toLocaleString()}게임`}
    >
      {stat.averageRP >= 0 ? "+" : ""}
      {stat.averageRP.toFixed(1)}
    </td>
  );
}
