import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { Link } from "@/i18n/navigation";
import { getCharacterImageUrl, getCharacterName, getComboRoles } from "@/lib/characterMap";
import {
  type PerPatchStat,
  type RecapPatchNote,
  type SeasonAggregateEntry,
  type TierRpTrend,
  type TierRpTrends,
} from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

const NEW_CHARACTER_CODES = [88, 89] as const;

interface CharacterReport {
  code: (typeof NEW_CHARACTER_CODES)[number];
  name: string;
  entry: SeasonAggregateEntry;
  seasonRank: number;
  seasonPoolSize: number;
  firstStat: PerPatchStat;
  latestStat: PerPatchStat;
  bestStat: PerPatchStat;
  latestDelta: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatRp(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function buildCharacterReport(
  code: CharacterReport["code"],
  entries: SeasonAggregateEntry[]
): CharacterReport | null {
  const seasonRank = entries.findIndex((entry) => entry.characterNum === code);
  if (seasonRank < 0) return null;

  const entry = entries[seasonRank];
  const availableStats = entry.perPatch.filter((stat) => stat.totalGames > 0);
  if (availableStats.length === 0) return null;

  const firstStat = availableStats[0];
  const latestStat = availableStats[availableStats.length - 1];
  const bestStat = [...availableStats].sort((a, b) => b.averageRP - a.averageRP)[0];

  return {
    code,
    name: getCharacterName(code),
    entry,
    seasonRank: seasonRank + 1,
    seasonPoolSize: entries.length,
    firstStat,
    latestStat,
    bestStat,
    latestDelta: latestStat.averageRP - firstStat.averageRP,
  };
}

function ComparisonValue({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-[var(--color-border)]/40 px-3 py-3 text-center text-xs font-bold tabular-nums text-[var(--color-foreground)] sm:text-sm">
      {children}
    </td>
  );
}

function CharacterColumnHeader({ report }: { report: CharacterReport }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="relative h-9 w-9 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <Image
          src={getCharacterImageUrl(report.code)}
          alt={report.name}
          fill
          className="object-cover"
          sizes="36px"
        />
      </div>
      <div className="text-left">
        <p className="text-xs font-bold text-[var(--color-foreground)]">{report.name}</p>
        <p className="mt-0.5 text-[9px] font-medium text-[var(--color-muted-foreground)]">
          {resolveWeaponName(report.entry.bestWeapon)}
        </p>
      </div>
    </div>
  );
}

function CharacterComparison({ reports }: { reports: CharacterReport[] }) {
  if (reports.length === 0) return null;

  return (
    <section
      id="season-recap-new-characters"
      className="dashboard-panel scroll-mt-24 p-4 lg:scroll-mt-20"
    >
      <div className="home-section-header pb-3">
        <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
          한눈에 비교
        </p>
        <h2 className="dashboard-section-title mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.55rem]">
          시즌 11 신규 실험체 성적표
        </h2>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-[var(--color-surface-2)]">
                <th className="w-[180px] border-b border-[var(--color-border)] px-3 py-3 text-left text-[10px] font-bold text-[var(--color-muted-foreground)]">
                  지표
                </th>
                {reports.map((report) => (
                  <th key={report.code} className="border-b border-[var(--color-border)] px-3 py-3">
                    <CharacterColumnHeader report={report} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="첫 집계 패치" reports={reports}>
                {(report) => report.firstStat.patch}
              </ComparisonRow>
              <ComparisonRow label="다이아+ 평균 RP · 승률" reports={reports}>
                {(report) =>
                  `${formatRp(report.entry.averageRP)} RP · ${report.entry.winRate.toFixed(1)}%`
                }
              </ComparisonRow>
              <ComparisonRow label="미스릴+ 평균 RP · 승률" reports={reports}>
                {(report) =>
                  report.entry.mithrilPlus
                    ? `${formatRp(report.entry.mithrilPlus.averageRP)} RP · ${report.entry.mithrilPlus.winRate.toFixed(1)}%`
                    : "표본 없음"
                }
              </ComparisonRow>
              <ComparisonRow label="다이아+ · 미스릴+ 표본" reports={reports}>
                {(report) =>
                  `${formatNumber(report.entry.totalGames)} · ${formatNumber(report.entry.mithrilPlus?.totalGames ?? 0)}게임`
                }
              </ComparisonRow>
              <ComparisonRow label="다이아+ 시즌 RP 순위" reports={reports}>
                {(report) => `${report.seasonRank}위 / ${report.seasonPoolSize}개 조합`}
              </ComparisonRow>
              <ComparisonRow label="다이아+ 최고 패치" reports={reports}>
                {(report) => `${report.bestStat.patch} · ${formatRp(report.bestStat.averageRP)} RP`}
              </ComparisonRow>
              <ComparisonRow label="다이아+ 첫 집계 → 최신" reports={reports}>
                {(report) => `${formatRp(report.latestDelta)} RP`}
              </ComparisonRow>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  reports,
  children,
}: {
  label: string;
  reports: CharacterReport[];
  children: (report: CharacterReport) => React.ReactNode;
}) {
  return (
    <tr>
      <th className="border-b border-[var(--color-border)]/40 bg-[var(--color-surface-2)]/45 px-3 py-3 text-left text-[10px] font-semibold text-[var(--color-muted-foreground)] sm:text-xs">
        {label}
      </th>
      {reports.map((report) => (
        <ComparisonValue key={report.code}>{children(report)}</ComparisonValue>
      ))}
    </tr>
  );
}

interface TierPerformanceScope {
  totalGames: number;
  totalWins: number;
  averageRP: number;
  winRate: number;
  perPatch: PerPatchStat[];
}

interface TierPerformanceSeries {
  key: "diamondPlus" | "mithrilPlus";
  label: "다이아+" | "미스릴+";
  scope: TierPerformanceScope | null;
  benchmark: TierRpTrend;
}

interface PatchReaction {
  key: TierPerformanceSeries["key"];
  label: TierPerformanceSeries["label"];
  value: number | null;
}

function getPatchReaction(
  series: TierPerformanceSeries,
  patch: string,
  patches: string[]
): number | null {
  const patchIndex = patches.indexOf(patch);
  if (!series.scope || patchIndex <= 0) return null;

  const previousPatch = patches[patchIndex - 1];
  const currentStat = series.scope.perPatch.find((stat) => stat.patch === patch);
  const previousStat = series.scope.perPatch.find((stat) => stat.patch === previousPatch);
  const currentBenchmark = series.benchmark.perPatch.find((stat) => stat.patch === patch);
  const previousBenchmark = series.benchmark.perPatch.find((stat) => stat.patch === previousPatch);

  if (!currentStat || !previousStat || !currentBenchmark || !previousBenchmark) return null;

  const currentRelativeRp = currentStat.averageRP - currentBenchmark.averageRP;
  const previousRelativeRp = previousStat.averageRP - previousBenchmark.averageRP;
  return currentRelativeRp - previousRelativeRp;
}

function PatchTrend({ report, benchmarks }: { report: CharacterReport; benchmarks: TierRpTrends }) {
  const series: TierPerformanceSeries[] = [
    {
      key: "diamondPlus",
      label: "다이아+",
      scope: report.entry,
      benchmark: benchmarks.diamondPlus,
    },
    {
      key: "mithrilPlus",
      label: "미스릴+",
      scope: report.entry.mithrilPlus,
      benchmark: benchmarks.mithrilPlus,
    },
  ];
  const patches = Array.from(
    new Set(series.flatMap((item) => item.scope?.perPatch.map((stat) => stat.patch) ?? []))
  ).sort((a, b) => Number(a.split(".")[1]) - Number(b.split(".")[1]));
  const maxAbsRp = Math.max(
    ...series.flatMap((item) => [
      ...(item.scope?.perPatch.map((stat) => Math.abs(stat.averageRP)) ?? []),
      ...item.benchmark.perPatch.map((stat) => Math.abs(stat.averageRP)),
    ]),
    1
  );

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-foreground)]">
            패치별 RP 성능 · 승률
          </h3>
          <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
            전체 평균 대비 RP 차이를 핵심 성능 지표로, 승률은 참고값으로 표시합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-semibold text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--color-accent)]" /> 다이아+
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--color-success)]" /> 미스릴+
          </span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[650px] overflow-hidden rounded-md border border-[var(--color-border)]">
          <div className="grid grid-cols-[58px_repeat(2,minmax(0,1fr))] bg-[var(--color-surface-2)]">
            <div className="flex items-center justify-center border-r border-[var(--color-border)] px-2 py-3 font-mono text-[9px] font-bold text-[var(--color-muted-foreground)]">
              PATCH
            </div>
            {series.map((item) => (
              <TierSeasonHeader key={item.key} series={item} />
            ))}
          </div>

          {patches.map((patch) => {
            const patchNote = report.entry.patchNotes.find((note) => note.patch === patch);
            const reactions: PatchReaction[] = series.map((item) => ({
              key: item.key,
              label: item.label,
              value: getPatchReaction(item, patch, patches),
            }));

            return (
              <div key={patch}>
                {patchNote ? <PatchChangeStrip note={patchNote} reactions={reactions} /> : null}
                <div className="grid grid-cols-[58px_repeat(2,minmax(0,1fr))] border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-surface-2)]/55 px-2 py-3 font-mono text-[10px] font-bold text-[var(--color-foreground)]">
                    {patch}
                  </div>
                  {series.map((item) => (
                    <PatchTierCell
                      key={item.key}
                      tierKey={item.key}
                      stat={item.scope?.perPatch.find((stat) => stat.patch === patch) ?? null}
                      benchmark={
                        item.benchmark.perPatch.find((stat) => stat.patch === patch) ?? null
                      }
                      maxAbsRp={maxAbsRp}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TierSeasonHeader({ series }: { series: TierPerformanceSeries }) {
  return (
    <div className="border-r border-[var(--color-border)] px-3 py-3 last:border-r-0">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[10px] font-bold",
            series.key === "diamondPlus"
              ? "text-[var(--color-accent-foreground)]"
              : "text-[var(--color-success)]"
          )}
        >
          {series.label}
        </span>
        <span className="text-[9px] tabular-nums text-[var(--color-muted-foreground)]">
          {formatNumber(series.scope?.totalGames ?? 0)}게임
        </span>
      </div>
      {series.scope ? (
        <div className="mt-1.5 flex items-baseline gap-2">
          <strong className="text-sm tabular-nums text-[var(--color-foreground)]">
            {formatRp(series.scope.averageRP)} RP
          </strong>
          <span className="text-[10px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">
            승률 {series.scope.winRate.toFixed(1)}%
          </span>
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-[var(--color-muted-foreground)]">표본 없음</p>
      )}
    </div>
  );
}

function PatchTierCell({
  tierKey,
  stat,
  benchmark,
  maxAbsRp,
}: {
  tierKey: TierPerformanceSeries["key"];
  stat: PerPatchStat | null;
  benchmark: PerPatchStat | null;
  maxAbsRp: number;
}) {
  if (!stat) {
    return (
      <div className="flex min-h-[88px] items-center justify-center border-r border-[var(--color-border)] px-3 py-3 text-[10px] text-[var(--color-muted-foreground)] last:border-r-0">
        표본 없음
      </div>
    );
  }

  const rpDelta = benchmark ? stat.averageRP - benchmark.averageRP : null;
  const tierTone =
    tierKey === "diamondPlus" ? "bg-[var(--color-accent)]" : "bg-[var(--color-success)]";

  return (
    <div className="border-r border-[var(--color-border)] px-3 py-3 last:border-r-0">
      <div className="grid grid-cols-[minmax(0,1fr)_74px] gap-2">
        <div
          className={cn(
            "rounded border px-2.5 py-2",
            rpDelta == null
              ? "border-[var(--color-border)] bg-[var(--color-surface-2)]"
              : rpDelta >= 0
                ? "border-[var(--color-success)]/35 bg-[var(--color-success)]/5"
                : "border-[var(--color-danger)]/35 bg-[var(--color-danger)]/5"
          )}
        >
          <p className="text-[8px] font-semibold text-[var(--color-muted-foreground)]">
            전체 평균 대비 RP
          </p>
          <p
            className={cn(
              "mt-1 text-base font-bold tabular-nums",
              rpDelta == null
                ? "text-[var(--color-muted-foreground)]"
                : rpDelta >= 0
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-danger)]"
            )}
          >
            {rpDelta == null ? "-" : `${formatRp(rpDelta)} RP`}
          </p>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-right">
          <p className="text-[8px] font-semibold text-[var(--color-muted-foreground)]">승률</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {stat.winRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-2.5 space-y-2">
        <RpComparisonBar
          label="실험체 RP"
          value={stat.averageRP}
          maxAbsRp={maxAbsRp}
          tone={stat.averageRP >= 0 ? tierTone : "bg-[var(--color-danger)]"}
        />
        <RpComparisonBar
          label="전체 평균"
          value={benchmark?.averageRP ?? null}
          maxAbsRp={maxAbsRp}
          tone="bg-[var(--color-muted-foreground)]"
        />
      </div>

      <p className="mt-2 text-right text-[8px] tabular-nums text-[var(--color-muted-foreground)]">
        {formatNumber(stat.totalGames)}게임
      </p>
    </div>
  );
}

function RpComparisonBar({
  label,
  value,
  maxAbsRp,
  tone,
}: {
  label: string;
  value: number | null;
  maxAbsRp: number;
  tone: string;
}) {
  const width = value == null ? 0 : Math.max((Math.abs(value) / maxAbsRp) * 50, 1.5);

  return (
    <div className="grid grid-cols-[54px_minmax(0,1fr)_48px] items-center gap-1.5">
      <span className="text-[8px] font-semibold text-[var(--color-muted-foreground)]">{label}</span>
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-muted-foreground)]/45" />
        {value == null ? null : (
          <span
            className={cn("absolute inset-y-0 rounded-full", tone)}
            style={
              value >= 0
                ? { left: "50%", width: `${width}%` }
                : { right: "50%", width: `${width}%` }
            }
          />
        )}
      </div>
      <span className="text-right text-[8px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">
        {value == null ? "-" : formatRp(value)}
      </span>
    </div>
  );
}

const CHANGE_LABELS = {
  buff: "버프",
  nerf: "너프",
  rework: "조정",
} as const;

function PatchChangeStrip({
  note,
  reactions,
}: {
  note: RecapPatchNote;
  reactions: PatchReaction[];
}) {
  return (
    <div className="grid grid-cols-[58px_minmax(0,1fr)] border-t border-[var(--color-border)] bg-[var(--color-accent-muted)]/35">
      <div className="flex flex-col items-center justify-center border-r border-[var(--color-border)] px-1.5 py-3">
        <span className="text-[8px] font-bold text-[var(--color-accent-foreground)]">변경</span>
        <span className="mt-1 font-mono text-[8px] text-[var(--color-muted-foreground)]">
          {note.patch}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold text-[var(--color-foreground)]">
            PATCH {note.patch} 밸런스 변경
          </p>
          <span className="text-[8px] tabular-nums text-[var(--color-muted-foreground)]">
            {note.changes.length}건
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {reactions.map((reaction) => (
            <div
              key={reaction.key}
              className={cn(
                "flex items-center justify-between gap-2 rounded border px-2 py-1.5",
                reaction.value == null
                  ? "border-[var(--color-border)] bg-[var(--color-surface)]/70"
                  : reaction.value >= 0
                    ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
                    : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5"
              )}
            >
              <span className="text-[8px] font-semibold text-[var(--color-muted-foreground)]">
                {reaction.label} 패치 반응
              </span>
              <strong
                className={cn(
                  "text-[10px] tabular-nums",
                  reaction.value == null
                    ? "text-[var(--color-muted-foreground)]"
                    : reaction.value >= 0
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]"
                )}
              >
                {reaction.value == null ? "첫 집계" : `${formatRp(reaction.value)} RP`}
              </strong>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {note.changes.map((change, index) => (
            <div
              key={`${note.patch}-${change.target}-${index}`}
              className="min-w-0 rounded border border-[var(--color-border)]/60 bg-[var(--color-surface)]/75 px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <ChangeTypeBadgeStatic
                  type={change.changeType}
                  label={CHANGE_LABELS[change.changeType]}
                />
                <span className="truncate text-[9px] font-bold text-[var(--color-foreground)]">
                  {change.target}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[8px] text-[var(--color-muted-foreground)]">
                {change.valueSummary ?? change.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CharacterReportCard({
  report,
  benchmarks,
}: {
  report: CharacterReport;
  benchmarks: TierRpTrends;
}) {
  const roles = getComboRoles(report.entry.characterNum, report.entry.bestWeapon);

  return (
    <article className="dashboard-panel flex flex-col gap-4 p-4">
      <div className="home-section-header flex items-start justify-between gap-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] sm:h-20 sm:w-20">
            <Image
              src={getCharacterImageUrl(report.code)}
              alt={report.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--color-accent-foreground)]">
              {report.firstStat.patch} 첫 집계 · 신규 실험체
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
              {report.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {resolveWeaponName(report.entry.bestWeapon)} · {roles.join(" / ")}
            </p>
          </div>
        </div>
        <Link
          href={`/character/${report.code}?weapon=${report.entry.bestWeapon}`}
          className="dashboard-tab shrink-0 gap-1 px-2.5 py-1.5 text-[10px]"
        >
          상세
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ScoreMetric label="다이아+ 평균 RP" value={`${formatRp(report.entry.averageRP)} RP`} />
        <ScoreMetric label="다이아+ 승률" value={`${report.entry.winRate.toFixed(1)}%`} />
        <ScoreMetric
          label="미스릴+ 평균 RP"
          value={
            report.entry.mithrilPlus ? `${formatRp(report.entry.mithrilPlus.averageRP)} RP` : "-"
          }
        />
        <ScoreMetric
          label="미스릴+ 승률"
          value={report.entry.mithrilPlus ? `${report.entry.mithrilPlus.winRate.toFixed(1)}%` : "-"}
        />
      </div>

      <PatchTrend report={report} benchmarks={benchmarks} />
    </article>
  );
}

function ScoreMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card px-3 py-3">
      <p className="text-[9px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-2 text-base font-bold tabular-nums text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

export function NewCharacterReportBlock({
  entries,
  benchmarks,
}: {
  entries: SeasonAggregateEntry[];
  benchmarks: TierRpTrends;
}) {
  const reports = NEW_CHARACTER_CODES.flatMap((code) => {
    const report = buildCharacterReport(code, entries);
    return report ? [report] : [];
  });

  if (reports.length === 0) {
    return (
      <section
        id="season-recap-new-characters"
        className="dashboard-panel scroll-mt-24 p-10 text-center lg:scroll-mt-20"
      >
        <p className="text-sm text-[var(--color-muted-foreground)]">신규 실험체 표본 확인 중</p>
      </section>
    );
  }

  return (
    <>
      <CharacterComparison reports={reports} />
      <section className="grid gap-5 lg:gap-6">
        {reports.map((report) => (
          <CharacterReportCard key={report.code} report={report} benchmarks={benchmarks} />
        ))}
      </section>
    </>
  );
}
