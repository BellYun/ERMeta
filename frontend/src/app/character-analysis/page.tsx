import type { Metadata } from "next"
import { Suspense } from "react"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"

export const metadata: Metadata = {
  title: "캐릭터 분석 | ERMeta",
  description: "이터널리턴 개별 캐릭터 통계, 빌드, 시너지 분석.",
}

export default function CharacterAnalysisPage() {
  return (
    <Suspense>
      <CharacterAnalysisClient />
    </Suspense>
  )
}
