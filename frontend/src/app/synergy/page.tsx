import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "조합 추천 | 이리와지지 ER&GG",
  description: "이터널리턴 3인 조합 추천. 무기+특성 포함 상세 조합 분석으로 이동하세요.",
  alternates: { canonical: "/synergy-detail" },
}

export default function SynergyPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/20">
          <svg className="h-7 w-7 text-[var(--color-accent-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-foreground)] tracking-tight">
          조합 추천이 업그레이드됐어요
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-md">
          무기 + 메인 특성까지 포함한 상세 조합 추천으로 더 정확한 팀 조합을 찾아보세요
        </p>
      </div>
      <Link
        href="/synergy-detail"
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
      >
        상세 조합 추천 바로가기
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  )
}
