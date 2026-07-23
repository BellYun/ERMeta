import type { CharacterPatchNote } from "./10.1";

const PATCH = "11.7";

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: PATCH,
    changes: [
      {
        target: "억누른 고통(W) - 충전 중 체력 회복량",
        changeType: "nerf",
        description: ["과도한 내구도를 낮추기 위해 잃은 체력 비례 회복량을 줄였습니다."],
        valueSummary: "잃은 체력의 4% → 3%",
      },
    ],
  },
  {
    characterCode: 34, // 나타폰
    patch: PATCH,
    changes: [
      {
        target: "인스턴트 포토(E) - 피해량",
        changeType: "buff",
        description: ["부족했던 평균 피해량을 보완하기 위해 스킬 증폭 계수를 높였습니다."],
        valueSummary: "30/50/70/90/110(+스킬 증폭의 35%) → 30/50/70/90/110(+스킬 증폭의 40%)",
      },
    ],
  },
  {
    characterCode: 74, // 다르코
    patch: PATCH,
    changes: [
      {
        target: "방망이 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["치명타 아이템 세팅의 높은 효율을 견제하기 위해 숙련도 효과를 낮췄습니다."],
        valueSummary: "1.8% → 1.7%",
      },
    ],
  },
  {
    characterCode: 29, // 레온
    patch: PATCH,
    changes: [
      {
        target: "잠영(E) - 피해량",
        changeType: "nerf",
        description: ["대응 여부에 따라 격차가 컸던 진입 피해량을 낮췄습니다."],
        valueSummary: "70/105/140/175/210(+스킬 증폭의 80%) → 60/95/130/165/200(+스킬 증폭의 75%)",
      },
    ],
  },
  {
    characterCode: 31, // 리오
    patch: PATCH,
    changes: [
      {
        target: "카에유미(Q) 단궁 - 기본 화살 피해량",
        changeType: "buff",
        description: ["단궁의 기본 화살 계수를 소폭 높였습니다."],
        valueSummary: "공격력의 36% × 기본 공격 증폭 → 공격력의 37% × 기본 공격 증폭",
      },
      {
        target: "카에유미(Q) 단궁 - 추가 화살 피해량",
        changeType: "nerf",
        description: ["단궁 상태의 과도한 연속 화력을 낮추기 위해 추가 화살 계수를 줄였습니다."],
        valueSummary: "공격력의 35% × 기본 공격 증폭 → 공격력의 33% × 기본 공격 증폭",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: PATCH,
    changes: [
      {
        target: "카메라 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["스킬과 기본 공격 양쪽에서 높았던 화력을 조정했습니다."],
        valueSummary: "1.1% → 1%",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: PATCH,
    changes: [
      {
        target: "캣 워크(E) - 보호막량",
        changeType: "buff",
        description: ["내구도와 아군 보호 능력을 보완하기 위해 최대 체력 계수를 높였습니다."],
        valueSummary:
          "60/90/120/150/180(+스킬 증폭의 40%)(+최대 체력의 7%) → 60/90/120/150/180(+스킬 증폭의 40%)(+최대 체력의 8%)",
      },
    ],
  },
  {
    characterCode: 4, // 매그너스
    patch: PATCH,
    changes: [
      {
        target: "강타(E) - 벽 충돌 피해량",
        changeType: "buff",
        description: ["벽 충돌에 성공했을 때의 보상을 높였습니다."],
        valueSummary:
          "20/40/60/80/100(+추가 공격력의 30%)(+스킬 증폭의 20%)(+대상 최대 체력의 6%) → 20/40/60/80/100(+추가 공격력의 30%)(+스킬 증폭의 30%)(+대상 최대 체력의 7%)",
      },
    ],
  },
  {
    characterCode: 26, // 바바라
    patch: PATCH,
    changes: [
      {
        target: "오버클럭(R) - 강화 센트리건(RQ) 레일건 피해량",
        changeType: "nerf",
        description: ["강화 센트리건 조합의 과도한 위력을 낮췄습니다."],
        valueSummary: "100/125/150(+스킬 증폭의 50%) → 100/125/150(+스킬 증폭의 45%)",
      },
    ],
  },
  {
    characterCode: 88, // 비형
    patch: PATCH,
    changes: [
      {
        target: "천벌 받아라!(W) - 보호막량",
        changeType: "buff",
        description: ["후반 교전의 부족한 내구도를 보완하기 위해 보호막 기본 수치를 높였습니다."],
        valueSummary: "20/45/70/95/120(+최대 체력의 12%) → 30/60/90/120/150(+최대 체력의 12%)",
      },
    ],
  },
  {
    characterCode: 16, // 실비아
    patch: PATCH,
    changes: [
      {
        target: "프론트 플립(바이크 W) - 피해량",
        changeType: "nerf",
        description: ["진입 시 발생하는 순간 화력을 낮추기 위해 스킬 증폭 계수를 줄였습니다."],
        valueSummary: "60/100/140/180/220(+스킬 증폭의 60%) → 60/100/140/180/220(+스킬 증폭의 55%)",
      },
    ],
  },
  {
    characterCode: 17, // 아드리아나
    patch: PATCH,
    changes: [
      {
        target: "활활(P) - 방어력 감소",
        changeType: "nerf",
        description: ["아이템과 아군 스킬 연계에서 높았던 방어력 감소 효과를 낮췄습니다."],
        valueSummary: "6/9/12% → 6/8/10%",
      },
    ],
  },
  {
    characterCode: 66, // 아르다
    patch: PATCH,
    changes: [
      {
        target: "샤마쉬의 두루마리(Q) - 피해량",
        changeType: "buff",
        description: [
          "부족했던 화력을 보완하기 위해 기본 피해량을 높였습니다. 샤마쉬의 법전(RQ)에도 동일하게 적용됩니다.",
        ],
        valueSummary: "50/90/130/170/210(+스킬 증폭의 80%) → 70/110/150/190/230(+스킬 증폭의 80%)",
      },
    ],
  },
  {
    characterCode: 19, // 엠마
    patch: PATCH,
    changes: [
      {
        target: "CheerUP♥(P) - 피해량",
        changeType: "nerf",
        description: ["패시브의 높은 교전 기여도를 조정하기 위해 기본 피해량을 낮췄습니다."],
        valueSummary: "80/100/120(+스킬 증폭의 25/35/45%) → 60/80/100(+스킬 증폭의 25/35/45%)",
      },
      {
        target: "CheerUP♥(P) - 보호막량",
        changeType: "nerf",
        description: ["패시브의 높은 생존 기여도를 조정하기 위해 보호막 기본 수치를 낮췄습니다."],
        valueSummary: "140/180/220(+스킬 증폭의 25/30/35%) → 120/160/200(+스킬 증폭의 25/30/35%)",
      },
    ],
  },
  {
    characterCode: 32, // 윌리엄
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["성장 구간의 부족한 내구도를 보완했습니다."],
        valueSummary: "2.5 → 2.7",
      },
    ],
  },
  {
    characterCode: 77, // 유민
    patch: PATCH,
    changes: [
      {
        target: "아르카나 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["전반적인 성능을 보완하기 위해 무기 숙련도 효과를 높였습니다."],
        valueSummary: "4% → 4.1%",
      },
    ],
  },
  {
    characterCode: 80, // 이슈트반
    patch: PATCH,
    changes: [
      {
        target: "파동 함수 붕괴(R) - 피해량",
        changeType: "nerf",
        description: ["높은 공격력 세팅에서 과도했던 궁극기 계수를 낮췄습니다."],
        valueSummary: "80/160/240(+공격력의 90%) → 80/160/240(+공격력의 85%)",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: PATCH,
    changes: [
      {
        target: "바르가바스트라(R) - 최초 피해량",
        changeType: "nerf",
        description: ["궁극기의 폭발적인 첫 피해를 줄이기 위해 스킬 증폭 계수를 낮췄습니다."],
        valueSummary: "60/120/180(+스킬 증폭의 45%) → 60/120/180(+스킬 증폭의 40%)",
      },
    ],
  },
  {
    characterCode: 1, // 재키
    patch: PATCH,
    changes: [
      {
        target: "양손검 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["양손검 세팅의 지속적인 강세를 조정하기 위해 숙련도 효과를 낮췄습니다."],
        valueSummary: "2.4% → 2.3%",
      },
    ],
  },
  {
    characterCode: 87, // 코렐라인
    patch: PATCH,
    changes: [
      {
        target: "진실의 거울(W) - 스킬 증폭 증가",
        changeType: "buff",
        description: ["낮은 성과를 보완하기 위해 스킬 증폭 증가량을 높였습니다."],
        valueSummary: "3/5/7% → 5/7/9%",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: PATCH,
    changes: [
      {
        target: "프리치아(E) - 적중 시 이동 속도 감소",
        changeType: "buff",
        description: ["후속 스킬 연계의 안정성을 높이기 위해 둔화 효과를 강화했습니다."],
        valueSummary: "35% → 40%",
      },
    ],
  },
  {
    characterCode: 62, // 테오도르
    patch: PATCH,
    changes: [
      {
        target: "증폭 스크린(W) - 추가 피해량",
        changeType: "buff",
        description: ["주요 아이템을 갖추기 전의 부족한 화력을 보완했습니다."],
        valueSummary: "30/40/50/60/70(+스킬 증폭의 26%) → 40/50/60/70/80(+스킬 증폭의 26%)",
      },
    ],
  },
  {
    characterCode: 86, // 펜리르
    patch: PATCH,
    changes: [
      {
        target: "숨통 끊기(R) - 피해량",
        changeType: "nerf",
        description: ["지나치게 높았던 궁극기 피해량 계수를 낮췄습니다."],
        valueSummary: "150/225/300(+공격력의 120%) → 150/225/300(+공격력의 110%)",
      },
    ],
  },
  {
    characterCode: 8, // 하트
    patch: PATCH,
    changes: [
      {
        target: "기타 무기 숙련도 레벨 당 공격 속도",
        changeType: "nerf",
        description: ["최상위권에서 강한 기본 공격 성능을 조정했습니다."],
        valueSummary: "3.5% → 3.1%",
      },
    ],
  },
  {
    characterCode: 7, // 현우
    patch: PATCH,
    changes: [
      {
        target: "발밟기(Q) - 이동 속도 증가",
        changeType: "buff",
        description: ["교전 기동성과 전투 운용을 보완하기 위해 이동 속도 증가량을 높였습니다."],
        valueSummary: "11/12/13/14/15% → 12/14/16/18/20%",
      },
    ],
  },
];
