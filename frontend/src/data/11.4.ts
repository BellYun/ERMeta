import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 니키 (33)
  {
    characterCode: 33,
    patch: "11.4",
    changes: [
      {
        target: "격투 액션(Q) - 최소 피해량",
        changeType: "buff",
        description: [
          "니키는 지속적으로 낮은 지표를 기록하고 있습니다.",
          "Q - 격투 액션의 피해량과 E - 강력한 펀치의 이동 속도 감소량을 상향하여 전반적인 스킬 위력을 강화합니다.",
        ],
        valueSummary: "30/50/70/90/110(+스킬 증폭의 70%) → 40/60/80/100/120(+스킬 증폭의 70%)",
      },
      {
        target: "격투 액션(Q) - 최대 피해량",
        changeType: "buff",
        description: [
          "니키는 지속적으로 낮은 지표를 기록하고 있습니다.",
          "Q - 격투 액션의 피해량과 E - 강력한 펀치의 이동 속도 감소량을 상향하여 전반적인 스킬 위력을 강화합니다.",
        ],
        valueSummary:
          "60/100/140/180/220(+스킬 증폭의 140%) → 80/120/160/200/240(+스킬 증폭의 140%)",
      },
      {
        target: "강력한 펀치(E) - 이동 속도 감소",
        changeType: "buff",
        description: [
          "니키는 지속적으로 낮은 지표를 기록하고 있습니다.",
          "Q - 격투 액션의 피해량과 E - 강력한 펀치의 이동 속도 감소량을 상향하여 전반적인 스킬 위력을 강화합니다.",
        ],
        valueSummary: "35% → 40%",
      },
      {
        target: "강력한 펀치(E) - 분노의 펀치! 이동 속도 감소",
        changeType: "buff",
        description: [
          "니키는 지속적으로 낮은 지표를 기록하고 있습니다.",
          "Q - 격투 액션의 피해량과 E - 강력한 펀치의 이동 속도 감소량을 상향하여 전반적인 스킬 위력을 강화합니다.",
        ],
        valueSummary: "35% → 40%",
      },
    ],
  },
  // 다니엘 (37)
  {
    characterCode: 37,
    patch: "11.4",
    changes: [
      {
        target: "그림자 가위(Q) - 중앙 범위 적중 시 피해량",
        changeType: "buff",
        description: [
          "다니엘은 매우 낮은 승률 지표를 기록하고 있습니다. Q - 그림자 가위의 활용도를 상향 조정하여 다니엘의 위력을 보완합니다.",
        ],
        valueSummary: "40/60/80/100/120(+공격력의 130%) → 40/60/80/100/120(+공격력의 140%)",
      },
      {
        target: "그림자 가위(Q) - 중앙 범위 적중 시 이동 속도 감소",
        changeType: "buff",
        description: [
          "다니엘은 매우 낮은 승률 지표를 기록하고 있습니다. Q - 그림자 가위의 활용도를 상향 조정하여 다니엘의 위력을 보완합니다.",
        ],
        valueSummary: "30% → 35%",
      },
    ],
  },
  // 레녹스 (20)
  {
    characterCode: 20,
    patch: "11.4",
    changes: [
      {
        target: "푸른뱀(R) - 푸른뱀 고정 피해량",
        changeType: "buff",
        description: [
          "레녹스의 R - 푸른뱀은 낮은 레벨에서 1회만 적중 시 푸른뱀 효과를 통한 피해가 매우 빈약하여 기대에 못미치는 효과를 보여주곤 했습니다. 초반 구간의 피해량을 상향하여 부족한 위력을 보완하고, 이전보다 아쉬운 모습을 보여주고 있는 만큼 2회 적중 시 피해량도 상향 조정합니다.",
        ],
        valueSummary: "5/15/25 → 15/20/25",
      },
      {
        target: "푸른뱀(R) - 2회 적중 시 푸른뱀 고정 피해량",
        changeType: "buff",
        description: [
          "레녹스의 R - 푸른뱀은 낮은 레벨에서 1회만 적중 시 푸른뱀 효과를 통한 피해가 매우 빈약하여 기대에 못미치는 효과를 보여주곤 했습니다. 초반 구간의 피해량을 상향하여 부족한 위력을 보완하고, 이전보다 아쉬운 모습을 보여주고 있는 만큼 2회 적중 시 피해량도 상향 조정합니다.",
        ],
        valueSummary: "25/35/45 → 30/40/50",
      },
    ],
  },
  // 레온 (29)
  {
    characterCode: 29,
    patch: "11.4",
    changes: [
      {
        target: "인간 어뢰(P) - 피해량",
        changeType: "buff",
        description: [
          "주력 스킬인 P - 인간 어뢰의 피해량을 상향 조정하여 레온의 교전 능력을 강화합니다.",
        ],
        valueSummary: "30/50/70(+스킬 증폭의 30%) → 30/45/60(+스킬 증폭의 35%)",
      },
    ],
  },
  // 르노어 (75)
  {
    characterCode: 75,
    patch: "11.4",
    changes: [
      {
        target: "스타카토(Q) - 피해량",
        changeType: "buff",
        description: [
          "지속적으로 낮은 통계를 기록하고 있는 르노어의 Q - 스타카토의 위력을 상향하여 보완합니다.",
        ],
        valueSummary: "70/90/110/130/150(+스킬 증폭의 60%) → 80/100/120/140/160(+스킬 증폭의 60%)",
      },
    ],
  },
  // 마르티나 (57)
  {
    characterCode: 57,
    patch: "11.4",
    changes: [
      {
        target: "카메라 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: [
          "마르티나는 지속적으로 평균 이상의 지표를 기록하고 있습니다. 무기 숙련도 효과를 낮춰 위력을 견제합니다.",
        ],
        valueSummary: "1.2% → 1.1%",
      },
    ],
  },
  // 마커스 (53)
  {
    characterCode: 53,
    patch: "11.4",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["마커스의 기본 체력을 높여 내구도를 상향 조정합니다."],
        valueSummary: "920 → 950",
      },
    ],
  },
  // 매그너스 (4)
  {
    characterCode: 4,
    patch: "11.4",
    changes: [
      {
        target: "17대1(W) - 피해량",
        changeType: "buff",
        description: [
          "매그너스의 주력 스킬인 W - 17대1의 피해량을 높여 전반적인 교전 능력을 강화합니다.",
        ],
        valueSummary:
          "16/22/28/34/40(+추가 공격력의 45%)(+스킬 증폭의 20%)(+적 최대 체력의 2.5%) → 22/28/34/40/46(+추가 공격력의 45%)(+스킬 증폭의 20%)(+적 최대 체력의 2.5%)",
      },
    ],
  },
  // 미르카 (85)
  {
    characterCode: 85,
    patch: "11.4",
    changes: [
      {
        target: "백스텝 러시(E) - 파워 히트(E2) 강화 시 리펄스 게이지 추가 피해량",
        changeType: "buff",
        description: [
          "상대적으로 활용도가 낮은 E - 백스텝 러시의 강화 파워 히트의 피해량을 높여 위력을 강화합니다.",
        ],
        valueSummary: "33% → 40%",
      },
    ],
  },
  // 바냐 (64)
  {
    characterCode: 64,
    patch: "11.4",
    changes: [
      {
        target: "염원(E) - 바깥쪽 범위 피해량",
        changeType: "buff",
        description: [
          "바냐는 상위권 실력대에서 지속적으로 낮은 지표를 기록하고 있습니다. E - 염원의 바깥쪽 범위 피해량을 높여 적중 시 보다 강력한 위력을 가질 수 있도록 조정합니다.",
        ],
        valueSummary: "90/125/160/195/230(+스킬 증폭의 80%) → 90/125/160/195/230(+스킬 증폭의 90%)",
      },
    ],
  },
  // 비앙카 (42)
  {
    characterCode: 42,
    patch: "11.4",
    changes: [
      {
        target: "아르카나 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: [
          "비앙카는 모든 구간에서 평균 이상의 지표를 기록하고 있습니다. 무기 숙련도 효과를 낮춰 위력을 소폭 하향합니다.",
        ],
        valueSummary: "4.5% → 4.4%",
      },
    ],
  },
  // 아델라 (24)
  {
    characterCode: 24,
    patch: "11.4",
    changes: [
      {
        target: "나이트 포크(W) - 피해량",
        changeType: "nerf",
        description: ["W - 나이트 포크의 피해량을 낮춰 아델라의 스킬 연계 위력을 하향 조정합니다."],
        valueSummary: "20/60/100/140/180(+스킬 증폭의 80%) → 20/60/100/140/180(+스킬 증폭의 75%)",
      },
    ],
  },
  // 아드리아나 (17)
  {
    characterCode: 17,
    patch: "11.4",
    changes: [
      {
        target: "투척 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["아드리아나의 무기 숙련도 효과를 높여 전반적인 교전 위력을 강화합니다."],
        valueSummary: "3.9% → 4%",
      },
    ],
  },
  // 아르다 (66)
  {
    characterCode: 66,
    patch: "11.4",
    changes: [
      {
        target: "바빌론의 주사위(R-W) 속박 지속 시간",
        changeType: "nerf",
        description: [
          "아르다는 R - 잠들어있는 힘의 바빌론의 주사위을 통한 강력한 교전 개시 및 지역 장악 능력을 바탕으로 우수한 성과를 보이고 있습니다. 해당 스킬의 속박 지속 시간을 낮춰 위력을 조정합니다.",
        ],
        valueSummary: "1/1.1/1.2초 → 0.9/1/1.1초",
      },
    ],
  },
  // 아야 (2)
  {
    characterCode: 2,
    patch: "11.4",
    changes: [
      {
        target: "무빙턴(E) - 2연발과 고정사격 쿨다운 감소",
        changeType: "nerf",
        description: [
          "아야가 E - 무빙턴을 공격적으로 활용하였을 때 보다 높은 위력을 가질 수 있도록 사용 시 Q - 2연발과 W - 고정사격의 쿨다운 감소 수치를 상향 조정합니다.",
        ],
        valueSummary: "30/35/40/45/50% → 40/45/50/55/60%",
      },
    ],
  },
  // 아이솔 (9)
  {
    characterCode: 9,
    patch: "11.4",
    changes: [
      {
        target: "은밀 기동(E) - 피해량",
        changeType: "buff",
        description: [
          "E - 은밀 기동의 피해량을 상향하여 보다 공격적인 활용도가 높아질 수 있도록 조정합니다.",
        ],
        valueSummary: "40/65/90/115/140(+스킬 증폭의 65%) → 60/90/120/150/180(+스킬 증폭의 65%)",
      },
    ],
  },
  // 알론소 (68)
  {
    characterCode: 68,
    patch: "11.4",
    changes: [
      {
        target: "마그네틱 펀치(Q) - 추가 피해량",
        changeType: "nerf",
        description: [
          "알론소는 강력한 피해 능력과 저지력을 바탕으로 모든 구간에서 높은 지표를 기록하고 있습니다. Q - 마그네틱 펀치의 연결 피해량을 하향 조정하고, E - 어트랙션 슬램의 속박 지속 시간을 낮춰 전반적인 위력을 견제합니다.",
        ],
        valueSummary:
          "(알론소 레벨 * 8)(+대상 최대 체력의 6/7/8/9/10%) → (알론소 레벨 * 6)(+대상 최대 체력의 6/7/8/9/10%)",
      },
      {
        target: "어트랙션 슬램!(E) - 속박 지속 시간",
        changeType: "nerf",
        description: [
          "알론소는 강력한 피해 능력과 저지력을 바탕으로 모든 구간에서 높은 지표를 기록하고 있습니다. Q - 마그네틱 펀치의 연결 피해량을 하향 조정하고, E - 어트랙션 슬램의 속박 지속 시간을 낮춰 전반적인 위력을 견제합니다.",
        ],
        valueSummary: "0.8/0.9/1/1.1/1.2초 → 0.7/0.8/0.9/1/1.1초",
      },
    ],
  },
  // 요한 (41)
  {
    characterCode: 41,
    patch: "11.4",
    changes: [
      {
        target: "인도하는 빛(E) - 아군 이동 속도 증가",
        changeType: "nerf",
        description: [
          "요한은 특히 상위권 실력대에서 높은 점수 획득량을 기록하고 있습니다. E - 인도하는 빛의 이동 속도 증가량을 낮추어 높은 유틸리티 제공 능력을 견제합니다.",
        ],
        valueSummary: "6/9/12/15/18%(+스킬 증폭의 1%) → 6/8/10/12/14%(+스킬 증폭의 1%)",
      },
    ],
  },
  // 유민 (77)
  {
    characterCode: 77,
    patch: "11.4",
    changes: [
      {
        target: "도력(P) - 보호막량",
        changeType: "nerf",
        description: [
          "유민은 모든 구간에서 높은 지표를 기록하고 있습니다. P - 도력의 보호막량을 낮추고, E - 경운의 피해량을 하향 조정하여 전반적인 교전 능력을 견제합니다.",
        ],
        valueSummary: "40/70/100(+스킬 증폭의 30%) → 40/70/100(+스킬 증폭의 25%)",
      },
      {
        target: "경운(E) - 피해량",
        changeType: "nerf",
        description: [
          "유민은 모든 구간에서 높은 지표를 기록하고 있습니다. P - 도력의 보호막량을 낮추고, E - 경운의 피해량을 하향 조정하여 전반적인 교전 능력을 견제합니다.",
        ],
        valueSummary: "60/95/130/165/200(+스킬 증폭의 50%) → 60/90/120/150/180(+스킬 증폭의 50%)",
      },
    ],
  },
  // 유스티나 (79)
  {
    characterCode: 79,
    patch: "11.4",
    changes: [
      {
        target: "연속 포격(Q1) - 피해량",
        changeType: "buff",
        description: [
          "유스티나는 평균 피해량이 부족한 모습을 보이며 모든 구간에서 저조한 성적을 기록하고 있습니다. Q - 연속 포격&섬멸 포격의 연속 포격 피해량을 상향 조정하여 지속 교전 상황에서 보다 높은 피해를 누적할 수 있도록 돕습니다.",
        ],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 40%) → 50/75/100/125/150(+스킬 증폭의 45%)",
      },
    ],
  },
  // 유키 (11)
  {
    characterCode: 11,
    patch: "11.4",
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: [
          "유키의 레벨 당 방어력을 높여 내구도를 소폭 보완합니다. 또한, E - 빗겨치고 일격의 공격 속도 감소 지속 시간을 상향 조정하여 적중 시 위력을 강화합니다.",
        ],
        valueSummary: "3.1 → 3.2",
      },
      {
        target: "빗겨치고 일격(E) - 공격 속도 감소 시간",
        changeType: "buff",
        description: [
          "유키의 레벨 당 방어력을 높여 내구도를 소폭 보완합니다. 또한, E - 빗겨치고 일격의 공격 속도 감소 지속 시간을 상향 조정하여 적중 시 위력을 강화합니다.",
        ],
        valueSummary: "1초 → 1.5초",
      },
    ],
  },
  // 재키 (1)
  {
    characterCode: 1,
    patch: "11.4",
    changes: [
      {
        target: "연참(Q) - 피해량",
        changeType: "buff",
        description: [
          "재키는 모든 무기군이 아쉬운 성과를 기록하고 있습니다. Q - 연참의 대상 현재 체력 비례 피해량을 높여 보다 강력한 위력을 발휘할 수 있게 합니다.",
        ],
        valueSummary:
          "30/50/70/90/110(+공격력의 55%)(+대상 현재 체력의 5%) → 30/50/70/90/110(+공격력의 55%)(+대상 현재 체력의 7%)",
      },
    ],
  },
  // 제니 (38)
  {
    characterCode: 38,
    patch: "11.4",
    changes: [
      {
        target: "스포트라이트(Q) - 레드 와인 공격 속도 증가",
        changeType: "buff",
        description: [
          "활용도가 낮은 Q - 스포트라이트의 레드 와인 효과를 강화하여 자신에게도 스포트라이트를 사용할 여지가 생기도록 개선합니다.",
        ],
        valueSummary: "3% → 6%",
      },
    ],
  },
  // 카밀로 (39)
  {
    characterCode: 39,
    patch: "11.4",
    changes: [
      {
        target: "레이피어 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: [
          "P - 올레의 보호막 효과를 높여 카밀로의 내구도를 보완합니다. 지속적으로 높은 지표를 기록중인 레이피어 카밀로의 경우 무기 숙련도 효과를 낮춰 위력을 견제합니다.",
        ],
        valueSummary: "1.4% → 1.3%",
      },
      {
        target: "올레(P) - 보호막량",
        changeType: "buff",
        description: [
          "P - 올레의 보호막 효과를 높여 카밀로의 내구도를 보완합니다. 지속적으로 높은 지표를 기록중인 레이피어 카밀로의 경우 무기 숙련도 효과를 낮춰 위력을 견제합니다.",
        ],
        valueSummary: "50/100/150(+공격력의 80%) → 50/100/150(+공격력의 90%)",
      },
    ],
  },
  // 캐시 (23)
  {
    characterCode: 23,
    patch: "11.4",
    changes: [
      {
        target: "동맥절제술(Q) - 기본 공격 추가 피해량",
        changeType: "buff",
        description: [
          "Q - 동맥절제술의 기본 공격 추가 피해량을 높여 캐시의 피해 능력을 강화합니다.",
        ],
        valueSummary: "스킬 증폭의 50% → 55%",
      },
    ],
  },
  // 코렐라인 (87)
  {
    characterCode: 87,
    patch: "11.4",
    changes: [
      {
        target: "진실의 거울 / 거짓의 거울(W) - 거울 투사체 발사 딜레이 시간",
        changeType: "nerf",
        description: [
          "코렐라인은 최상위권 실력대에서 지속적으로 높은 선택률과 준수한 성과를 기록하고 있습니다. 지난 패치에서 Q - 단죄의 섬광의 투사체 속도가 조정되었지만 여전히 스킬 회피 난이도가 높은 모습을 보이고 있기에, 이번 패치에서는 W - 진실의 거울 / 거짓의 거울의 투사체 발사 딜레이를 조정하여 스킬 회피의 여지를 부여하고자 합니다.",
        ],
        valueSummary: "0.4초 → 0.5초",
      },
    ],
  },
  // 키아라 (14)
  {
    characterCode: 14,
    patch: "11.4",
    changes: [
      {
        target: "폭주(R) - 체력 회복량",
        changeType: "buff",
        description: [
          "R - 폭주의 체력 회복량을 높여 키아라가 지속 교전에서 보다 강력한 위력을 가질 수 있도록 돕습니다.",
        ],
        valueSummary: "12/17/22(+스킬 증폭의 4%) → 20/25/30(+스킬 증폭의 5%)",
      },
    ],
  },
  // 펜리르 (86)
  {
    characterCode: 86,
    patch: "11.4",
    changes: [
      {
        target: "발악(P) - VF 흡수 체력 회복량",
        changeType: "buff",
        description: [
          "P - 최후의 발악의 VF 흡수 상태일 때 체력 회복량을 상향하여, 교전 중 유지력을 보완합니다.",
        ],
        valueSummary: "7/11/15(+추가 공격력의 12%) → 10/15/20(+추가 공격력의 12%)",
      },
    ],
  },
  // 펠릭스 (49)
  {
    characterCode: 49,
    patch: "11.4",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: [
          "펠릭스의 기본 방어력을 높여 부족한 내구도를 보완하고, R - 뇌룡격의 최대 충전까지 걸리는 시간을 줄여 활용도를 높입니다.",
        ],
        valueSummary: "50 → 53",
      },
      {
        target: "뇌룡격(R) - 최대 충전에 필요한 시간",
        changeType: "buff",
        description: [
          "펠릭스의 기본 방어력을 높여 부족한 내구도를 보완하고, R - 뇌룡격의 최대 충전까지 걸리는 시간을 줄여 활용도를 높입니다.",
        ],
        valueSummary: "1.25초 → 1초",
      },
    ],
  },
  // 프리야 (51)
  {
    characterCode: 51,
    patch: "11.4",
    changes: [
      {
        target: "포르타멘토(W) - 피해량",
        changeType: "buff",
        description: [
          "프리야가 W - 포르타멘토를 공격적으로 사용했을 때 보다 유의미한 피해량이 나올 수 있도록 위력을 상향 조정합니다.",
        ],
        valueSummary: "60/100/140/180/220(+스킬 증폭의 65%) → 60/100/140/180/220(+스킬 증폭의 70%)",
      },
    ],
  },
  // 피오라 (3)
  {
    characterCode: 3,
    patch: "11.4",
    changes: [
      {
        target: "기본 방어력",
        changeType: "nerf",
        description: [
          "피오라는 상위권 실력대에서 높은 선택률과 함께 평균 이상의 지표를 기록하고 있습니다. 기본 방어력을 낮춰 내구도를 소폭 견제합니다.",
        ],
        valueSummary: "56 → 54",
      },
    ],
  },
  // 하트 (8)
  {
    characterCode: 8,
    patch: "11.4",
    changes: [
      {
        target: "Flanger(E) - 쿨다운",
        changeType: "buff",
        description: ["E - Flanger의 쿨다운을 줄여 하트의 기동 능력을 강화합니다."],
        valueSummary: "15/14.5/14/13.5/13초 → 14/13.5/13/12.5/12초",
      },
    ],
  },
  // 헨리 (83)
  {
    characterCode: 83,
    patch: "11.4",
    changes: [
      {
        target: "시간 제어 장치(W) - 피해량",
        changeType: "nerf",
        description: [
          "헨리는 지속적으로 높은 지표를 기록하고 있습니다. W - 시간 제어 장치의 피해량을 낮춰 피해 능력을 견제합니다.",
        ],
        valueSummary:
          "8/16/24/32/40(+스킬 증폭의 22%)(+대상 최대 체력의 1/1/2/2/3%) → 8/16/24/32/40(+스킬 증폭의 20%)(+대상 최대 체력의 1/1/2/2/3%)",
      },
    ],
  },
  // 현우 (7)
  {
    characterCode: 7,
    patch: "11.4",
    changes: [
      {
        target: "선빵필승(E) - 피해량",
        changeType: "buff",
        description: [
          "현우는 현재 낮은 지표를 기록하고 있습니다. 적을 벽에 충돌시키지 않더라도 일정 이상의 피해량이 나올 수 있도록 E - 선빵필승의 적중 시 위력을 올려 보완합니다.",
        ],
        valueSummary:
          "(+추가 공격력의 70%)(+스킬 증폭의 55%)(+대상 현재 체력의 5/8/11/14/17%) → (+추가 공격력의 80%)(+스킬 증폭의 55%)(+대상 현재 체력의 6/9/12/15/18%)",
      },
    ],
  },
];
