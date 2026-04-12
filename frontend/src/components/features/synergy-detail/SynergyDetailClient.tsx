"use client";

import dynamic from "next/dynamic";
import { SynergyDetailInteractiveSkeleton } from "@/components/features/synergy/SynergySkeleton";

/**
 * Iter6: 3개 dynamic import를 단일 청크로 통합.
 * - 이전(iter2~5): FocusWeaponPool, WeaponAllySelector, SynergyDetailResults 각각 dynamic →
 *   모바일에서 각 청크 RTT가 직렬로 누적, hydration 도착 시점이 개별적으로 벌어져
 *   "1번 섹션은 탭 가능, 2번은 아직"이라는 체감 지연 발생.
 * - 현재: SynergyDetailInteractive 하나만 dynamic → 네트워크 요청 -66%,
 *   세 섹션이 동시에 interactive. ssr: false 유지로 initial HTML 경량 유지.
 */
const SynergyDetailInteractive = dynamic(
  () => import("./SynergyDetailInteractive").then((m) => m.SynergyDetailInteractive),
  { ssr: false, loading: () => <SynergyDetailInteractiveSkeleton /> }
);

export function SynergyDetailClient() {
  return <SynergyDetailInteractive />;
}
