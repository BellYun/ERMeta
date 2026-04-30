"use client";

import { Suspense } from "react";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";

/**
 * 순수 CSR 테스트 페이지 — 서버 데이터 프리페치 없이 클라이언트에서 전부 로드.
 * ISR 페이지(/character/1)와 비교 측정용. 배포 후 삭제 예정.
 */
export default function CharacterTestCSR() {
  return (
    <>
      {/* ── Hero Zone (정적 마크업) ── */}
      <section className="analysis-hero -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1">
                <svg
                  className="h-3 w-3 text-[var(--color-primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                  />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-primary)] uppercase tracking-[0.1em]">
                  Analytics
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-danger)] uppercase">
                  CSR TEST
                </span>
              </span>
            </div>
            <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
              캐릭터 분석 (CSR)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg">
              서버 프리페치 없이 클라이언트에서 전부 로드하는 테스트 페이지
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="reveal reveal-d2 mt-5 sm:mt-7 overflow-x-auto">
        <SectionErrorBoundary sectionName="캐릭터 분석">
          <Suspense>
            <CharacterAnalysisClient code={1} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </>
  );
}
