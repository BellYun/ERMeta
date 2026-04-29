import { BarChart3, Database, Layers3, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { PatchTimelineBlock } from "@/app/season10-recap/PatchTimelineBlock";
import { RoleStrengthBlock } from "@/app/season10-recap/RoleStrengthBlock";
import { SeasonHallOfFameBlock } from "@/app/season10-recap/SeasonHallOfFameBlock";
import { Link } from "@/i18n/navigation";
import { getCharacterImageUrl, getCharacterName } from "@/lib/characterMap";
import { getSeasonRecapData } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

export const metadata: Metadata = {
  title: "시즌 10 리캡 — 마지막 메타 박제 | ER&GG",
  description:
    "이터널리턴 시즌 10 마무리. 패치별 평균 RP TOP 5와 시즌 누적 평균 RP 전체 랭킹. 미스릴+ 기준.",
  alternates: { canonical: "/season10-recap" },
  openGraph: {
    title: "시즌 10 리캡 | ER&GG",
    description: "패치별 평균 RP TOP 5 + 시즌 누적 전체 랭킹",
    url: "/season10-recap",
  },
  twitter: {
    title: "시즌 10 리캡 | ER&GG",
    description: "패치별 평균 RP TOP 5 + 시즌 누적 전체 랭킹",
  },
};

export const revalidate = 3600;

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function HeroMetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "gold" | "blue";
}) {
  const iconTone =
    tone === "gold"
      ? "border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.12)] text-[var(--color-accent-gold)]"
      : tone === "blue"
        ? "border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.12)] text-[var(--color-primary)]"
        : "border-white/8 bg-[rgba(255,255,255,0.05)] text-[var(--color-foreground)]";

  return (
    <div className="metric-card flex min-h-[118px] flex-col gap-4 px-4 py-4 sm:min-h-[150px] sm:gap-6 sm:px-5 sm:py-5">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border sm:h-12 sm:w-12",
          iconTone
        )}
      >
        {icon}
      </div>
      <div>
        <p className="metric-value text-[1.45rem] sm:text-[1.95rem]">{value}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

function LeaderCard({
  characterCode,
  bestWeapon,
  averageRP,
  topAppearances,
  totalPatches,
}: {
  characterCode: number;
  bestWeapon: number;
  averageRP: number;
  topAppearances: number;
  totalPatches: number;
}) {
  const name = getCharacterName(characterCode);
  const weaponName = bestWeapon > 0 ? resolveWeaponName(bestWeapon) : "통합 집계";
  const imageUrl = getCharacterImageUrl(characterCode);

  return (
    <div className="metric-card col-span-2 flex min-h-[132px] items-center gap-4 px-4 py-4 sm:min-h-[150px] sm:px-5 sm:py-5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] sm:h-20 sm:w-20">
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent-gold)]">
            <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
            시즌 1위 조합
          </span>
          <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
            TOP 5 진입 {topAppearances}/{totalPatches} 패치
          </span>
        </div>
        <p className="mt-3 truncate text-[1.15rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.45rem]">
          {name}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{weaponName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[1.5rem] font-black tracking-[-0.04em] text-[var(--color-accent-gold)] sm:text-[2rem]">
          +{averageRP.toFixed(1)}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)] sm:text-sm">
          시즌 평균 RP
        </p>
      </div>
    </div>
  );
}

export default async function SeasonRecapPage() {
  const { patches, perPatchTop, seasonTop, roleStats } = await getSeasonRecapData();

  if (patches.length === 0) {
    return (
      <main className="page-shell flex flex-col gap-5 lg:gap-6">
        <section className="dashboard-panel p-8 text-center">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">시즌 10 리캡</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            데이터를 준비 중입니다. 잠시 후 다시 확인해주세요.
          </p>
        </section>
      </main>
    );
  }

  const firstPatch = patches[0];
  const lastPatch = patches[patches.length - 1];
  const trackedCombos = seasonTop.length;
  const totalMatches = seasonTop.reduce((sum, row) => sum + row.totalGames, 0);
  const leader = seasonTop[0] ?? null;

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5 xl:px-7">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent-gold)] sm:px-3 sm:text-sm">
                <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                시즌 10 마무리
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                {firstPatch} → {lastPatch}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                미스릴+ 집계
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.2rem]">
              시즌 10 리캡
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1">
                추적 패치 {patches.length}개
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1">
                집계 조합 {formatMetricNumber(trackedCombos)}개
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1">
                표본 {formatMetricNumber(totalMatches)}판
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetricCard
              icon={<Layers3 className="h-5 w-5" strokeWidth={2} />}
              label="추적 패치"
              value={`${patches.length}개`}
              tone="blue"
            />
            <HeroMetricCard
              icon={<Database className="h-5 w-5" strokeWidth={2} />}
              label="집계 조합"
              value={`${formatMetricNumber(trackedCombos)}개`}
            />
            <HeroMetricCard
              icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
              label="누적 표본"
              value={`${formatMetricNumber(totalMatches)}판`}
              tone="gold"
            />
            {leader ? (
              <LeaderCard
                characterCode={leader.characterNum}
                bestWeapon={leader.bestWeapon}
                averageRP={leader.averageRP}
                topAppearances={leader.topAppearances}
                totalPatches={patches.length}
              />
            ) : (
              <div className="metric-card col-span-2 flex min-h-[132px] items-center justify-center px-4 py-4 text-sm text-[var(--color-muted-foreground)] sm:min-h-[150px] sm:px-5 sm:py-5">
                시즌 누적 상위 조합 데이터를 준비 중입니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <PatchTimelineBlock perPatchTop={perPatchTop} />
      <RoleStrengthBlock roleStats={roleStats} patches={patches} />
      <SeasonHallOfFameBlock entries={seasonTop} totalPatches={patches.length} patches={patches} />

      <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]/88">
              Data Note
            </p>
            <p className="mt-2 text-sm text-[var(--color-foreground)]">
              공식 API 기반 시즌 누적 집계입니다.
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              미스릴 / 메테오라이트 / 다이아몬드 / 상위 1000위 티어 통합 통계이며, 평균 RP 획득량
              기준으로 정렬했습니다. 알렉스처럼 무기 통합 집계가 필요한 캐릭터는 단일 조합으로
              합산했습니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
          >
            메타 분석으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
