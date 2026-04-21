import type { Metadata } from "next";
import { SynergyDetailClient } from "@/components/features/synergy-detail/SynergyDetailClient";
import { getCharacterName } from "@/lib/characterMap";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseAllyCode(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const code = Number.parseInt(value, 10);
  return Number.isFinite(code) && code > 0 ? code : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const ally1 = parseAllyCode(params.ally1);
  const ally2 = parseAllyCode(params.ally2);

  const name1 = ally1 ? getCharacterName(ally1) : null;
  const name2 = ally2 ? getCharacterName(ally2) : null;

  const headline =
    name1 && name2
      ? `${name1} + ${name2} 조합 추천`
      : name1
        ? `${name1} 포함 조합 추천`
        : "상세 조합 추천";

  const description =
    name1 && name2
      ? `${name1} + ${name2} 조합의 최적 3번째 픽을 Bayesian 통계로 분석. 무기·특성 포함 상세 조합 추천.`
      : name1
        ? `${name1}과 함께할 최적 2~3번째 픽을 Bayesian 통계로 분석합니다.`
        : "이터널리턴 무기와 메인 특성까지 포함한 상세 3인 조합 추천. 베이지안 통계 기반 최적 팀 조합 분석.";

  const ogQuery = new URLSearchParams();
  if (ally1) ogQuery.set("ally1", String(ally1));
  if (ally2) ogQuery.set("ally2", String(ally2));
  const ogImageUrl = `/api/og/synergy${ogQuery.size ? `?${ogQuery.toString()}` : ""}`;

  return {
    title: `${headline} - 무기+특성 포함 | 이리와지지 ER&GG`,
    description,
    keywords: [
      "이리와지지",
      "ERGG",
      "이터널리턴 조합 추천",
      "이터널리턴 무기 조합",
      "이터널리턴 특성 조합",
      "이터널리턴 상세 조합",
      ...(name1 ? [`${name1} 조합`] : []),
      ...(name2 ? [`${name2} 조합`] : []),
    ],
    openGraph: {
      title: `${headline} | 이리와지지 ER&GG`,
      description,
      url: "/synergy-detail",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${headline} | 이리와지지 ER&GG`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: "/synergy-detail" },
  };
}

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

      <SynergyDetailClient />
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
