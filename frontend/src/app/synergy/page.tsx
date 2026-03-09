import type { Metadata } from "next"
import { SynergyClient } from "@/components/features/SynergyClient"

export const metadata: Metadata = {
  title: "3인 조합 추천",
  description: "이터널리턴 최강 3인 조합 추천. 베이지안 통계로 보정된 승률·평균 RP 기반 최적 팀 조합을 찾아보세요. 아군 캐릭터를 선택하면 맞춤 조합을 추천해드립니다.",
  keywords: ["이터널리턴 조합 추천", "이터널리턴 3인 조합", "이터널리턴 트리오", "이터널리턴 팀 조합", "이터널리턴 시너지"],
  openGraph: {
    title: "3인 조합 추천 | LumiaStats",
    description: "이터널리턴 최강 3인 조합 추천. 승률·평균 RP 기반 최적 팀 조합.",
    url: "/synergy",
  },
  twitter: {
    title: "3인 조합 추천 | LumiaStats",
    description: "이터널리턴 최강 3인 조합 추천. 승률·평균 RP 기반 최적 팀 조합.",
  },
  alternates: { canonical: "/synergy" },
}

export default function SynergyPage() {
  return <SynergyClient />
}
