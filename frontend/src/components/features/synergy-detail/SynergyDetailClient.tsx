"use client";

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
const FocusWeaponPool = dynamic(() => import("./FocusWeaponPool").then((m) => m.FocusWeaponPool), {
  ssr: false,
  loading: () => <FocusPoolSkeleton />,
});
const WeaponAllySelector = dynamic(
  () => import("./WeaponAllySelector").then((m) => m.WeaponAllySelector),
  { ssr: false, loading: () => <AllySelectorSkeleton /> }
);
const SynergyDetailResults = dynamic(
  () => import("./SynergyDetailResults").then((m) => m.SynergyDetailResults),
  { ssr: false, loading: () => <ResultSkeleton /> }
);

export function SynergyDetailClient() {
  return (
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
  );
}
