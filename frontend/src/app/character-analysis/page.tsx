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
        "루미아 스탯",
        "이터널리턴 캐릭터 분석",
      ],
      openGraph: {
        title: `${title} | 루미아 스탯 LumiaStats`,
        description,
        url: `/character-analysis?character=${code}`,
      },
      twitter: {
        title: `${title} | LumiaStats`,
        description,
      },
      alternates: { canonical: `/character-analysis?character=${code}` },
    }
  }

  return {
    title: "캐릭터 분석",
    description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계. 패치별 트렌드와 무기 조합을 분석해드립니다.",
    keywords: ["루미아 스탯", "이터널리턴 캐릭터 분석", "이터널리턴 캐릭터 빌드", "이터널리턴 캐릭터 통계", "이터널리턴 무기 추천"],
    openGraph: {
      title: "캐릭터 분석 | 루미아 스탯 LumiaStats",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
      url: "/character-analysis",
    },
    twitter: {
      title: "캐릭터 분석 | LumiaStats",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
    },
    alternates: { canonical: "/character-analysis" },
  }
}

export default function CharacterAnalysisPage() {
  return (
    <Suspense>
      <CharacterAnalysisClient />
    </Suspense>
  )
}
