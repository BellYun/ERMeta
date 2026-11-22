import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76,
    patch: "13.1",
    changes: [
      {
        target: "그릇된 집착(E) 돌진 속도",
        changeType: "nerf",
        description: [],
        valueSummary: "15m/s → 14m/s",
      },
    ],
  },
  {
    characterCode: 85,
    patch: "13.1",
    changes: [
      {
        target: "다운버스트(R) 사거리",
        changeType: "buff",
        description: [],
        valueSummary: "5m → 5.5m",
      },
      {
        target: "다운버스트(R) 에어본 지속 시간",
        changeType: "buff",
        description: [],
        valueSummary: "0.8초 → 1초",
      },
    ],
  },
  {
    characterCode: 84,
    patch: "13.1",
    changes: [
      {
        target: "시프트 러시(D) 피해량",
        changeType: "nerf",
        description: [],
        valueSummary: "(+공격력의 70/90/110/130%) → (+공격력의 65/85/105/125%)",
      },
    ],
  },
  {
    characterCode: 15,
    patch: "13.1",
    changes: [
      {
        target: "윌슨! 도와줘(Q) 경로 피해량",
        changeType: "buff",
        description: [],
        valueSummary: "스킬 증폭의 35% → 스킬 증폭의 40%",
      },
    ],
  },
  {
    characterCode: 5,
    patch: "13.1",
    changes: [
      {
        target: "암기 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: [],
        valueSummary: "4% → 4.2%",
        weaponMasteryCode: 6,
      },
    ],
  },
  {
    characterCode: 70,
    patch: "13.1",
    changes: [
      {
        target: "암기 무기 숙련도 레벨 당 공격 속도",
        changeType: "nerf",
        description: [],
        valueSummary: "3.7% → 3.4%",
        weaponMasteryCode: 6,
      },
    ],
  },
  {
    characterCode: 87,
    patch: "13.1",
    changes: [
      {
        target: "진실의 거울 / 거짓의 거울(W) 강화된 단죄의 섬광 적중 시 쿨다운 감소",
        changeType: "nerf",
        description: [],
        valueSummary: "20/25/30% → 15/20/25%",
      },
      {
        target: "진실의 거울 / 거짓의 거울(W) 쿨다운",
        changeType: "nerf",
        description: [],
        valueSummary: "6초 → 7초",
      },
    ],
  },
  {
    characterCode: 3,
    patch: "13.1",
    changes: [
      {
        target: "플레슈(R) 1타, 2타 피해량",
        changeType: "buff",
        description: [],
        valueSummary: "스킬 증폭의 45% → 스킬 증폭의 50%",
      },
    ],
  },
  {
    characterCode: 7,
    patch: "13.1",
    changes: [
      {
        target: "도그파이트(P) 활성화에 필요한 중첩 수",
        changeType: "buff",
        description: [],
        valueSummary: "10/9/8 → 9/8/7",
      },
    ],
  },
];
