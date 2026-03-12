import type { Metadata } from "next"
import { Suspense } from "react"
import { SynergyClient } from "@/components/features/SynergyClient"
import { getCharacterName } from "@/lib/characterMap"

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

export default function SynergyPage() {
  return (
    <Suspense>
      <SynergyClient />
    </Suspense>
  )
}
