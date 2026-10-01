import type { PatchBalanceContextSection } from "./12.4-balance-context";

// Lumia Island changes from the official 2026-10-01 patch note.
// Cobalt-only balance modifiers, cosmetics and shop changes are excluded.
export const PATCH_12_5_SOURCE = "https://playeternalreturn.com/posts/news/3867?hl=ko-KR";

export const PATCH_12_5_BALANCE_CONTEXT: readonly PatchBalanceContextSection[] = [
  {
    title: "매칭·특성",
    entries: [
      { target: "아시아 1 최상위 매칭", value: "미스릴 8,600 RP 이상으로 제한" },
      { target: "벽력 · 추가 공격력 계수", value: "45% → 65% (스킬 증폭 26% 유지)" },
      { target: "와류 · 최대 체력 회복 계수", value: "7% → 8%" },
    ],
  },
  {
    title: "무기 스킬·무기",
    entries: [
      { target: "도끼 · 피의 나선(D) 스킬 증폭 계수", value: "25% → 30%" },
      { target: "아르카나 · VF 매개(D) 스킬 증폭 계수", value: "18% → 20%" },
      { target: "VF 의수 · 블랙맘바킹 모든 피해 흡혈", value: "10% → 8%" },
      { target: "VF 의수 · 블랙맘바킹-TL 모든 피해 흡혈", value: "10% → 8%" },
    ],
  },
  {
    title: "방어구",
    entries: [
      { target: "옷 · 핏빛 망토 스킬 증폭", value: "22 → 14" },
      { target: "옷 · 핏빛 망토 부패 대상 최대 체력 계수", value: "0.9(+스킬 증폭 0.2%)% → 1.2(+스킬 증폭 0.2%)%" },
      { target: "머리 · 백야의 관 스킬 증폭", value: "70 → 75" },
      { target: "머리 · 우주 비행사의 헬멧 스킬 증폭", value: "57 → 50" },
      { target: "머리 · 우주 비행사의 헬멧 부패 대상 최대 체력 계수", value: "0.9(+스킬 증폭 0.2%)% → 1.2(+스킬 증폭 0.2%)%" },
      { target: "머리 · 황야의 별 추적 바늘 추가 타격 탐지 범위", value: "크게 증가" },
      { target: "팔 · 별 조각 스킬 증폭", value: "85 → 80" },
      { target: "팔 · 별 조각 최대 체력", value: "250 → 230" },
      { target: "팔 · 클라다 반지 스킬 증폭", value: "55 → 60" },
      { target: "팔 · 토템 방어력", value: "13 → 11" },
    ],
  },
];
