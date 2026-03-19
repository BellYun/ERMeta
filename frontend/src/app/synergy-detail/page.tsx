import type { Metadata } from "next"
import { Suspense } from "react"
import { FocusWeaponPool } from "@/components/features/synergy-detail/FocusWeaponPool"
import { WeaponAllySelector } from "@/components/features/synergy-detail/WeaponAllySelector"
import { SynergyDetailResults } from "@/components/features/synergy-detail/SynergyDetailResults"
import {
  FocusPoolSkeleton,
  AllySelectorSkeleton,
  ResultSkeleton,
} from "@/components/features/synergy/SynergySkeleton"

export const metadata: Metadata = {
  title: "상세 조합 추천 - 무기+특성 포함 | 이리와지지 ER&GG",
  description: "이터널리턴 무기와 메인 특성까지 포함한 상세 3인 조합 추천. 베이지안 통계 기반 최적 팀 조합 분석.",
  keywords: ["이리와지지", "ERGG", "이터널리턴 조합 추천", "이터널리턴 무기 조합", "이터널리턴 특성 조합", "이터널리턴 상세 조합"],
  openGraph: {
    title: "상세 조합 추천 | 이리와지지 ER&GG",
    description: "무기와 메인 특성까지 포함한 상세 3인 조합 추천.",
    url: "/synergy-detail",
  },
  alternates: { canonical: "/synergy-detail" },
}

export default function SynergyDetailPage() {
  return (
    <>
      <section className="text-center py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          상세 조합 추천
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          무기 + 메인 특성 포함 · 조합 클릭 시 특성별 브레이크다운 확인
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {/* Island 1: 내 캐릭터 풀 (localStorage) */}
        <Suspense fallback={<FocusPoolSkeleton />}>
          <FocusWeaponPool />
        </Suspense>

        {/* Island 2: 아군 + 무기 선택 (URL params) */}
        <Suspense fallback={<AllySelectorSkeleton />}>
          <WeaponAllySelector />
        </Suspense>

        {/* Island 3: 결과 (URL + localStorage → API) */}
        <Suspense fallback={<ResultSkeleton />}>
          <SynergyDetailResults />
        </Suspense>
      </div>
    </>
  )
}
