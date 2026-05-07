import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 피오라 (3)
  {
    characterCode: 3,
    patch: "11.0",
    changes: [
      {
        target: "플레슈(R) - UI 개선",
        changeType: "rework",
        description: ["남은 사용 횟수가 체력바 아래에 표시되도록 개선되었습니다."],
      },
    ],
  },
  // 나딘 (6)
  {
    characterCode: 6,
    patch: "11.0",
    changes: [
      {
        target: "늑대 맹습(R) - UI 개선",
        changeType: "rework",
        description: ["지속 시간이 체력바 아래에 표시되도록 개선되었습니다."],
      },
    ],
  },
  // 쇼이치 (18)
  {
    characterCode: 18,
    patch: "11.0",
    changes: [
      {
        target: "부당거래(P) - UI 개선",
        changeType: "rework",
        description: ["중첩이 체력바 아래에 표시되도록 개선되었습니다."],
      },
    ],
  },
  // 바냐 (64)
  {
    characterCode: 64,
    patch: "11.0",
    changes: [
      {
        target: "쪽빛 바람(W) - UI 개선",
        changeType: "rework",
        description: ["지속 시간이 체력바 아래에 표시되도록 개선되었습니다."],
      },
    ],
  },
  // 히스이 (78)
  {
    characterCode: 78,
    patch: "11.0",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력을 상향하여 전반적인 내구도를 보강합니다."],
        valueSummary: "940 → 980",
      },
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력을 상향하여 부족한 내구도를 보완합니다."],
        valueSummary: "52 → 54",
      },
    ],
  },
  // 블레어 (84)
  {
    characterCode: 84,
    patch: "11.0",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력을 상향하여 초반 라인전 안정성을 강화합니다."],
        valueSummary: "940 → 970",
      },
      {
        target: "블레이드 시프트(P) - 체력 회복량",
        changeType: "buff",
        description: ["추가 공격력 계수를 상향하여 지속 교전 시의 유지력을 보완합니다."],
        valueSummary: "입힌 피해의 8(+추가 공격력의 4%)% → 8(+추가 공격력의 5%)%",
      },
    ],
  },
];
