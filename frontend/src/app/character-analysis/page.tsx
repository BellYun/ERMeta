import type { Metadata } from "next"
import { Suspense } from "react"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"

export const metadata: Metadata = {
  title: "캐릭터 분석",
  description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계. 패치별 트렌드와 무기 조합을 분석해드립니다.",
  keywords: ["이터널리턴 캐릭터 분석", "이터널리턴 캐릭터 빌드", "이터널리턴 캐릭터 통계", "이터널리턴 무기 추천"],
  openGraph: {
    title: "캐릭터 분석 | LumiaStats",
    description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
    url: "/character-analysis",
  },
  twitter: {
    title: "캐릭터 분석 | LumiaStats",
    description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
  },
  alternates: { canonical: "/character-analysis" },
}

export default function CharacterAnalysisPage() {
  return (
    <Suspense>
      <CharacterAnalysisClient />
    </Suspense>
  )
}
