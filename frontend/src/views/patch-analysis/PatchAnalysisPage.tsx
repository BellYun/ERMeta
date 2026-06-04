import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Swords, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import {
  type CharacterRole,
  getCharacterImageUrl,
  getCharacterMiniWebpUrl,
  getCharacterName,
} from "@/lib/characterMap";
import {
  getPatchAnalysisData,
  type PatchCharacterDelta,
  type PatchCharacterMetric,
  type PatchRoleMetric,
} from "@/lib/patchAnalysis";
import { BASE_URL } from "@/lib/siteMetadata";
import { cn } from "@/lib/utils";

export const dynamic = "force-static";
export const revalidate = 21600;

const ROLE_ORDER: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPatchAnalysisData();
  const pathname = `/patch-analysis/${data.currentPatch}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: `패치 메타 분석 — ${data.currentPatch} 통계 변화 | ER&GG`,
    description: `이터널리턴 최신 패치 기준 다이아 이상 통계 분석. ${data.currentPatch}과 ${data.previousPatch}의 평균 RP, 승률, 픽률, Top 3 비율 변화를 비교합니다.`,
    alternates: { canonical: pathname },
    openGraph: {
      title: "패치 메타 분석 | ER&GG",
      description:
        "버프/너프 이후 캐릭터 지표 변화와 역할군 평균 RP를 오늘 통계 기준으로 정리합니다.",
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(digits)}%`;
}

function formatSigned(value: number, digits = 1, suffix = "") {
  if (!Number.isFinite(value)) return `0.0${suffix}`;
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

function MetricCard({
  icon,
  label,
  value,
  body,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  body?: string;
  tone?: "default" | "gold" | "blue" | "danger";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.12)] text-[var(--color-accent-gold)]"
      : tone === "blue"
        ? "border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.12)] text-[var(--color-primary)]"
        : tone === "danger"
          ? "border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.1)] text-[var(--color-danger)]"
          : "border-white/8 bg-[rgba(255,255,255,0.05)] text-[var(--color-foreground)]";

  return (
    <div className="metric-card flex min-h-[132px] flex-col justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5">
      <div
        className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", toneClass)}
      >
        {icon}
      </div>
      <div>
        <p className="text-[1.55rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.9rem]">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
        {body ? (
          <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">{body}</p>
        ) : null}
      </div>
    </div>
  );
}

function metricLabel(metric: PatchCharacterMetric | null, fallbackCode: number) {
  if (!metric) return `${getCharacterName(fallbackCode)} 표본 확인 중`;
  return `${formatNumber(metric.totalGames)}판 · 승률 ${formatPercent(metric.winRate)} · RP ${formatSigned(
    metric.averageRP,
    1
  )}`;
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        positive
          ? "border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.08)] text-[var(--color-success)]"
          : "border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] text-[var(--color-danger)]"
      )}
    >
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatSigned(value, 1, suffix)}
    </span>
  );
}

function CharacterDeltaCard({ entry }: { entry: PatchCharacterDelta }) {
  const firstChanges = entry.note.changes.slice(0, 3);
  const weaponNames = entry.isAggregate ? getEntryWeaponNames(entry) : [];

  return (
    <article className="metric-card flex h-full flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Image
            src={getCharacterMiniWebpUrl(entry.characterNum)}
            alt={entry.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black tracking-[-0.04em] text-[var(--color-foreground)]">
              {entry.name}
            </h3>
            {entry.changeTypes.map((type) => (
              <ChangeTypeBadgeStatic
                key={type}
                type={type}
                label={type === "buff" ? "버프" : type === "nerf" ? "너프" : "조정"}
              />
            ))}
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-black",
                entry.isAggregate
                  ? "border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.1)] text-[var(--color-accent-gold)]"
                  : "border-[rgba(96,165,250,0.24)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary)]"
              )}
            >
              {entry.scopeLabel}
            </span>
            {weaponNames.slice(0, 3).map((weaponName) => (
              <span
                key={weaponName}
                className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] px-2 py-1 text-[10px] font-semibold text-[var(--color-muted-foreground)]"
              >
                {weaponName}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {metricLabel(entry.previous, entry.characterNum)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-foreground)]">
            → {metricLabel(entry.current, entry.characterNum)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DeltaMetric label="RP" value={entry.deltaAverageRP} />
        <DeltaMetric label="승률" value={entry.deltaWinRate} suffix="%p" />
        <DeltaMetric label="픽률" value={entry.deltaPickRate} suffix="%p" />
        <DeltaMetric label="Top 3" value={entry.deltaTop3Rate} suffix="%p" />
      </div>

      <div className="mt-auto rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          패치 내역
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {firstChanges.map((change, index) => (
            <li
              key={`${change.target}-${index}`}
              className="text-xs leading-5 text-[var(--color-muted-foreground)]"
            >
              <span className="font-semibold text-[var(--color-foreground)]">{change.target}</span>
              {change.valueSummary ? <span> · {change.valueSummary}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function DeltaMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-black tabular-nums",
          value >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
        )}
      >
        {formatSigned(value, 1, suffix)}
      </p>
    </div>
  );
}

function RoleTable({ roles }: { roles: PatchRoleMetric[] }) {
  const best = roles[0];
  const worst = roles[roles.length - 1];

  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="dashboard-kicker">Role Meta</p>
            <h2 className="mt-2 text-[1.45rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.8rem]">
              역할군 평균 RP
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              오늘 통계 기준으로는 {best?.role ?? "상위 역할군"}의 평균 RP가 가장 높고,{" "}
              {worst?.role ?? "하위 역할군"}의 평균 RP가 가장 낮습니다. 승률보다 평균 RP가 낮은
              역할군은 순방/킬 보상 구조에서 손해를 보는지 함께 확인해야 합니다.
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
            DIAMOND+ · IN1000 제외
          </span>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)]/60">
                  <th className="border-b border-[var(--color-border)] px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    역할군
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    평균 RP
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    이전 대비
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    승률
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    Top 3
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
                    표본
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.role}>
                    <th className="border-b border-[var(--color-border)]/30 px-4 py-3 text-left font-semibold text-[var(--color-foreground)]">
                      {role.role}
                    </th>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right font-black tabular-nums text-[var(--color-foreground)]">
                      {formatSigned(role.averageRP, 1)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right">
                      {role.deltaAverageRP == null ? (
                        <span className="text-[var(--color-muted-foreground)]">-</span>
                      ) : (
                        <DeltaBadge value={role.deltaAverageRP} />
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPercent(role.winRate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-3 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatPercent(role.top3Rate)}
                    </td>
                    <td className="border-b border-[var(--color-border)]/30 px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {formatNumber(role.totalGames)}
                    </td>
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

function DeltaRanking({
  title,
  entries,
  tone,
}: {
  title: string;
  entries: PatchCharacterDelta[];
  tone: "up" | "down";
}) {
  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
        {title}
      </h2>
      <div className="mt-4 grid gap-2">
        {entries.map((entry, index) => (
          <div
            key={`${entry.characterNum}-${entry.scopeKey}-${index}`}
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] px-3 py-3"
          >
            <span className="w-6 text-center text-sm font-black text-[var(--color-muted-foreground)] tabular-nums">
              {index + 1}
            </span>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <Image
                src={getCharacterImageUrl(entry.characterNum)}
                alt={entry.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                {entry.name}
                <span className="ml-1 font-medium text-[var(--color-muted-foreground)]">
                  {entry.scopeLabel}
                </span>
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {entry.previous ? formatSigned(entry.previous.averageRP, 1) : "-"} →{" "}
                {entry.current ? formatSigned(entry.current.averageRP, 1) : "-"}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-black tabular-nums",
                tone === "up" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
              )}
            >
              {formatSigned(entry.deltaAverageRP, 1)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CharacterSection({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: PatchCharacterDelta[];
}) {
  if (entries.length === 0) return null;
  const groups = groupEntriesByRole(entries);

  return (
    <section className="dashboard-panel p-4 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.45rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.8rem]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
            {description}
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
          {entries.length}건
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.role} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <h3 className="text-sm font-black tracking-[-0.03em] text-[var(--color-foreground)]">
                {group.role}
              </h3>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                {group.entries.length}건
              </span>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {group.entries.map((entry) => (
                <CharacterDeltaCard
                  key={`${group.role}-${entry.characterNum}-${entry.scopeKey}`}
                  entry={entry}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupEntriesByRole(entries: PatchCharacterDelta[]) {
  const map = new Map<string, PatchCharacterDelta[]>();

  for (const entry of entries) {
    const roles = getEntryRoles(entry);
    for (const role of roles.length > 0 ? roles : ["직업군 미분류"]) {
      const group = map.get(role) ?? [];
      group.push(entry);
      map.set(role, group);
    }
  }

  return [...map.entries()]
    .map(([role, groupEntries]) => ({ role, entries: groupEntries }))
    .sort((a, b) => {
      const aIndex = ROLE_ORDER.indexOf(a.role as CharacterRole);
      const bIndex = ROLE_ORDER.indexOf(b.role as CharacterRole);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

function getEntryWeaponNames(entry: PatchCharacterDelta) {
  return Array.isArray(entry.weaponNames) ? entry.weaponNames : [];
}

function getEntryRoles(entry: PatchCharacterDelta) {
  return Array.isArray(entry.roles) ? entry.roles : [];
}

export default async function PatchAnalysisPage() {
  const data = await getPatchAnalysisData();
  const bestRole = data.roleMetrics[0];
  const worstRole = data.roleMetrics[data.roleMetrics.length - 1];

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="dashboard-kicker">Patch Meta Report</span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                {data.previousPatch} → {data.currentPatch}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                {data.asOf} 기준
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.15rem]">
              {data.currentPatch} 패치 메타 분석
            </h1>
            <p className="mt-3 max-w-[44rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:text-base sm:leading-7">
              다이아 이상 랭크 통계를 기준으로 최신 패치와 직전 패치의 평균 RP, 승률, 픽률, Top 3
              비율을 비교했습니다. 버프를 받은 캐릭터가 실제 지표로 반응했는지, 너프 대상이 어느
              정도 내려왔는지, 역할군별로 어떤 포지션이 랭크 상승 효율을 보이는지 함께 확인합니다.
            </p>
            {bestRole && worstRole ? (
              <p className="mt-3 max-w-[44rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
                현재 역할군 평균 RP는 {bestRole.role}이 가장 높고 {worstRole.role}이 가장 낮습니다.
                단순 승률보다 평균 RP와 Top 3 비율을 같이 보는 편이 이번 패치 운영 방향을 잡기
                쉽습니다.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              icon={<CalendarDays className="h-5 w-5" strokeWidth={2} />}
              label="분석 패치"
              value={`${data.currentPatch}`}
              body={`${data.previousPatch} 대비 변화`}
              tone="blue"
            />
            <MetricCard
              icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
              label="현재 표본"
              value={`${formatNumber(data.totalMatches)}판`}
              body={`이전 ${formatNumber(data.previousTotalMatches)}판`}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" strokeWidth={2} />}
              label="버프 추적"
              value={`${data.buffed.length}건`}
              body="패치노트 기준 버프 대상"
              tone="gold"
            />
            <MetricCard
              icon={<Swords className="h-5 w-5" strokeWidth={2} />}
              label="너프 추적"
              value={`${data.nerfed.length}건`}
              body="패치노트 기준 너프 대상"
              tone="danger"
            />
          </div>
        </div>
      </section>

      <RoleTable roles={data.roleMetrics} />

      <div className="grid gap-5 xl:grid-cols-2">
        <DeltaRanking title="평균 RP 상승폭 TOP" entries={data.rising} tone="up" />
        <DeltaRanking title="평균 RP 하락폭 TOP" entries={data.falling} tone="down" />
      </div>

      <CharacterSection
        title="버프 캐릭터 지표 반응"
        description="버프 대상 캐릭터를 평균 RP 상승폭 기준으로 정렬했습니다. 기존 지표와 현재 지표를 함께 봐야 실제 패치 반응을 판단할 수 있습니다."
        entries={data.buffed}
      />
      <CharacterSection
        title="너프 캐릭터 지표 반응"
        description="너프 대상 캐릭터는 평균 RP 하락폭이 큰 순서로 정렬했습니다. 너프 후에도 표본과 승률이 유지되면 여전히 메타 픽으로 볼 수 있습니다."
        entries={data.nerfed}
      />
      <CharacterSection
        title="혼합 조정 캐릭터"
        description="버프와 너프가 함께 들어간 캐릭터는 단일 방향보다 실제 지표 변화로 해석하는 편이 안전합니다."
        entries={data.mixed}
      />

      <section className="dashboard-panel p-4 lg:p-6">
        <div className="flex flex-col gap-2">
          <p className="dashboard-kicker">Reading Guide</p>
          <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
            해석 기준
          </h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Top 3 비율이 낮으면 초중반 탈락 리스크가 높고, Top 3 비율은 낮지만 승률이 높으면 마지막
            금지 구역 교전 전환력이 좋은 픽으로 볼 수 있습니다. 반대로 Top 3 비율은 높지만 승률이
            낮으면 막판 교전 마무리가 어려운 픽일 수 있습니다. 평균 RP가 낮은데 승률만 높다면 사출을
            줄이는 운영이 필요하고, 평균 RP가 높은데 승률이 낮다면 킬과 순방으로 점수를 버는 운영에
            가깝게 해석합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
