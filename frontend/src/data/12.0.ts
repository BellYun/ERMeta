import type { CharacterPatchNote } from "./10.1";

const PATCH = "12.0";

// 출처: https://playeternalreturn.com/posts/news/3743?hl=ko-KR
// 12.0 Part.2 중 개별 실험체 변경 사항만 기록합니다.
export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 6, // 나딘
    patch: PATCH,
    changes: [
      {
        target: "원숭이 와이어(E) - 쿨다운",
        changeType: "buff",
        description: ["유틸리티 능력을 보완하기 위해 쿨다운을 줄였습니다."],
        valueSummary: "17/16/15/14/13초 → 16/15/14/13/12초",
      },
      {
        target: "원숭이 와이어(E) - 지속 시간",
        changeType: "buff",
        description: ["와이어를 활용할 수 있는 시간을 늘렸습니다."],
        valueSummary: "6초 → 7초",
      },
      {
        target: "늑대 맹습(R) - 피해량",
        changeType: "buff",
        description: ["교전 위력을 강화하기 위해 추가 공격력 계수를 높였습니다."],
        valueSummary:
          "100/150/200(+추가 공격력의 75%)(+스킬 증폭의 80%)(+야성 중첩 피해) → 100/150/200(+추가 공격력의 80%)(+스킬 증폭의 80%)(+야성 중첩 피해)",
      },
    ],
  },
  {
    characterCode: 37, // 다니엘
    patch: PATCH,
    changes: [
      {
        target: "그림자 이동(E) - 은신",
        changeType: "buff",
        description: [
          "단검 무기 스킬 변경 이후에도 암살자다운 진입 방식을 유지하도록 은신을 추가했습니다.",
        ],
        valueSummary: "시전 시 1/1.2/1.4/1.6/1.8초 동안 은신 (신규)",
      },
      {
        target: "그림자 이동(E) - 피해량",
        changeType: "nerf",
        description: ["은신 추가에 맞춰 추가 공격력 계수를 낮췄습니다."],
        valueSummary: "20/40/60/80/100(+추가 공격력의 60%) → 20/40/60/80/100(+추가 공격력의 50%)",
      },
      {
        target: "그림자 이동(E) - 쿨다운",
        changeType: "nerf",
        description: ["은신 추가에 맞춰 재사용 대기 시간을 늘렸습니다."],
        valueSummary: "10/9/8/7/6초 → 11/10/9/8/7초",
      },
    ],
  },
  {
    characterCode: 65, // 데비&마를렌
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["내구도를 보완하기 위해 체력 성장치를 높였습니다."],
        valueSummary: "88 → 90",
      },
      {
        target: "블루&레드(P) - 표식 피해량",
        changeType: "buff",
        description: ["전반적인 위력을 강화하기 위해 추가 공격력 계수를 높였습니다."],
        valueSummary: "15/20/25(+추가 공격력의 75%) → 15/20/25(+추가 공격력의 80%)",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: PATCH,
    changes: [
      {
        target: "괴도(P) - 피해량",
        changeType: "nerf",
        description: ["무기 스킬이 발동 조건에 포함된 점을 반영해 기본 피해량을 낮췄습니다."],
        valueSummary: "20/50/80(+스킬 증폭의 30%) → 20/45/70(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 69, // 레니
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["기본 내구도를 보완했습니다."],
        valueSummary: "79 → 81",
      },
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 내구도를 보완했습니다."],
        valueSummary: "50 → 53",
      },
      {
        target: "곰돌이! 공격(P) - 피해량",
        changeType: "rework",
        description: ["레벨 계수 일부를 스킬 증폭 계수로 이전했습니다."],
        valueSummary: "15/25/35(+레니 레벨*4) → 15/25/35(+레니 레벨*2)(+스킬 증폭의 10%)",
      },
      {
        target: "당근! 바주카(Q) - 피해량",
        changeType: "rework",
        description: ["기본 피해와 스킬 증폭 계수를 높이고 레벨 계수를 낮췄습니다."],
        valueSummary:
          "40/55/70/85/100(+레니 레벨*18)(+스킬 증폭의 35%) → 50/70/90/110/130(+레니 레벨*8)(+스킬 증폭의 60%)",
      },
      {
        target: "뿅! 망치(W) - 이동 속도 증가",
        changeType: "rework",
        description: ["레벨 계수를 스킬 증폭 계수로 변경했습니다."],
        valueSummary: "8/9/10/11/12(+레니 레벨*1) → 12/14/16/18/20(+스킬 증폭의 2%)",
      },
      {
        target: "에어 호른! 건(E) - 피해량",
        changeType: "rework",
        description: ["레벨 계수를 낮추고 스킬 증폭 계수를 높였습니다."],
        valueSummary:
          "20/40/60/80/100(+레니 레벨*9)(+스킬 증폭의 35%) → 20/40/60/80/100(+레니 레벨*5)(+스킬 증폭의 45%)",
      },
      {
        target: "스프링! 트랩(R) - 피해량",
        changeType: "rework",
        description: ["레벨 계수를 낮추고 스킬 증폭 계수를 높였습니다."],
        valueSummary:
          "100/150/200(+레니 레벨*12)(+스킬 증폭의 40%) → 100/150/200(+레니 레벨*8)(+스킬 증폭의 55%)",
      },
      {
        target: "스프링! 트랩(R) - 쿨다운",
        changeType: "buff",
        description: ["궁극기 활용도를 높이기 위해 쿨다운을 줄였습니다."],
        valueSummary: "22/20/18초 → 20/18/16초",
      },
    ],
  },
  {
    characterCode: 20, // 레녹스
    patch: PATCH,
    changes: [
      {
        target: "위풍당당(P) - 쿨다운",
        changeType: "nerf",
        description: ["무기 스킬이 발동 조건에 포함된 점을 반영해 쿨다운을 늘렸습니다."],
        valueSummary: "15/13/11초 → 16/14/12초",
      },
    ],
  },
  {
    characterCode: 4, // 매그너스
    patch: PATCH,
    changes: [
      {
        target: "근성(P) - 중첩 획득 방식",
        changeType: "buff",
        description: ["스킬을 여러 적에게 동시에 적중하면 적중한 수만큼 근성 중첩을 획득합니다."],
      },
    ],
  },
  {
    characterCode: 64, // 바냐
    patch: PATCH,
    changes: [
      {
        target: "몽환 나비(P) - 보호막 획득량",
        changeType: "nerf",
        description: ["무기 스킬이 발동 조건에 포함된 점을 반영해 보호막 계수를 낮췄습니다."],
        valueSummary: "30/65/100(+스킬 증폭의 35%) → 30/65/100(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 18, // 쇼이치
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["단검 무기 스킬 변경 이후의 내구도를 보완했습니다."],
        valueSummary: "940 → 980",
      },
      {
        target: "부당 거래(P) - 단검 피해량",
        changeType: "nerf",
        description: ["무기 스킬 적중으로 중첩을 얻는 변경에 맞춰 기본 피해량을 낮췄습니다."],
        valueSummary: "60/90/120(+스킬 증폭의 30%) → 50/80/110(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 28, // 수아
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["파랑새(W)의 보호막 강화에 맞춰 기본 내구도를 낮췄습니다."],
        valueSummary: "1070 → 1020",
      },
      {
        target: "기본 방어력",
        changeType: "nerf",
        description: ["파랑새(W)의 보호막 강화에 맞춰 기본 내구도를 낮췄습니다."],
        valueSummary: "57 → 54",
      },
      {
        target: "마음의 양식(P) - 피해량 비례 체력 회복량",
        changeType: "nerf",
        description: ["기본 스킬 개선에 맞춰 유지력을 낮췄습니다."],
        valueSummary: "42% → 35%",
      },
      {
        target: "오딧세이(Q) - 다음 행동 딜레이",
        changeType: "buff",
        description: ["스킬 이후 다음 행동까지의 딜레이를 줄였습니다."],
      },
      {
        target: "오딧세이(Q) - 기절 지속 시간",
        changeType: "nerf",
        description: [
          "스킬 연계 개선에 맞춰 군중 제어 시간을 낮췄으며 기억력(RQ)에도 동일하게 적용됩니다.",
        ],
        valueSummary: "0.75초 → 0.6초",
      },
      {
        target: "파랑새(W) - 시전 대상",
        changeType: "rework",
        description: [
          "아군 대상 시전을 제거하고 대상 없이 사용하면 자신에게 시전되도록 변경했습니다.",
        ],
        valueSummary: "아군 시전 가능 → 자신에게만 시전",
      },
      {
        target: "파랑새(W) - 보호막 지속 시간",
        changeType: "buff",
        description: [
          "자신의 내구도를 보완하도록 보호막 지속 시간을 늘렸으며 기억력(RW)에도 동일하게 적용됩니다.",
        ],
        valueSummary: "2초 → 2.5초",
      },
      {
        target: "파랑새(W) - 보호막 흡수량",
        changeType: "buff",
        description: ["자신의 내구도를 보완하도록 보호막량을 높였습니다."],
        valueSummary: "80/100/120/140/160(+스킬 증폭의 30%) → 80/110/140/170/200(+스킬 증폭의 40%)",
      },
      {
        target: "기억력 - 파랑새(RW) - 보호막 흡수량",
        changeType: "buff",
        description: ["강화 파랑새의 스킬 증폭 계수를 높였습니다."],
        valueSummary: "100/180/260(+스킬 증폭의 30%) → 100/180/260(+스킬 증폭의 40%)",
      },
      {
        target: "돈키호테(E) - 책갈피 부여",
        changeType: "buff",
        description: ["스킬 적중 시 대상에게 책갈피를 부여하도록 변경했습니다."],
        valueSummary: "책갈피 부여 (신규)",
      },
      {
        target: "돈키호테(E) - 적중 시 쿨다운 감소",
        changeType: "nerf",
        description: ["책갈피 부여 추가에 맞춰 적중 시 쿨다운 감소량을 낮췄습니다."],
        valueSummary: "30% → 20%",
      },
      {
        target: "돈키호테(E) - 에어본 지속 시간",
        changeType: "nerf",
        description: [
          "스킬 연계 개선에 맞춰 군중 제어 시간을 낮췄으며 기억력(RE)에도 동일하게 적용됩니다.",
        ],
        valueSummary: "0.75초 → 0.6초",
      },
      {
        target: "기억력(R) - 쿨다운",
        changeType: "nerf",
        description: ["기본 스킬 개선에 맞춰 후반 쿨다운을 늘렸습니다."],
        valueSummary: "26/22/18초 → 26/23/20초",
      },
    ],
  },
  {
    characterCode: 27, // 알렉스
    patch: PATCH,
    changes: [
      {
        target: "잠입(P) - 근접 무기 장착 시 방어력 증가",
        changeType: "buff",
        description: ["무기 스킬 변경 이후의 내구도를 보완했습니다."],
        valueSummary: "4/8/12 → 6/12/18",
      },
      {
        target: "교란(근접 E) - 도발 지속 시간",
        changeType: "buff",
        description: ["스킬 연계를 안정적으로 이어가도록 도발 시간을 늘렸습니다."],
        valueSummary: "0.7초 → 0.8초",
      },
    ],
  },
  {
    characterCode: 35, // 얀
    patch: PATCH,
    changes: [
      {
        target: "쿼드라곤(R) - 스킬 판정",
        changeType: "rework",
        description: ["사각 링의 각 피해마다 개별 스킬 판정이 적용되도록 분리했습니다."],
      },
    ],
  },
  {
    characterCode: 46, // 에이든
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["성장 구간 내구도를 보완했습니다."],
        valueSummary: "94 → 96",
      },
      {
        target: "전하 소산(W) - 충전 중 이동 속도 감소",
        changeType: "buff",
        description: ["충전 중 기동성을 보완하기 위해 이동 속도 감소량을 낮췄습니다."],
        valueSummary: "20% → 15%",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: PATCH,
    changes: [
      {
        target: "겨울여왕의 영지(P) - 스킬 적중 시 냉기 획득량",
        changeType: "nerf",
        description: ["무기 스킬로 냉기를 부여할 수 있게 된 점을 반영해 획득량을 낮췄습니다."],
        valueSummary: "20 → 15",
      },
      {
        target: "겨울여왕의 영지(P) - 빙결에 필요한 냉기",
        changeType: "buff",
        description: ["빙결에 필요한 냉기 게이지를 낮췄습니다."],
        valueSummary: "120 → 100",
      },
    ],
  },
  {
    characterCode: 32, // 윌리엄
    patch: PATCH,
    changes: [
      {
        target: "와인드업(W) - 방어력 증가",
        changeType: "buff",
        description: ["내구도를 보완하기 위해 방어력 증가량을 높였습니다."],
        valueSummary: "10/13/16/19/22 → 12/15/18/21/24",
      },
    ],
  },
  {
    characterCode: 79, // 유스티나
    patch: PATCH,
    changes: [
      {
        target: "아스트라 에너지(P) - 표식 및 전이 피해",
        changeType: "rework",
        description: [
          "전이 피해가 비정상적으로 낮게 적용되던 문제를 수정하고 수치를 조정했습니다.",
        ],
        valueSummary: "40/60/80(+스킬 증폭의 20%) → 30/50/70(+스킬 증폭의 15%)",
      },
      {
        target: "아스트라 에너지(P) - 재충전 시간",
        changeType: "buff",
        description: ["석궁 무기 스킬 변경 이후의 활용도를 보완했습니다."],
        valueSummary: "4초 → 3.5초",
      },
    ],
  },
  {
    characterCode: 11, // 유키
    patch: PATCH,
    changes: [
      {
        target: "빗겨치고 일격(E) - 사거리",
        changeType: "buff",
        description: ["기동 능력을 강화하기 위해 사거리를 늘렸습니다."],
        valueSummary: "4.75m → 5m",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: PATCH,
    changes: [
      {
        target: "간디바(W) - 차크람 충전 시간",
        changeType: "nerf",
        description: ["무기 스킬로 차크람 중첩을 얻는 변경에 맞춰 충전 시간을 늘렸습니다."],
        valueSummary: "7초 → 8초",
      },
    ],
  },
  {
    characterCode: 54, // 칼라
    patch: PATCH,
    changes: [
      {
        target: "회수(W) - 이동 속도 감소",
        changeType: "buff",
        description: ["석궁 무기 스킬 변경 이후의 저지 능력을 강화했습니다."],
        valueSummary: "30% → 35%",
      },
      {
        target: "작살 장전(P) - 완전 충전 시 이동 속도 감소 지속 시간",
        changeType: "buff",
        description: ["완전 충전 공격의 저지력을 강화했습니다."],
        valueSummary: "0.5초 → 0.75초",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: PATCH,
    changes: [
      {
        target: "단검 무기 숙련도 레벨 당 공격 속도",
        changeType: "buff",
        description: ["단검 운용의 성장 효율을 높였습니다."],
        valueSummary: "2.7% → 3.4%",
      },
      {
        target: "동맥절제술(Q) - 기본 공격 추가 피해량",
        changeType: "nerf",
        description: ["무기 스킬이 지속 효과 발동에 포함된 점을 반영해 추가 피해량을 낮췄습니다."],
        valueSummary: "55% → 50%",
      },
    ],
  },
  {
    characterCode: 87, // 코렐라인
    patch: PATCH,
    changes: [
      {
        target: "이세계의 잔영(R) - 스킬 적중 시 쿨다운 감소",
        changeType: "nerf",
        description: ["스킬 적중으로 얻는 쿨다운 감소량을 낮췄습니다."],
        valueSummary: "10% → 8%",
      },
      {
        target: "이세계의 잔영(R) - 쿨다운",
        changeType: "buff",
        description: ["기본 쿨다운을 줄여 활용 주기를 보완했습니다."],
        valueSummary: "32/29/26초 → 28/25/22초",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: PATCH,
    changes: [
      {
        target: "암기 무기 숙련도 레벨 당 공격 속도",
        changeType: "buff",
        description: ["플레이 감각을 개선하기 위해 숙련도 공격 속도 효과를 높였습니다."],
        valueSummary: "2.9% → 4%",
      },
    ],
  },
  {
    characterCode: 12, // 혜진
    patch: PATCH,
    changes: [
      {
        target: "삼재(P) - 피해량 스킬 증폭 계수",
        changeType: "nerf",
        description: ["무기 스킬로 삼재 중첩을 쌓는 변경에 맞춰 후반 계수를 낮췄습니다."],
        valueSummary: "10/20/30% → 10/15/20%",
      },
      {
        target: "삼재(P) - 공포 지속 시간",
        changeType: "rework",
        description: ["초반 지속 시간은 높이고 후반 지속 시간은 낮췄습니다."],
        valueSummary: "0.9/1.1/1.3초 → 1/1.1/1.2초",
      },
      {
        target: "제압부(Q) - 피해량",
        changeType: "buff",
        description: ["지속 교전 능력을 보완하기 위해 기본 피해량을 높였습니다."],
        valueSummary: "80/110/140/170/200(+스킬 증폭의 80%) → 80/115/150/185/220(+스킬 증폭의 80%)",
      },
      {
        target: "오대존명왕진(R) - 스킬 판정",
        changeType: "rework",
        description: ["범위 피해와 각 부적의 피해마다 개별 스킬 판정이 적용되도록 분리했습니다."],
      },
    ],
  },
  {
    characterCode: 78, // 히스이
    patch: PATCH,
    changes: [
      {
        target: "거합일섬(W) - 일도양단(W1) 1타 피해량",
        changeType: "nerf",
        description: [
          "무기 스킬 판정 변경 이후 과도한 위력이 나오지 않도록 추가 공격력 계수를 낮췄습니다.",
        ],
        valueSummary: "15/30/45/60/75(+추가 공격력의 50%) → 15/30/45/60/75(+추가 공격력의 40%)",
      },
      {
        target: "거합일섬(W) - 일도양단(W1) 보호막 흡수량",
        changeType: "nerf",
        description: ["무기 스킬 판정 변경 이후의 내구도를 조정했습니다."],
        valueSummary: "10/15/20/25/30(+추가 공격력의 40%) → 10/15/20/25/30(+추가 공격력의 30%)",
      },
    ],
  },
];
