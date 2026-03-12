import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "이터널리턴 메타 분석 서비스",
  description: "이리와지지(ER&GG) - 이터널리턴 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석. 다이아~상위 1000위 실전 데이터 기반.",
  openGraph: {
    title: "이리와지지 ER&GG | 이터널리턴 메타 분석 서비스",
    description: "실전 데이터 기반 캐릭터 티어, 조합 추천, 통계 분석",
    url: "/landing",
  },
  twitter: {
    title: "이리와지지 ER&GG | 이터널리턴 메타 분석 서비스",
    description: "실전 데이터 기반 캐릭터 티어, 조합 추천, 통계 분석",
  },
  alternates: { canonical: "/landing" },
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: "메타 분석",
    description: "패치별 캐릭터 티어표, 승률·픽률·평균 RP를 한눈에. 이번 패치 떡상 캐릭터도 놓치지 마세요.",
    badge: "실시간",
    href: "/",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    title: "3인 조합 추천",
    description: "시너지 점수 기반 최적의 트리오 조합을 추천. 팀원과 함께 승률 높은 조합을 찾아보세요.",
    badge: "시너지",
    href: "/synergy",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    title: "캐릭터 분석",
    description: "특성·장비 빌드, 코어 아이템 완성도, 게임 길이별 성과까지. 내 캐릭터를 깊이 파헤쳐 보세요.",
    badge: "딥다이브",
    href: "/character-analysis",
  },
]

const STATS = [
  { value: "다이아~IN1000", label: "분석 대상 티어" },
  { value: "매 패치", label: "데이터 갱신 주기" },
  { value: "60+", label: "분석 가능 캐릭터" },
  { value: "실전 데이터", label: "공식 API 기반" },
]

const DIFFERENTIATORS = [
  {
    title: "실전 데이터만",
    description: "다이아몬드~상위 1000위 고티어 매칭 데이터만 수집합니다. 낮은 티어 노이즈 없이 진짜 메타를 보여드려요.",
  },
  {
    title: "패치 단위 추적",
    description: "패치가 바뀔 때마다 자동으로 새 데이터를 수집하고 비교합니다. 이전 패치 대비 변화를 한눈에 확인하세요.",
  },
  {
    title: "3인 조합 시너지",
    description: "단순 캐릭터 순위가 아닌, 실제 함께 플레이할 때의 시너지를 분석합니다. 팀 게임에 맞는 추천을 제공합니다.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col -mx-4 -mt-6">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-[var(--color-accent-purple)]/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-purple)] flex items-center justify-center text-lg font-black text-white shadow-[0_0_24px_var(--color-primary-glow)]">
              ER
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[var(--color-foreground)] to-[var(--color-muted-foreground)] bg-clip-text text-transparent">
                ER&GG
              </span>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                이리와지지
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-foreground)] leading-tight">
              데이터로 보는{" "}
              <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent-purple)] bg-clip-text text-transparent">
                이터널리턴 메타
              </span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--color-muted-foreground)] max-w-xl mx-auto leading-relaxed">
              고티어 실전 데이터 기반 캐릭터 티어, 조합 추천, 빌드 분석.
              <br className="hidden sm:block" />
              감이 아닌 데이터로 승리하세요.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link href="/">
              <Button size="lg" className="px-8 text-base font-semibold shadow-[0_0_20px_var(--color-primary-glow)]">
                메타 분석 보기
              </Button>
            </Link>
            <Link href="/synergy">
              <Button variant="outline" size="lg" className="px-8 text-base">
                조합 추천 보기
              </Button>
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-8 w-full max-w-2xl">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-lg sm:text-xl font-bold text-[var(--color-primary)]">
                  {stat.value}
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      {/* Features Section */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="default" className="mb-3">핵심 기능</Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              이터널리턴, 더 똑똑하게 플레이하세요
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
              매 패치마다 업데이트되는 실전 데이터 기반 분석
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <Card className="h-full group hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all duration-300 cursor-pointer">
                  <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/20 transition-colors">
                        {feature.icon}
                      </div>
                      <Badge variant="secondary">{feature.badge}</Badge>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-foreground)] mb-1.5">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium mt-auto">
                      바로가기
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      {/* Why ER&GG Section */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="gold" className="mb-3">차별점</Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              왜 이리와지지인가요?
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
              다른 통계 사이트와는 다릅니다
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {DIFFERENTIATORS.map((item, i) => (
              <div
                key={item.title}
                className="relative p-5 sm:p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50"
              >
                <div className="absolute -top-3 left-5">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)] text-xs font-bold border border-[var(--color-accent-gold)]/30">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-foreground)] mt-1 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      {/* Final CTA Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="relative max-w-2xl mx-auto text-center">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[var(--color-primary)]/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative flex flex-col items-center gap-5">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              지금 바로 메타를 확인하세요
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] max-w-md">
              매 패치마다 자동 업데이트되는 실전 데이터.
              북마크 해두고 패치 때마다 확인하세요.
            </p>
            <Link href="/">
              <Button size="lg" className="px-10 text-base font-semibold shadow-[0_0_20px_var(--color-primary-glow)]">
                지금 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
      <footer className="px-4 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-purple)] flex items-center justify-center text-[8px] font-black text-white">
              ER
            </div>
            <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">
              ER&GG
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]/60">
            이터널리턴 공식 API 기반 통계 분석 서비스
          </p>
        </div>
      </footer>
    </div>
  )
}
