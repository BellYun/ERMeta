import type { Metadata } from "next";
import Link from "next/link";
import { buildDefaultAlternates } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";
import rangersData from "../../../../public/data/lab/rangers.json";
import skilldealersData from "../../../../public/data/lab/skilldealers.json";
import tanksData from "../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../public/data/lab/warriors.json";

export const dynamic = "force-static";

const ROLES = [
  { slug: "rangers", data: rangersData },
  { slug: "skilldealers", data: skilldealersData },
  { slug: "tanks", data: tanksData },
  { slug: "warriors", data: warriorsData },
] as const;

export function generateMetadata(): Metadata {
  const title = "랩 — 직업군 시너지 그룹 | ER&GG";
  const description =
    "이터널리턴 직업군별 시너지 그룹을 확인하세요. 원거리 딜러, 스킬딜러, 탱커, 전사의 강한 조합·주의 조합을 누적 통계로 분석합니다.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/lab" },
    twitter: { title, description },
    alternates: buildDefaultAlternates("/lab"),
    robots: { index: true, follow: true },
  };
}

export default function LabIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">
          랩 — 직업군 시너지 그룹
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          3인 조합 역할군별 평균 RP 기여를 분석한 시너지 데이터입니다. 직업군을 선택해 확인하세요.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ROLES.map(({ slug, data }) => (
          <li key={slug}>
            <Link
              href={`/lab/${slug}`}
              className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)]"
            >
              <span className="text-base font-semibold text-[var(--color-foreground)]">
                {data.role}
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                캐릭터 {data.characters.length}종 · 그룹 {data.groupK}개
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
