import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 아야 (2)
  {
    characterCode: 2,
    patch: "11.2",
    changes: [
      {
        target: "기본 공격력 (돌격 소총)",
        changeType: "nerf",
        description: ["대부분의 구간에서 높은 지표를 기록해 기본 공격력을 하향했습니다."],
        valueSummary: "43 → 40",
      },
    ],
  },
  // 매그너스 (4)
  {
    characterCode: 4,
    patch: "11.2",
    changes: [
      {
        target: "17대 1(W) - 스킬 증폭 계수",
        changeType: "buff",
        description: ["낮은 스킬 증폭 효율을 보완하기 위해 스킬 증폭 계수를 상향했습니다."],
        valueSummary:
          "16/22/28/34/40(+추가 공격력의 45%)(+스킬 증폭의 18%)(+적 최대 체력의 2.5%) → (+스킬 증폭의 20%)",
      },
    ],
  },
  // 자히르 (5)
  {
    characterCode: 5,
    patch: "11.2",
    changes: [
      {
        target: "사신의 눈(P) - 피해량",
        changeType: "buff",
        description: ["전체적인 위력을 보완하기 위해 피해량을 상향했습니다."],
        valueSummary: "30/50/70(+스킬 증폭의 25%) → 40/60/80(+스킬 증폭의 25%)",
      },
      {
        target: "바이바야스트라(E) - 투사체 속도",
        changeType: "buff",
        description: ["적중이 어려운 문제를 개선하기 위해 투사체 속도를 상향했습니다."],
        valueSummary: "7.3m/s → 8.5m/s",
      },
    ],
  },
  // 현우 (7)
  {
    characterCode: 7,
    patch: "11.2",
    changes: [
      {
        target: "발 밟기(Q) - 스킬 증폭 계수",
        changeType: "buff",
        description: [
          "지속적으로 낮은 지표를 기록 중인 톤파 현우의 위력을 보완하기 위해 스킬 증폭 계수를 상향했습니다.",
        ],
        valueSummary:
          "50/100/150/200/250(+추가 공격력의 60%)(+스킬 증폭의 80%) → (+스킬 증폭의 85%)",
      },
    ],
  },
  // 아이솔 (9)
  {
    characterCode: 9,
    patch: "11.2",
    changes: [
      {
        target: "돌격 소총 무기 숙련도 - 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["모든 구간에서 강력해 돌격 소총 무기 숙련도 효과를 하향했습니다."],
        valueSummary: "1.4% → 1.3%",
      },
    ],
  },
  // 혜진 (12)
  {
    characterCode: 12,
    patch: "11.2",
    changes: [
      {
        target: "암기 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["낮은 성과를 보이는 암기 혜진의 무기 숙련도 효과를 강화했습니다."],
        valueSummary: "4.7% → 4.8%",
      },
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: [
          "진입 부담을 덜고 보다 적극적으로 플레이할 수 있도록 기본 내구도를 상향했습니다.",
        ],
        valueSummary: "2.6 → 2.8",
      },
    ],
  },
  // 쇼우 (13)
  {
    characterCode: 13,
    patch: "11.2",
    changes: [
      {
        target: "소스범벅(Q) - 피해량",
        changeType: "buff",
        description: ["부족한 딜링 능력을 보강하기 위해 기본 피해량을 상향했습니다."],
        valueSummary:
          "60/100/140/180/220(+스킬 증폭의 70%)(+대상 현재 체력의 25%) → 80/120/160/200/240",
      },
    ],
  },
  // 레녹스 (20)
  {
    characterCode: 20,
    patch: "11.2",
    changes: [
      {
        target: "휩쓸기(E) - 쿨다운",
        changeType: "nerf",
        description: ["강력한 저지 능력을 견제하기 위해 쿨다운을 늘렸습니다."],
        valueSummary: "8초 → 9초",
      },
    ],
  },
  // 루크 (22)
  {
    characterCode: 22,
    patch: "11.2",
    changes: [
      {
        target: "애프터 서비스(R) - 표식 중첩 당 추가 피해량",
        changeType: "buff",
        description: [
          "공격적인 아이템 세팅에서의 효율을 강화하기 위해 표식 피해 계수를 상향했습니다.",
        ],
        valueSummary:
          "20/45/70(+공격력의 10%)(+대상 최대 체력의 2%) → (+공격력의 13%)(+대상 최대 체력의 2%)",
      },
    ],
  },
  // 캐시 (23)
  {
    characterCode: 23,
    patch: "11.2",
    changes: [
      {
        target: "쌍검 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["지속적으로 낮은 통계를 기록 중인 쌍검 캐시의 위력을 상향했습니다."],
        valueSummary: "4.6% → 4.8%",
      },
    ],
  },
  // 리오 (31)
  {
    characterCode: 31,
    patch: "11.2",
    changes: [
      {
        target: "카에유미(Q) - 화궁 기본 공격 피해량",
        changeType: "nerf",
        description: [
          "원거리에서 뿜어내는 과도한 화력을 견제하기 위해 화궁 기본 공격 피해량을 하향했습니다.",
        ],
        valueSummary: "(공격력의 104%) * (기본 공격 증폭) → (공격력의 103%) * (기본 공격 증폭)",
      },
    ],
  },
  // 윌리엄 (32)
  {
    characterCode: 32,
    patch: "11.2",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["게임 후반부 교전 위력을 보강하기 위해 레벨 당 공격력을 상향했습니다."],
        valueSummary: "4.1 → 4.3",
      },
    ],
  },
  // 나타폰 (34)
  {
    characterCode: 34,
    patch: "11.2",
    changes: [
      {
        target: "스냅샷(Q) - 피해량",
        changeType: "buff",
        description: ["부족한 교전 화력을 보강하기 위해 피해량의 스킬 증폭 계수를 상향했습니다."],
        valueSummary: "50/90/130/170/210(+스킬 증폭의 75%) → (+스킬 증폭의 80%)",
      },
      {
        target: "인스턴트 포토(E) - 이동 속도 감소",
        changeType: "buff",
        description: ["적중 대상이 후속 연계에서 쉽게 벗어나지 못하도록 둔화 효과를 강화했습니다."],
        valueSummary: "50% → 55%",
      },
    ],
  },
  // 얀 (35)
  {
    characterCode: 35,
    patch: "11.2",
    changes: [
      {
        target: "쿼드라곤(R) - 스킬 증폭 계수",
        changeType: "buff",
        description: [
          "낮은 지표를 보이는 톤파 얀의 위력을 보완하기 위해 스킬 증폭 계수를 상향했습니다.",
        ],
        valueSummary: "100/200/300(+추가 공격력의 80%)(+스킬 증폭의 40%) → (+스킬 증폭의 45%)",
      },
    ],
  },
  // 이바 (36)
  {
    characterCode: 36,
    patch: "11.2",
    changes: [
      {
        target: "빛의 트라이어드(Q) - 폭발 피해량",
        changeType: "nerf",
        description: ["대응하기 어려운 견제 위력을 일부 하향하기 위해 폭발 피해량을 낮췄습니다."],
        valueSummary: "45/80/115/150/185(+스킬 증폭의 40%) → 40/70/100/130/160(+스킬 증폭의 40%)",
      },
    ],
  },
  // 다니엘 (37)
  {
    characterCode: 37,
    patch: "11.2",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["매우 낮은 승률을 보완하기 위해 레벨 당 공격력을 상향했습니다."],
        valueSummary: "4.6 → 4.7",
      },
      {
        target: "그림자 이동(E) - 피해량",
        changeType: "buff",
        description: ["후반부 위력을 보완하기 위해 피해량을 상향했습니다."],
        valueSummary: "20/40/60/80/100(+추가 공격력의 55%) → (+추가 공격력의 60%)",
      },
    ],
  },
  // 요한 (41)
  {
    characterCode: 41,
    patch: "11.2",
    changes: [
      {
        target: "찬란한 광휘(Q) - 강화 시 체력 회복량",
        changeType: "nerf",
        description: ["상위권에서 매우 강력해 강화 시 체력 회복량을 하향했습니다."],
        valueSummary: "30/45/60/75/90(+스킬 증폭의 15%) → 20/35/50/65/80(+스킬 증폭의 15%)",
      },
      {
        target: "찬란한 광휘(Q) - 쿨다운",
        changeType: "nerf",
        description: ["보다 신중한 스킬 활용이 요구되도록 쿨다운을 늘렸습니다."],
        valueSummary: "11/10/9/8/7초 → 12/11/10/9/8초",
      },
    ],
  },
  // 비앙카 (42)
  {
    characterCode: 42,
    patch: "11.2",
    changes: [
      {
        target: "흡혈귀(P) - 피해량",
        changeType: "buff",
        description: [
          "내구도가 높은 실험체 상대로도 유의미한 피해를 누적하도록 기본 피해량과 최대 체력 비례 계수를 상향했습니다.",
        ],
        valueSummary:
          "30/65/100(+스킬 증폭의 40%)(+대상 최대 체력의 4%) → 30/70/110(+스킬 증폭의 40%)(+대상 최대 체력의 5%)",
      },
    ],
  },
  // 펠릭스 (49)
  {
    characterCode: 49,
    patch: "11.2",
    changes: [
      {
        target: "창 무기 숙련도 - 레벨 당 기본 공격 증폭",
        changeType: "buff",
        description: [
          "공격적인 아이템을 선택했을 때 더 활약하도록 무기 숙련도 효과를 강화했습니다.",
        ],
        valueSummary: "1.5% → 1.6%",
      },
    ],
  },
  // 엘레나 (50)
  {
    characterCode: 50,
    patch: "11.2",
    changes: [
      {
        target: "겨울 여왕의 영지(P) - 피해량",
        changeType: "buff",
        description: [
          "낮은 스킬 증폭 효율을 개선하고 내구도 높은 적 상대로도 유의미한 피해를 누적하도록 계수를 상향했습니다.",
        ],
        valueSummary:
          "10/30/50(+스킬 증폭의 20%)(+대상 최대 체력의 6/8/10%) → (+스킬 증폭의 30%)(+대상 최대 체력의 7/9/11%)",
      },
    ],
  },
  // 칼라 (54)
  {
    characterCode: 54,
    patch: "11.2",
    changes: [
      {
        target: "석궁 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["전반적인 위력을 보완하기 위해 무기 숙련도 효과를 상향했습니다."],
        valueSummary: "4% → 4.1%",
      },
      {
        target: "작살 기동(E) - 스킬 증폭 계수",
        changeType: "buff",
        description: [
          "상황에 따라 보다 공격적으로 활용할 여지가 생기도록 스킬 증폭 계수를 대폭 상향했습니다.",
        ],
        valueSummary: "60/100/140/180/220(+공격력의 50%)(+스킬 증폭의 60%) → (+스킬 증폭의 80%)",
      },
    ],
  },
  // 피올로 (56)
  {
    characterCode: 56,
    patch: "11.2",
    changes: [
      {
        target: "쌍절난격(Q1) - 강화 피해량",
        changeType: "nerf",
        description: ["초중반 위력을 덜어내기 위해 강화 피해량을 하향했습니다."],
        valueSummary: "30/40/50/60/70(+스킬 증폭의 25%) → 20/30/40/50/60(+스킬 증폭의 25%)",
      },
      {
        target: "내려치기(Q2) - 이동 속도 감소",
        changeType: "nerf",
        description: ["상대가 거리를 벌릴 여지를 늘리기 위해 이동 속도 감소량을 하향했습니다."],
        valueSummary: "60% → 55%",
      },
    ],
  },
  // 아이작 (59)
  {
    characterCode: 59,
    patch: "11.2",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["내구도를 보완하기 위해 기본 방어력을 상향했습니다."],
        valueSummary: "50 → 52",
      },
      {
        target: "강탈(R) - 피해량",
        changeType: "buff",
        description: ["적을 보다 확실하게 제압하도록 피해량을 상향했습니다."],
        valueSummary: "80/140/200(+공격력의 100%) → 120/180/240(+공격력의 100%)",
      },
    ],
  },
  // 케네스 (71)
  {
    characterCode: 71,
    patch: "11.2",
    changes: [
      {
        target: "억압된 분노(P) - 체력 회복량",
        changeType: "buff",
        description: ["지속 교전 능력을 높이기 위해 체력 회복 능력을 강화했습니다."],
        valueSummary: "입힌 피해량의 40(+공격력의 5%)% → 40(+공격력의 6%)%",
      },
      {
        target: "억압된 분노(P) - 체력 회복량 최대치",
        changeType: "buff",
        description: ["체력 회복량 최대치를 상향했습니다."],
        valueSummary: "20/30/40(+공격력의 5%) → 30/40/50(+공격력의 6%)",
      },
      {
        target: "맹공격(E) - 피해량",
        changeType: "buff",
        description: ["전반적인 교전 위력을 보완하기 위해 피해량을 상향했습니다."],
        valueSummary: "8/16/24/32/40(+공격력의 20%) → 8/16/24/32/40(+공격력의 25%)",
      },
    ],
  },
  // 카티야 (72)
  {
    characterCode: 72,
    patch: "11.2",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["상위권에서 아쉬운 성과를 보여 레벨 당 공격력을 상향했습니다."],
        valueSummary: "4.3 → 4.5",
      },
    ],
  },
  // 다르코 (74)
  {
    characterCode: 74,
    patch: "11.2",
    changes: [
      {
        target: "수금(W) - 이동 속도 감소",
        changeType: "buff",
        description: ["부족한 유틸리티 능력을 보완하기 위해 이동 속도 감소 효과를 상향했습니다."],
        valueSummary: "20/22.5/25/27.5/30% → 25/27.5/30/32.5/35%",
      },
      {
        target: "추심(E) - 에어본 지속 시간",
        changeType: "buff",
        description: ["에어본 지속 시간을 늘려 유틸리티 능력을 보완했습니다."],
        valueSummary: "0.6초 → 0.7초",
      },
    ],
  },
  // 히스이 (78)
  {
    characterCode: 78,
    patch: "11.2",
    changes: [
      {
        target: "쾌연격(Q) - 2타 피해량",
        changeType: "buff",
        description: [
          "전술 스킬 개편 이후 부족해진 피해량을 일부 보완하기 위해 2타 피해량을 상향했습니다.",
        ],
        valueSummary:
          "70/85/100/115/130(+추가 공격력의 90/95/100/105/110%) → (+추가 공격력의 100/105/110/115/120%)",
      },
    ],
  },
  // 유스티나 (79)
  {
    characterCode: 79,
    patch: "11.2",
    changes: [
      {
        target: "집중 포격(W) - 피해량",
        changeType: "buff",
        description: ["부족한 교전 화력을 보강하기 위해 기본 피해량을 상향했습니다."],
        valueSummary: "50/70/90/110/130(+스킬 증폭의 35%) → 50/75/100/125/150(+스킬 증폭의 35%)",
      },
    ],
  },
  // 이슈트반 (80)
  {
    characterCode: 80,
    patch: "11.2",
    changes: [
      {
        target: "양자 얽힘(W) - 피해량",
        changeType: "buff",
        description: [
          "지속 교전 상황에서의 피해 능력을 보완하기 위해 피해량을 상향했습니다. (다른 가능성 포함)",
        ],
        valueSummary: "60/85/110/135/160(+공격력의 90%) → 60/90/120/150/180(+공격력의 90%)",
      },
      {
        target: "양자 얽힘(W) - 체력 회복량",
        changeType: "buff",
        description: ["지속 교전 생존 능력을 보완하기 위해 체력 회복량을 상향했습니다."],
        valueSummary:
          "최소 20/30/40/50/60(+공격력의 60%) → 40/50/60/70/80 / 최대 30/45/60/75/90(+공격력의 90%) → 60/75/90/105/120",
      },
    ],
  },
  // 니아 (81)
  {
    characterCode: 81,
    patch: "11.2",
    changes: [
      {
        target: "K.O.(P) - 중첩 당 저장 피해량",
        changeType: "buff",
        description: [
          "단단한 적 상대로 처형 조건을 더 빠르게 달성하도록 중첩 당 저장 피해량을 상향했습니다.",
        ],
        valueSummary: "2/6/10(+스킬 증폭의 2.5%) → 4/8/12(+스킬 증폭의 3%)",
      },
    ],
  },
  // 슈린 (82)
  {
    characterCode: 82,
    patch: "11.2",
    changes: [
      {
        target: "결심응진(P) - 체력 회복량",
        changeType: "buff",
        description: ["교전 유지력을 보완하기 위해 체력 회복량을 상향했습니다."],
        valueSummary: "10/25/40(+공격력의 30%) → 10/25/40(+공격력의 35%)",
      },
      {
        target: "만검귀종(R) - 강화 어검 피해량",
        changeType: "buff",
        description: ["지속 교전 상황에서 강점을 갖도록 강화 어검 피해량을 상향했습니다."],
        valueSummary: "20/40/60(+공격력의 15/25/35%) → 20/40/60(+공격력의 20/30/40%)",
      },
    ],
  },
  // 코렐라인 (87)
  {
    characterCode: 87,
    patch: "11.2",
    changes: [
      {
        target: "이세계의 잔영(R) - 이동 속도 증가",
        changeType: "nerf",
        description: ["높은 생존률을 견제하기 위해 이동 속도 증가량을 하향했습니다."],
        valueSummary: "15% → 10%",
      },
    ],
  },
  // 비형 (88)
  {
    characterCode: 88,
    patch: "11.2",
    changes: [
      {
        target: "도깨비 불(P) - 피해량",
        changeType: "nerf",
        description: ["추가 공격력 계수와 대상 최대 체력 비례 피해량을 하향했습니다."],
        valueSummary:
          "16/32/48(+추가 공격력의 48%)(+대상 최대 체력의 2.4/3.2/4%) → (+추가 공격력의 40%)(+대상 최대 체력의 1/2/3%)",
      },
      {
        target: "천벌 받아라!(W) - 보호막 흡수량",
        changeType: "nerf",
        description: ["보호막 흡수량의 최대 체력 비례 계수를 하향했습니다."],
        valueSummary: "20/45/70/95/120(+최대 체력의 14%) → 20/45/70/95/120(+최대 체력의 12%)",
      },
      {
        target: "내기 한판!(E) - 벽 넘기 이동 거리 (핫픽스)",
        changeType: "rework",
        description: ["사용 시 벽을 넘는 이동 거리가 잘못 적용되어 있던 문제가 수정되었습니다."],
      },
    ],
  },
];

export function getCharacterPatchNote(
  characterCode: number,
  patch: string
): CharacterPatchNote | undefined {
  return PATCH_NOTES.find((note) => note.characterCode === characterCode && note.patch === patch);
}
