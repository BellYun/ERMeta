import type { Metadata } from "next"
import { Suspense } from "react"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"
import { getCharacterName } from "@/lib/characterMap"

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

export default function CharacterAnalysisPage() {
  return (
    <>
      <section className="text-center py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          캐릭터 분석
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          이터널리턴 캐릭터별 승률 · 빌드 · 패치 트렌드 분석
        </p>
      </section>
      <Suspense>
        <CharacterAnalysisClient />
      </Suspense>
    </>
  )
}
