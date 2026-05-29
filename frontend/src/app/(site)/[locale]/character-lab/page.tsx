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
  { slug: "rangers", data: rangersData },
  { slug: "skilldealers", data: skilldealersData },
  { slug: "tanks", data: tanksData },
  { slug: "warriors", data: warriorsData },
  { slug: "assassins", data: assassinsData },
  { slug: "supports", data: supportsData },
] as const;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const title = "캐릭터 유형 분석 — 시너지 그룹 | ER&GG";
  const description =
    "이터널리턴 캐릭터를 trio 시너지 패턴별로 묶은 그룹. 직업군마다 잘 어울리는 조합과 안 어울리는 조합을 누적 통계로 보여줍니다.";
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
          <span className="dashboard-kicker">LAB · 누적 통계 기준</span>
        </div>
        <h1 className="dashboard-title">
          캐릭터 <em>유형 분석</em>
        </h1>
        <p className="dashboard-subtitle">
          비슷한 trio 시너지를 가진 캐릭터끼리 묶었습니다. 그룹별로 어떤 조합에서 잘 나오고 어떤
          조합에서 못 나오는지 보세요.
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
          {ROLES.map(({ slug, data }) => {
            const curatedGroups = data.groups.filter((g) => g.curated).length;
            return (
              <li key={slug}>
                <Link
                  href={`/character-lab/${slug}`}
                  className="char-card group flex h-full flex-col gap-3 p-5 transition-all"
                >
                  <header className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
                      Cluster
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
    </main>
  );
}
