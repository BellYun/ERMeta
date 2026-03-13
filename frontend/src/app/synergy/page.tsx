import type { Metadata } from "next"
import { Suspense } from "react"
import { getCharacterName } from "@/lib/characterMap"
import { FocusCharacterPool } from "@/components/features/synergy/FocusCharacterPool"
import { AllySelector } from "@/components/features/synergy/AllySelector"
import { SynergyResults } from "@/components/features/synergy/SynergyResults"
import {
  FocusPoolSkeleton,
  AllySelectorSkeleton,
  ResultSkeleton,
} from "@/components/features/synergy/SynergySkeleton"

interface Props {
  searchParams: Promise<{ ally1?: string; ally2?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { ally1, ally2 } = await searchParams
  const code1 = ally1 ? parseInt(ally1, 10) : null
  const code2 = ally2 ? parseInt(ally2, 10) : null
  const name1 = code1 && !isNaN(code1) ? getCharacterName(code1) : null
  const name2 = code2 && !isNaN(code2) ? getCharacterName(code2) : null

  // 아군이 선택된 경우 동적 메타데이터
  if (name1 && !name1.startsWith("코드:")) {
    const allyNames = name2 && !name2.startsWith("코드:")
      ? `${name1} + ${name2}`
      : name1
    const title = `${allyNames} 조합 추천`
    const description = `이터널리턴 ${allyNames} 최적 3인 조합 추천. 베이지안 통계 기반 승률·평균 RP로 분석한 최강 팀 조합.`
    const params = new URLSearchParams()
    params.set("ally1", String(code1))
    if (code2) params.set("ally2", String(code2))

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"
    const ogImageUrl = `${base}/api/og/synergy?${params.toString()}`
    return {
      title,
      description,
      keywords: [
        `이터널리턴 ${allyNames} 조합`,
        "이리와지지", "ERGG",
        "이터널리턴 조합 추천",
        "이터널리턴 3인 조합",
        "이터널리턴 트리오",
      ],
      openGraph: {
        title: `${title} | 이리와지지 ER&GG`,
        description,
        url: `/synergy?${params.toString()}`,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${allyNames} 추천 조합` }],
      },
      twitter: {
        title: `${title} | ER&GG`,
        description,
        card: "summary_large_image",
        images: [ogImageUrl],
      },
      alternates: { canonical: `/synergy?${params.toString()}` },
    }
  }

  return {
    title: "이리와지지 3인 조합 추천 - 이터널리턴 최적 팀 조합",
    description: "이터널리턴 최강 3인 조합 추천. 베이지안 통계로 보정된 승률·평균 RP 기반 최적 팀 조합을 찾아보세요. 아군 캐릭터를 선택하면 맞춤 조합을 추천해드립니다.",
    keywords: ["이리와지지", "ERGG", "이터널리턴 조합 추천", "이터널리턴 3인 조합", "이터널리턴 트리오", "이터널리턴 팀 조합", "이터널리턴 시너지"],
    openGraph: {
      title: "3인 조합 추천 | 이리와지지 ER&GG",
      description: "이터널리턴 최강 3인 조합 추천. 승률·평균 RP 기반 최적 팀 조합.",
      url: "/synergy",
      images: [{ url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"}/api/og/synergy`, width: 1200, height: 630, alt: "ER&GG 3인 조합 추천" }],
    },
    twitter: {
      title: "3인 조합 추천 | 이리와지지 ER&GG",
      description: "이터널리턴 최강 3인 조합 추천. 승률·평균 RP 기반 최적 팀 조합.",
      card: "summary_large_image",
      images: [`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"}/api/og/synergy`],
    },
    alternates: { canonical: "/synergy" },
  }
}

/**
 * 시너지 페이지 — Islands Architecture
 *
 * 각 섹션이 독립 Client Island로 분리되어 개별 하이드레이션:
 * - FocusCharacterPool: localStorage 기반 (useFocusCharacters)
 * - AllySelector: URL searchParams 기반
 * - SynergyResults: URL + localStorage 읽기 → API fetch → 결과 렌더링
 *
 * Server Component(이 파일)는 정적 헤더만 렌더링 → 즉시 FCP
 * 각 Island의 Suspense fallback으로 CLS 없이 점진 하이드레이션
 */
export default function SynergyPage() {
  return (
    <>
      <section className="text-center py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          3인 조합 추천
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          시즌 10 누적 1,200,000+판 · 승률 + 평균 RP 기반 최적 팀 조합 분석
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {/* Island 1: 내 캐릭터 풀 (localStorage) */}
        <Suspense fallback={<FocusPoolSkeleton />}>
          <FocusCharacterPool />
        </Suspense>

        {/* Island 2: 아군 선택 (URL params) */}
        <Suspense fallback={<AllySelectorSkeleton />}>
          <AllySelector />
        </Suspense>

        {/* Island 3: 결과 (URL + localStorage → API) */}
        <Suspense fallback={<ResultSkeleton />}>
          <SynergyResults />
        </Suspense>
      </div>
    </>
  )
}
