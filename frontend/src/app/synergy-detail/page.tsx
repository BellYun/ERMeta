import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import {
  FocusPoolSkeleton,
  AllySelectorSkeleton,
  ResultSkeleton,
} from "@/components/features/synergy/SynergySkeleton";

/**
 * ssr: false → 서버에서는 skeleton fallback만 렌더링.
 * 클라이언트에서 JS 로드 완료 시 컴포넌트 렌더 + 이벤트 핸들러 동시 부착.
 * 이로써 "보이지만 터치 안 되는" hydration gap이 제거됨.
 */
const FocusWeaponPool = dynamic(
  () =>
    import("@/components/features/synergy-detail/FocusWeaponPool").then((m) => m.FocusWeaponPool),
  { ssr: false, loading: () => <FocusPoolSkeleton /> }
);
const WeaponAllySelector = dynamic(
  () =>
    import("@/components/features/synergy-detail/WeaponAllySelector").then(
      (m) => m.WeaponAllySelector
    ),
  { ssr: false, loading: () => <AllySelectorSkeleton /> }
);
const SynergyDetailResults = dynamic(
  () =>
    import("@/components/features/synergy-detail/SynergyDetailResults").then(
      (m) => m.SynergyDetailResults
    ),
  { ssr: false, loading: () => <ResultSkeleton /> }
);

export const metadata: Metadata = {
  title: "상세 조합 추천 - 무기+특성 포함 | 이리와지지 ER&GG",
  description:
    "이터널리턴 무기와 메인 특성까지 포함한 상세 3인 조합 추천. 베이지안 통계 기반 최적 팀 조합 분석.",
  keywords: [
    "이리와지지",
    "ERGG",
    "이터널리턴 조합 추천",
    "이터널리턴 무기 조합",
    "이터널리턴 특성 조합",
    "이터널리턴 상세 조합",
  ],
  openGraph: {
    title: "상세 조합 추천 | 이리와지지 ER&GG",
    description: "무기와 메인 특성까지 포함한 상세 3인 조합 추천.",
    url: "/synergy-detail",
  },
  alternates: { canonical: "/synergy-detail" },
};

export default function SynergyDetailPage() {
  return (
    <>
      {/* ── Hero Zone ── */}
      <section className="synergy-hero -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex flex-col gap-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/20 px-2.5 py-1">
                <svg
                  className="h-3 w-3 text-[var(--color-accent-gold)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
                  />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-accent-gold)] uppercase tracking-[0.1em]">
                  Advanced
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">
                  BETA
                </span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--color-muted-foreground)]">
                데이터 수집 중 · 표본 증가 시 정확도 향상
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
              상세 조합 추천
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg">
              무기 + 메인 특성까지 포함한 심층 분석 · 조합 클릭 시 특성별 브레이크다운 확인
            </p>

            {/* Flow Steps */}
            <div className="flex items-center gap-2 mt-2">
              <StepIndicator step={1} label="풀 설정" sublabel="캐릭터+무기" color="purple" />
              <StepConnector />
              <StepIndicator step={2} label="아군 선택" sublabel="캐릭터+무기" color="blue" />
              <StepConnector />
              <StepIndicator step={3} label="상세 분석" sublabel="특성별 비교" color="gold" />
            </div>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-7">
        {/* ── Step 1: Weapon Pool ── */}
        <section className="reveal reveal-d1">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-purple)]/15 text-[10px] font-bold text-[var(--color-accent-purple)]">
              1
            </span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">내 캐릭터 풀</h2>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              선택사항 · 캐릭터+무기 단위 필터링
            </span>
          </div>
          <SectionErrorBoundary sectionName="캐릭터 풀">
            <FocusWeaponPool />
          </SectionErrorBoundary>
        </section>

        {/* ── Step 2 & 3: Selector + Results ── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left: Weapon Ally Selector */}
          <section className="reveal reveal-d2 w-full lg:w-[340px] shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-primary)]/15 text-[10px] font-bold text-[var(--color-primary)]">
                2
              </span>
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">아군 선택</h2>
            </div>
            <SectionErrorBoundary sectionName="아군 선택">
              <WeaponAllySelector />
            </SectionErrorBoundary>
          </section>

          {/* Right: Results */}
          <section className="reveal reveal-d3 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-gold)]/15 text-[10px] font-bold text-[var(--color-accent-gold)]">
                3
              </span>
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">추천 조합</h2>
            </div>
            <SectionErrorBoundary sectionName="추천 조합">
              <SynergyDetailResults />
            </SectionErrorBoundary>
          </section>
        </div>
      </div>
    </>
  );
}

/* ── Step Flow Components ── */

function StepIndicator({
  step,
  label,
  sublabel,
  color,
}: {
  step: number;
  label: string;
  sublabel: string;
  color: "purple" | "blue" | "gold";
}) {
  const colorMap = {
    purple: {
      bg: "bg-[var(--color-accent-purple)]/10",
      border: "border-[var(--color-accent-purple)]/30",
      text: "text-[var(--color-accent-purple)]",
    },
    blue: {
      bg: "bg-[var(--color-primary)]/10",
      border: "border-[var(--color-primary)]/30",
      text: "text-[var(--color-primary)]",
    },
    gold: {
      bg: "bg-[var(--color-accent-gold)]/10",
      border: "border-[var(--color-accent-gold)]/30",
      text: "text-[var(--color-accent-gold)]",
    },
  };
  const c = colorMap[color];

  return (
    <div className={`flex items-center gap-2 rounded-lg ${c.bg} border ${c.border} px-2.5 py-1.5`}>
      <span className={`text-xs font-bold ${c.text}`}>{step}</span>
      <div className="flex flex-col">
        <span className={`text-[11px] font-semibold ${c.text}`}>{label}</span>
        <span className="text-[9px] text-[var(--color-muted-foreground)] hidden sm:block">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

function StepConnector() {
  return (
    <div className="flex-shrink-0 w-4 sm:w-6 h-px bg-gradient-to-r from-[var(--color-border)] to-[var(--color-border-light)]" />
  );
}
