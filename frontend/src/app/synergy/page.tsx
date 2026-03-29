import type { Metadata } from "next"
import { Suspense } from "react"
import { getCharacterName } from "@/lib/characterMap"
import { FocusCharacterPool } from "@/components/features/synergy/FocusCharacterPool"
import { AllySelector } from "@/components/features/synergy/AllySelector"
import { SynergyResults } from "@/components/features/synergy/SynergyResults"
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary"
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
    <>
      {/* ── Hero Zone ── */}
      <section className="synergy-hero -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex flex-col gap-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-purple)]/10 border border-[var(--color-accent-purple)]/20 px-2.5 py-1">
                <svg className="h-3 w-3 text-[var(--color-accent-purple)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 0 1 3.41 17.41L3 17M12 9.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm8.25 1.5a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-accent-purple)] uppercase tracking-[0.1em]">
                  Team Builder
                </span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--color-muted-foreground)]">
                시즌 10 · 1,200,000+판 분석
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
              3인 조합 추천
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg">
              베이지안 통계로 보정된 승률과 평균 RP 기반으로 최적의 팀 조합을 찾아보세요
            </p>

            {/* Flow Steps */}
            <div className="flex items-center gap-2 mt-2">
              <StepIndicator step={1} label="풀 설정" sublabel="선택사항" />
              <StepConnector />
              <StepIndicator step={2} label="아군 선택" sublabel="1~2명" />
              <StepConnector />
              <StepIndicator step={3} label="결과 확인" sublabel="추천순" />
            </div>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-7">
        {/* ── Step 1: Character Pool ── */}
        <section className="reveal reveal-d1">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-purple)]/15 text-[10px] font-bold text-[var(--color-accent-purple)]">1</span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">내 캐릭터 풀</h2>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">선택사항 · 내 캐릭터만 필터링</span>
          </div>
          <SectionErrorBoundary sectionName="캐릭터 풀">
            <Suspense fallback={<FocusPoolSkeleton />}>
              <FocusCharacterPool />
            </Suspense>
          </SectionErrorBoundary>
        </section>

        {/* ── Step 2 & 3: Selector + Results ── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left: Ally Selector */}
          <section className="reveal reveal-d2 w-full lg:w-[340px] shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-primary)]/15 text-[10px] font-bold text-[var(--color-primary)]">2</span>
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">아군 선택</h2>
            </div>
            <SectionErrorBoundary sectionName="아군 선택">
              <Suspense fallback={<AllySelectorSkeleton />}>
                <AllySelector />
              </Suspense>
            </SectionErrorBoundary>
          </section>

          {/* Right: Results */}
          <section className="reveal reveal-d3 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-gold)]/15 text-[10px] font-bold text-[var(--color-accent-gold)]">3</span>
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">추천 조합</h2>
            </div>
            <SectionErrorBoundary sectionName="추천 조합">
              <Suspense fallback={<ResultSkeleton />}>
                <SynergyResults />
              </Suspense>
            </SectionErrorBoundary>
          </section>
        </div>
      </div>
    </>
  )
}

/* ── Step Flow Components ── */

function StepIndicator({ step, label, sublabel }: { step: number; label: string; sublabel: string }) {
  const colors = {
    1: { bg: "bg-[var(--color-accent-purple)]/10", border: "border-[var(--color-accent-purple)]/30", text: "text-[var(--color-accent-purple)]" },
    2: { bg: "bg-[var(--color-primary)]/10", border: "border-[var(--color-primary)]/30", text: "text-[var(--color-primary)]" },
    3: { bg: "bg-[var(--color-accent-gold)]/10", border: "border-[var(--color-accent-gold)]/30", text: "text-[var(--color-accent-gold)]" },
  }[step]!

  return (
    <div className={`flex items-center gap-2 rounded-lg ${colors.bg} border ${colors.border} px-2.5 py-1.5`}>
      <span className={`text-xs font-bold ${colors.text}`}>{step}</span>
      <div className="flex flex-col">
        <span className={`text-[11px] font-semibold ${colors.text}`}>{label}</span>
        <span className="text-[9px] text-[var(--color-muted-foreground)] hidden sm:block">{sublabel}</span>
      </div>
    </div>
  )
}

function StepConnector() {
  return (
    <div className="flex-shrink-0 w-4 sm:w-6 h-px bg-gradient-to-r from-[var(--color-border)] to-[var(--color-border-light)]" />
  )
}
