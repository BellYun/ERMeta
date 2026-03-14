import type { Metadata } from "next"
import { Suspense } from "react"
import { getCharacterName } from "@/lib/characterMap"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"
import { fetchPatches, fetchStats } from "@/components/features/character-analysis/utils"
import { TierGroup } from "@/utils/tier"

interface Props {
  searchParams: Promise<{ character?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { character } = await searchParams
  const code = character ? parseInt(character, 10) : null
  const name = code && !isNaN(code) ? getCharacterName(code) : null

  if (name && !name.startsWith("코드:")) {
    const title = `${name} 캐릭터 분석`
    const description = `이터널리턴 ${name} 승률, 픽률, 평균 RP, 최적 빌드 통계. ${name} 패치별 트렌드와 무기 조합을 분석해드립니다.`

    return {
      title,
      description,
      keywords: [
        `이터널리턴 ${name}`,
        `${name} 빌드`,
        `${name} 승률`,
        `${name} 통계`,
        "이리와지지", "ERGG",
        "이터널리턴 캐릭터 분석",
      ],
      openGraph: {
        title: `${title} | 이리와지지 ER&GG`,
        description,
        url: `/character-analysis?character=${code}`,
      },
      twitter: {
        title: `${title} | ER&GG`,
        description,
      },
      alternates: { canonical: `/character-analysis?character=${code}` },
    }
  }

  return {
    title: "캐릭터 분석",
    description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계. 패치별 트렌드와 무기 조합을 분석해드립니다.",
    keywords: ["이리와지지", "ERGG", "이터널리턴 캐릭터 분석", "이터널리턴 캐릭터 빌드", "이터널리턴 캐릭터 통계", "이터널리턴 무기 추천"],
    openGraph: {
      title: "캐릭터 분석 | 이리와지지 ER&GG",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
      url: "/character-analysis",
    },
    twitter: {
      title: "캐릭터 분석 | ER&GG",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
    },
    alternates: { canonical: "/character-analysis" },
  }
}

/**
 * 캐릭터 분석 페이지 — Server-side 데이터 프리페치
 *
 * Server Component에서 patches + 초기 캐릭터 통계를 미리 fetch하여
 * Client Component에 props로 전달 → 하이드레이션 후 즉시 데이터 표시 (fetch 워터폴 제거)
 */
export default async function CharacterAnalysisPage({ searchParams }: Props) {
  const { character } = await searchParams
  const initialCode = character ? parseInt(character, 10) : 1
  const validCode = !isNaN(initialCode) ? initialCode : 1

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"

  // 서버에서 패치 목록 → 초기 캐릭터 통계 프리페치 (fetch 워터폴 제거)
  const patches = await fetchPatches(base)
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? fetchStats(validCode, patches[0], TierGroup.MITHRIL, base) : null,
    patches[1] ? fetchStats(validCode, patches[1], TierGroup.MITHRIL, base) : null,
  ])

  return (
    <div className="overflow-x-auto">
      <section className="text-center py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          캐릭터 분석
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          이터널리턴 캐릭터별 승률 · 빌드 · 패치 트렌드 분석
        </p>
      </section>
      <Suspense>
        <CharacterAnalysisClient
          initialPatches={patches}
          initialStats={initialStats}
          initialPrevStats={initialPrevStats}
          initialCode={validCode}
        />
      </Suspense>
    </div>
  )
}
