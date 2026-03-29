import type { Metadata } from "next"
import { Suspense } from "react"
import { getCharacterName } from "@/lib/characterMap"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary"
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
 */
export default async function CharacterAnalysisPage({ searchParams }: Props) {
  const { character } = await searchParams
  const initialCode = character ? parseInt(character, 10) : 1
  const validCode = !isNaN(initialCode) ? initialCode : 1

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"

  const patches = await fetchPatches(base)
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? fetchStats(validCode, patches[0], TierGroup.MITHRIL, base) : null,
    patches[1] ? fetchStats(validCode, patches[1], TierGroup.MITHRIL, base) : null,
  ])

  return (
    <>
      {/* ── Hero Zone ── */}
      <section className="analysis-hero -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex flex-col gap-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1">
                <svg className="h-3 w-3 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-primary)] uppercase tracking-[0.1em]">
                  Analytics
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">BETA</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--color-muted-foreground)]">
                개발 중 · 패치 {patches[0] ?? "—"} 기준
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
              캐릭터 분석
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg">
              캐릭터별 승률 · 빌드 · 패치 트렌드 · 장비 통계 심층 분석
            </p>
            <p className="text-[11px] text-[var(--color-warning)]/80 mt-0.5">
              일부 아이템 이미지가 누락되거나 잘못 표시될 수 있습니다
            </p>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="reveal reveal-d2 mt-5 sm:mt-7 overflow-x-auto">
        <SectionErrorBoundary sectionName="캐릭터 분석">
          <Suspense>
            <CharacterAnalysisClient
              initialPatches={patches}
              initialStats={initialStats}
              initialPrevStats={initialPrevStats}
              initialCode={validCode}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </>
  )
}
