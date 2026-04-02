import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCharacterName } from "@/lib/characterMap"
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient"
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary"
import { fetchPatches, fetchStats } from "@/components/features/character-analysis/utils"
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants"
import { TierGroup } from "@/utils/tier"

/** 1시간마다 ISR 재생성 */
export const revalidate = 3600

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<{ weapon?: string }>
}

/** 87개 캐릭터 페이지를 빌드 타임에 정적 생성 */
export async function generateStaticParams() {
  return CHARACTER_CODES.map((code) => ({ code: String(code) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params
  const code = parseInt(rawCode, 10)
  const name = !isNaN(code) ? getCharacterName(code) : null

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
        url: `/character/${code}`,
      },
      twitter: {
        title: `${title} | ER&GG`,
        description,
      },
      alternates: { canonical: `/character/${code}` },
    }
  }

  return {
    title: "캐릭터 분석",
    description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계. 패치별 트렌드와 무기 조합을 분석해드립니다.",
    keywords: ["이리와지지", "ERGG", "이터널리턴 캐릭터 분석", "이터널리턴 캐릭터 빌드", "이터널리턴 캐릭터 통계", "이터널리턴 무기 추천"],
    openGraph: {
      title: "캐릭터 분석 | 이리와지지 ER&GG",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
      url: "/character",
    },
    twitter: {
      title: "캐릭터 분석 | ER&GG",
      description: "이터널리턴 캐릭터별 승률, 픽률, 평균 RP, 최적 빌드 통계.",
    },
    alternates: { canonical: "/character" },
  }
}

/**
 * 캐릭터 분석 페이지 — SSG + ISR
 * 87개 캐릭터를 빌드 타임에 정적 생성, 30분 주기로 재검증
 */
export default async function CharacterPage({ params, searchParams }: Props) {
  const { code: rawCode } = await params
  const { weapon: rawWeapon } = await searchParams
  const code = parseInt(rawCode, 10)
  const weaponCode = rawWeapon ? parseInt(rawWeapon, 10) : null
  const initialWeapon = weaponCode && !isNaN(weaponCode) ? weaponCode : null

  if (isNaN(code) || !CHARACTER_CODES.includes(code)) {
    notFound()
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com"

  const patches = await fetchPatches(base)
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? fetchStats(code, patches[0], TierGroup.MITHRIL, base) : null,
    patches[1] ? fetchStats(code, patches[1], TierGroup.MITHRIL, base) : null,
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
              initialCode={code}
              initialWeapon={initialWeapon}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </>
  )
}
