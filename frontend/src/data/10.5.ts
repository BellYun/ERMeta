import type { CharacterPatchNote } from "./10.1"

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: "10.5",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력이 증가하여 내구도가 강화되었습니다."],
        valueSummary: "950 → 1000",
      },
    ],
  },
  {
    characterCode: 34, // 나타폰
    patch: "10.5",
    changes: [
      {
        target: "슬로우 셔터(P) - 피해량",
        changeType: "nerf",
        description: ["패시브 피해량이 감소했습니다."],
        valueSummary:
          "40/70/100(+공격 속도의 20%)(+스킬 증폭의 65%) → 30/60/90(+공격 속도의 20%)(+스킬 증폭의 65%)",
      },
    ],
  },
  {
    characterCode: 74, // 다르코
    patch: "10.5",
    changes: [
      {
        target: "고리대금(Q) - 피해량",
        changeType: "buff",
        description: [
          "대상 최대 체력 비례 피해량이 증가하여 내구도가 높은 적에게 더 강력한 피해를 줄 수 있습니다.",
        ],
        valueSummary:
          "20/40/60/80/100(+공격력의 40%)(+대상 최대 체력의 1/2/3/4/5%) → 20/40/60/80/100(+공격력의 40%)(+대상 최대 체력의 2/3/4/5/6%)",
      },
    ],
  },
  {
    characterCode: 48, // 띠아
    patch: "10.5",
    changes: [
      {
        target: "색칠놀이(E) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수가 증가하여 근접 교전 위력이 강화되었습니다."],
        valueSummary:
          "40/90/140/190/240(+스킬 증폭의 80%) → 40/90/140/190/240(+스킬 증폭의 90%)",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: "10.5",
    changes: [
      {
        target: "날카로운 꽃(Q) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수가 증가하여 위력이 보완되었습니다."],
        valueSummary:
          "50/75/100/125/150(+스킬 증폭의 55%) → 50/75/100/125/150(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 20, // 레녹스
    patch: "10.5",
    changes: [
      {
        target: "위풍당당(P) - 쿨다운",
        changeType: "nerf",
        description: [
          "보호막 재사용 대기시간이 증가하여 지속 교전 시 내구도가 하향되었습니다.",
        ],
        valueSummary: "14/12/10초 → 15/13/11초",
      },
    ],
  },
  {
    characterCode: 21, // 로지
    patch: "10.5",
    changes: [
      {
        target: "기본 방어력",
        changeType: "nerf",
        description: ["기본 방어력이 감소하여 안정적인 성능이 견제되었습니다."],
        valueSummary: "53 → 50",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: "10.5",
    changes: [
      {
        target: "되감기 - 방송 중(E) - 체력 회복량",
        changeType: "buff",
        description: [
          "체력 회복량이 증가하여 교전 상황에서 보다 과감한 플레이가 가능해졌습니다.",
        ],
        valueSummary: "받은 피해의 37/41/45/49/53% → 40/45/50/55/60%",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: "10.5",
    changes: [
      {
        target: "캣 워크(E) - 보호막 흡수량",
        changeType: "buff",
        description: [
          "최대 체력 비례 보호막 흡수량이 증가하여 아군 지원 능력 및 내구도가 보완되었습니다.",
        ],
        valueSummary:
          "60/90/120/150/180(+스킬 증폭의 40%)(+최대 체력의 6%) → 60/90/120/150/180(+스킬 증폭의 40%)(+최대 체력의 7%)",
      },
    ],
  },
  {
    characterCode: 53, // 마커스
    patch: "10.5",
    changes: [
      {
        target: "도끼 무기 숙련도 - 기본 공격 증폭",
        changeType: "buff",
        description: ["도끼 무기 숙련도의 기본 공격 증폭이 증가했습니다."],
        valueSummary: "레벨 당 1.8% → 1.9%",
      },
    ],
  },
  {
    characterCode: 42, // 비앙카
    patch: "10.5",
    changes: [
      {
        target: "진조의 군림(R) - 1타 피해량",
        changeType: "nerf",
        description: ["스킬 증폭 계수가 감소하여 궁극기 위력이 견제되었습니다."],
        valueSummary:
          "50/100/150(+스킬 증폭의 50%)(+대상 최대 체력의 11%) → 50/100/150(+스킬 증폭의 40%)(+대상 최대 체력의 11%)",
      },
    ],
  },
  {
    characterCode: 13, // 쇼우
    patch: "10.5",
    changes: [
      {
        target: "창 무기 숙련도 - 공격 속도",
        changeType: "buff",
        description: ["창 무기 숙련도의 공격 속도가 증가했습니다."],
        valueSummary: "레벨 당 3% → 4%",
      },
      {
        target: "창 무기 숙련도 - 스킬 증폭",
        changeType: "buff",
        description: ["창 무기 숙련도의 스킬 증폭이 증가했습니다."],
        valueSummary: "레벨 당 4.1% → 4.4%",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: "10.5",
    changes: [
      {
        target: "어딨어 윌슨?(W) - 피해량",
        changeType: "buff",
        description: [
          "스킬 증폭 계수가 증가하여 근접 교전 시 대응 능력이 보완되었습니다.",
        ],
        valueSummary:
          "100/135/170/205/240(+스킬 증폭의 70%) → 100/135/170/205/240(+스킬 증폭의 80%)",
      },
      {
        target: "모두 해방이에요.(R) - 패시브 효과 증가 지속 시간",
        changeType: "buff",
        description: [
          "패시브 효과 증가 지속 시간이 늘어나 궁극기 이후 지속 교전에서 유리해졌습니다.",
        ],
        valueSummary: "6/7/8초 → 7/8/9초",
      },
    ],
  },
  {
    characterCode: 24, // 아델라
    patch: "10.5",
    changes: [
      {
        target: "레이피어 무기 숙련도 - 스킬 증폭",
        changeType: "nerf",
        description: ["레이피어 무기 숙련도의 스킬 증폭이 소폭 감소했습니다."],
        valueSummary: "레벨 당 4.7% → 4.6%",
      },
    ],
  },
  {
    characterCode: 2, // 아야
    patch: "10.5",
    changes: [
      {
        target: "고정 사격(W) - 피해량",
        changeType: "buff",
        description: [
          "기본 피해량이 증가하여 스킬 적중 시 보다 확실한 위력을 발휘합니다.",
        ],
        valueSummary:
          "20/30/40/50/60(+공격력의 50%)(+스킬 증폭의 30/35/40/45/50%) → 30/40/50/60/70(+공격력의 50%)(+스킬 증폭의 30/35/40/45/50%)",
      },
    ],
  },
  {
    characterCode: 59, // 아이작
    patch: "10.5",
    changes: [
      {
        target: "강탈(R) - 이펙트",
        changeType: "rework",
        description: ["피아식별 이펙트가 개선되었습니다."],
      },
    ],
  },
  {
    characterCode: 68, // 알론소
    patch: "10.5",
    changes: [
      {
        target: "어트랙션 슬램!(E) - 속박 지속 시간",
        changeType: "buff",
        description: [
          "속박 지속 시간이 증가하여 적을 묶어두는 역할을 보다 확실히 수행할 수 있습니다.",
        ],
        valueSummary: "0.7/0.8/0.9/1/1.1초 → 0.8/0.9/1/1.1/1.2초",
      },
    ],
  },
  {
    characterCode: 35, // 얀
    patch: "10.5",
    changes: [
      {
        target: "니 스트라이크(Q) - 리핑 니 스트라이크(Q2) 피해량",
        changeType: "buff",
        description: [
          "스킬 증폭 계수가 증가하여 톤파 얀의 부족한 피해 능력이 보완되었습니다.",
        ],
        valueSummary:
          "65/90/115/140/165(+추가 공격력의 90%)(+스킬 증폭의 60%)(+적 최대 체력의 6%) → 65/90/115/140/165(+추가 공격력의 90%)(+스킬 증폭의 70%)(+적 최대 체력의 6%)",
      },
    ],
  },
  {
    characterCode: 55, // 에스텔
    patch: "10.5",
    changes: [
      {
        target: "선제대응(W) - 이동 속도 감소",
        changeType: "buff",
        description: ["이동 속도 감소 수치가 증가하여 저지력이 강화되었습니다."],
        valueSummary: "25% → 30%",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: "10.5",
    changes: [
      {
        target: "겨울여왕의 영지(P) - 빙결 지속 시간",
        changeType: "buff",
        description: ["빙결 지속 시간이 증가하여 연계 능력이 강화되었습니다."],
        valueSummary: "1초 → 1.1초",
      },
      {
        target: "더블 악셀(W) - 피해량",
        changeType: "buff",
        description: [
          "추가 체력 비례 계수가 증가하여 공격적인 플레이가 강화되었습니다.",
        ],
        valueSummary:
          "50/70/90/110/130(+스킬 증폭의 50%)(+추가 체력의 8%) → 50/70/90/110/130(+스킬 증폭의 50%)(+추가 체력의 10%)",
      },
    ],
  },
  {
    characterCode: 32, // 윌리엄
    patch: "10.5",
    changes: [
      {
        target: "투척 무기 숙련도 - 기본 공격 증폭",
        changeType: "nerf",
        description: ["투척 무기 숙련도의 기본 공격 증폭이 감소했습니다."],
        valueSummary: "레벨 당 1.5% → 1.4%",
      },
    ],
  },
  {
    characterCode: 79, // 유스티나
    patch: "10.5",
    changes: [
      {
        target: "부스트 대쉬(E) - 피해량",
        changeType: "buff",
        description: [
          "기본 피해량이 증가하여 보다 유의미한 위력을 발휘할 수 있습니다.",
        ],
        valueSummary:
          "40/60/80/100/120(+스킬 증폭의 30%) → 50/75/100/125/150(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 36, // 이바
    patch: "10.5",
    changes: [
      {
        target: "위상의 소용돌이(W) - 1타 피해량",
        changeType: "nerf",
        description: [
          "스킬 증폭 계수가 감소하여 원거리 견제 능력이 약화되었습니다.",
        ],
        valueSummary:
          "40/70/100/130/160(+스킬 증폭의 45%) → 40/70/100/130/160(+스킬 증폭의 40%)",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: "10.5",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력이 감소하여 전반적인 위력이 견제되었습니다."],
        valueSummary: "40 → 38",
      },
    ],
  },
  {
    characterCode: 30, // 일레븐
    patch: "10.5",
    changes: [
      {
        target: "다 덤벼보라구!(R) - 피해량",
        changeType: "buff",
        description: [
          "기본 피해량이 증가하여 궁극기의 교전 영향력이 개선되었습니다.",
        ],
        valueSummary:
          "6/9/12(+공격력의 3%)(+추가 체력의 3%) → 10/15/20(+공격력의 3%)(+추가 체력의 3%)",
      },
    ],
  },
  {
    characterCode: 38, // 제니
    patch: "10.5",
    changes: [
      {
        target: "레드 카펫(W) - 쿨다운",
        changeType: "buff",
        description: ["재사용 대기시간이 감소하여 스킬을 보다 자주 활용할 수 있습니다."],
        valueSummary: "16초 → 15초",
      },
      {
        target: "시상식의 여왕(R) - 피해량",
        changeType: "buff",
        description: [
          "기본 피해량이 증가하여 게임 초반 교전에서 유의미한 피해를 줄 수 있습니다.",
        ],
        valueSummary:
          "100/200/300(+스킬 증폭의 70%) → 150/240/330(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 39, // 카밀로
    patch: "10.5",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력이 감소하여 위력이 견제되었습니다."],
        valueSummary: "34 → 31",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: "10.5",
    changes: [
      {
        target: "수쳐(E) - 피해량",
        changeType: "buff",
        description: [
          "스킬 증폭 계수가 증가하여 스킬 적중 시 보다 강력한 위력을 발휘합니다.",
        ],
        valueSummary:
          "50/60/70/80/90(+스킬 증폭의 40%) → 50/60/70/80/90(+스킬 증폭의 45%)",
      },
    ],
  },
  {
    characterCode: 71, // 케네스
    patch: "10.5",
    changes: [
      {
        target: "업화(W) - 받는 피해 감소",
        changeType: "nerf",
        description: [
          "받는 피해 감소량이 감소하여 과도한 안정성이 견제되었습니다.",
        ],
        valueSummary:
          "4(+공격력의 3/3.25/3.5/3.75/4%)% → 2(+공격력의 3/3.25/3.5/3.75/4%)%",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: "10.5",
    changes: [
      {
        target: "스틸레토(Q) - 스파다 폭발 피해량",
        changeType: "buff",
        description: [
          "스킬 증폭 계수가 증가하여 보다 치명적인 위력을 발휘할 수 있습니다.",
        ],
        valueSummary:
          "40/70/100/130/160(+스킬 증폭의 50%) → 40/70/100/130/160(+스킬 증폭의 55%)",
      },
    ],
  },
  {
    characterCode: 51, // 프리야
    patch: "10.5",
    changes: [
      {
        target: "개화의 선율(Q) - 피해량",
        changeType: "nerf",
        description: ["기본 피해량이 감소하여 견제 능력이 약화되었습니다."],
        valueSummary:
          "80/110/140/170/200(+스킬 증폭의 70%) → 60/90/120/150/180(+스킬 증폭의 70%)",
      },
      {
        target: "대지의 메아리(R) - 쿨다운",
        changeType: "nerf",
        description: [
          "재사용 대기시간이 증가하여 궁극기 사용 시 보다 확실한 리스크를 부담합니다.",
        ],
        valueSummary: "80/70/60초 → 80/75/70초",
      },
    ],
  },
  {
    characterCode: 3, // 피오라
    patch: "10.5",
    changes: [
      {
        target: "레이피어 무기 숙련도 - 스킬 증폭",
        changeType: "nerf",
        description: ["레이피어 무기 숙련도의 스킬 증폭이 감소했습니다."],
        valueSummary: "레벨 당 4.5% → 4.3%",
      },
    ],
  },
  {
    characterCode: 56, // 피올로
    patch: "10.5",
    changes: [
      {
        target: "사슬 묶기(E) - 최대 충전 시간",
        changeType: "buff",
        description: [
          "최대 충전까지 걸리는 시간이 줄어 스킬을 보다 신속하게 활용할 수 있습니다.",
        ],
        valueSummary: "1.5초 → 1.2초",
      },
    ],
  },
  {
    characterCode: 58, // 헤이즈
    patch: "10.5",
    changes: [
      {
        target: "웨폰 케이스(P) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수가 증가하여 전반적인 교전 능력이 강화되었습니다."],
        valueSummary:
          "60/90/120(+스킬 증폭의 55%) → 60/90/120(+스킬 증폭의 60%)",
      },
    ],
  },
]
