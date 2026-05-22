import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";
import assassinsData from "../../../../../public/data/lab/assassins.json";
import rangersData from "../../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../public/data/lab/warriors.json";

export const dynamic = "force-static";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const ROLES = [
  { slug: "rangers", data: rangersData, emoji: "🏹" },
  { slug: "skilldealers", data: skilldealersData, emoji: "✨" },
  { slug: "tanks", data: tanksData, emoji: "🛡️" },
  { slug: "warriors", data: warriorsData, emoji: "⚔️" },
  { slug: "assassins", data: assassinsData, emoji: "🗡️" },
  { slug: "supports", data: supportsData, emoji: "💉" },
] as const;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const title = "캐릭터 유형 분석 — 직업군 시너지 클러스터링 | ER&GG";
  const description =
    "이터널리턴 캐릭터를 직업군 시너지 패턴으로 그룹화. 원거리 딜러·스킬딜러·탱커·전사 각 직업군의 강한 조합·약한 조합 멀티셋을 누적 통계로 분석합니다.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/character-lab" },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CharacterLabPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const totalCharacters = ROLES.reduce((sum, r) => sum + r.data.characters.length, 0);
  const totalGroups = ROLES.reduce((sum, r) => sum + r.data.groupK, 0);

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-hero flex flex-col gap-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">LAB · BETA · 누적 통계 기준</span>
          <span className="rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-success)]">
            NEW
          </span>
        </div>
        <h1 className="dashboard-title">
          캐릭터 <em>유형 분석</em>
        </h1>
        <p className="dashboard-subtitle">
          캐릭터를 직업군 시너지 패턴으로 묶어 메타 지형도를 그립니다. 각 그룹의 강한 조합·약한 조합
          멀티셋을 비교해 픽/드래프트 전에 전략을 내재화하세요.
        </p>
        <dl className="mt-2 flex flex-wrap gap-4 text-xs">
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">분석 캐릭터</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {totalCharacters}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">직업군</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {ROLES.length}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--color-muted-foreground)]">총 시너지 그룹</dt>
            <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
              {totalGroups}
            </dd>
          </div>
        </dl>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-l-2 border-[var(--color-primary)] pl-3">
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">직업군 클러스터링</h2>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
            patch_major 10 누적
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(({ slug, data, emoji }) => {
            const curatedGroups = data.groups.filter((g) => g.curated).length;
            return (
              <li key={slug}>
                <Link
                  href={`/character-lab/${slug}`}
                  className="char-card group flex h-full flex-col gap-3 p-5 transition-all"
                >
                  <header className="flex items-center justify-between">
                    <span className="text-3xl" aria-hidden>
                      {emoji}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]"
                      strokeWidth={2.2}
                    />
                  </header>
                  <div>
                    <p className="text-lg font-extrabold leading-tight tracking-tight text-[var(--color-foreground)]">
                      {data.role}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      캐릭터 {data.characters.length}종 · 시너지 그룹 {data.groupK}개
                      {curatedGroups > 0 ? ` (큐레이팅 ${curatedGroups})` : ""}
                    </p>
                  </div>
                  <dl className="mt-auto border-t border-[var(--color-border)] pt-3 text-[11px]">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-[var(--color-muted-foreground)]">최소 표본</dt>
                      <dd className="font-mono font-bold tabular-nums text-[var(--color-foreground)]">
                        {data.minGames}판+
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="dashboard-panel flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between border-l-2 border-[var(--color-accent-gold)] pl-3">
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">분석 방법</h2>
        </div>
        <ol className="grid gap-2 text-sm text-[var(--color-muted-foreground)] sm:grid-cols-2">
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Step 1
            </p>
            <p className="mt-1 text-sm text-[var(--color-foreground)]">
              캐릭터+무기 단위로 3인 조합 누적 통계 집계 (rp_delta, 게임 수)
            </p>
          </li>
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Step 2
            </p>
            <p className="mt-1 text-sm text-[var(--color-foreground)]">
              ‘잘 맞는 파트너 패턴’이 비슷한 캐릭터를 같은 그룹으로 클러스터링
            </p>
          </li>
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Step 3
            </p>
            <p className="mt-1 text-sm text-[var(--color-foreground)]">
              각 캐릭터의 강한 조합 / 약한 조합 멀티셋을 함께 노출 (해석은 유저에게)
            </p>
          </li>
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Step 4
            </p>
            <p className="mt-1 text-sm text-[var(--color-foreground)]">
              큐레이팅 그룹은 ‘스킬딜러 친화’ 등 친화적 라벨로 표현
            </p>
          </li>
        </ol>
      </section>
    </main>
  );
}
