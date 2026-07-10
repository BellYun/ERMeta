import type { CharacterPatchNote } from "./10.1";

const PATCH = "11.6";

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["높은 선택률과 내구도 지표를 견제하기 위해 기본 체력을 낮췄습니다."],
        valueSummary: "1000 → 970",
      },
    ],
  },
  {
    characterCode: 74, // 다르코
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["전방 교전에서의 안정성을 보완하기 위해 체력 성장치를 높였습니다."],
        valueSummary: "93 → 96",
      },
    ],
  },
  {
    characterCode: 65, // 데비&마를렌
    patch: PATCH,
    changes: [
      {
        target: "블루&레드(P) - 피해량",
        changeType: "buff",
        description: ["아쉬운 교전 화력을 보완하기 위해 주력 패시브 피해 계수를 높였습니다."],
        valueSummary:
          "15/20/25(+추가 공격력의 70%)(+치명타 확률의 50%) → 15/20/25(+추가 공격력의 75%)(+치명타 확률의 50%)",
      },
    ],
  },
  {
    characterCode: 20, // 레녹스
    patch: PATCH,
    changes: [
      {
        target: "위풍당당(P) - 쿨다운 감소 방식",
        changeType: "buff",
        description: [
          "2회 타격 스킬을 모두 적중했을 때 각 타격마다 쿨다운 감소가 적용되도록 개선했습니다.",
        ],
        valueSummary: "스킬 적중 단위 → 개별 타격 단위",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: PATCH,
    changes: [
      {
        target: "녹화 - 방송 중(R) 촬영 중 가장자리 피해량",
        changeType: "buff",
        description: ["긴 시전 시간 대비 부족했던 궁극기 적중 보상을 높였습니다."],
        valueSummary: "10/15/20(+공격력의 10%) → 10/15/20(+공격력의 15%)",
      },
      {
        target: "녹화 - 방송 중(R) 촬영 중 가운데 피해량",
        changeType: "buff",
        description: ["긴 시전 시간 대비 부족했던 궁극기 적중 보상을 높였습니다."],
        valueSummary: "20/25/30(+공격력의 15%) → 20/25/30(+공격력의 20%)",
      },
      {
        target: "녹화 - 방송 중(R) 촬영 종료 가장자리 피해량",
        changeType: "buff",
        description: ["긴 시전 시간 대비 부족했던 궁극기 적중 보상을 높였습니다."],
        valueSummary: "100/200/300(+공격력의 80%) → 100/200/300(+공격력의 90%)",
      },
      {
        target: "녹화 - 방송 중(R) 촬영 종료 가운데 피해량",
        changeType: "buff",
        description: ["긴 시전 시간 대비 부족했던 궁극기 적중 보상을 높였습니다."],
        valueSummary: "200/325/450(+공격력의 120%) → 200/325/450(+공격력의 130%)",
      },
    ],
  },
  {
    characterCode: 4, // 매그너스
    patch: PATCH,
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["부족한 내구도 지표를 보완하기 위해 기본 방어력을 높였습니다."],
        valueSummary: "49 → 50",
      },
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["부족한 내구도 지표를 보완하기 위해 방어력 성장치를 높였습니다."],
        valueSummary: "3.2 → 3.3",
      },
    ],
  },
  {
    characterCode: 85, // 미르카
    patch: PATCH,
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["초반 내구도를 보완하기 위해 기본 방어력을 높였습니다."],
        valueSummary: "50 → 52",
      },
    ],
  },
  {
    characterCode: 25, // 버니스
    patch: PATCH,
    changes: [
      {
        target: "올가미 탄(R) - 속박 지속 시간",
        changeType: "buff",
        description: ["스킬 연계와 저지력을 강화하기 위해 속박 시간을 늘렸습니다."],
        valueSummary: "1.25초 → 1.4초",
      },
    ],
  },
  {
    characterCode: 43, // 셀린
    patch: PATCH,
    changes: [
      {
        target: "투척 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["최상위권에서 높은 지표를 보이는 후반 위력을 견제했습니다."],
        valueSummary: "4.3% → 4.2%",
      },
    ],
  },
  {
    characterCode: 13, // 쇼우
    patch: PATCH,
    changes: [
      {
        target: "웍 돌진(E) - 쿨다운",
        changeType: "buff",
        description: ["초반 쿨다운 부담을 줄여 스킬 운용 편의성을 개선했습니다."],
        valueSummary: "18/16/14/12/10초 → 14/13/12/11/10초",
      },
      {
        target: "뜨거운 맛(R) - 피해량",
        changeType: "buff",
        description: ["피해량 지표를 보완하기 위해 궁극기의 체력 비례 피해량을 높였습니다."],
        valueSummary:
          "60/95/130(+스킬 증폭의 50%)(+최대 체력의 5%) → 60/95/130(+스킬 증폭의 50%)(+최대 체력의 6%)",
      },
      {
        target: "뜨거운 맛(R) - 치유 효과 감소",
        changeType: "buff",
        description: ["회복 견제력을 높이고 중첩 구조를 조정했습니다."],
        valueSummary: "10%, 최대 3중첩 → 15%, 최대 2중첩",
      },
    ],
  },
  {
    characterCode: 18, // 쇼이치
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["최상위권에서 강한 성과를 보이는 만큼 집중 공격 대응 여지를 늘렸습니다."],
        valueSummary: "980 → 940",
      },
    ],
  },
  {
    characterCode: 16, // 실비아
    patch: PATCH,
    changes: [
      {
        target: "스피드 건(Q) - 피해량",
        changeType: "buff",
        description: ["초반 교전 단계에서도 일정 수준의 위력을 낼 수 있도록 피해량을 높였습니다."],
        valueSummary: "60/90/120/150/180(+스킬 증폭의 60%) → 60/95/130/165/200(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 17, // 아드리아나
    patch: PATCH,
    changes: [
      {
        target: "투척 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["낮았던 무기 숙련도 효율을 보완했습니다."],
        valueSummary: "4% → 4.1%",
      },
      {
        target: "방화(Q) - 피해량",
        changeType: "buff",
        description: ["근접 교전에서 부족한 성능을 보완하기 위해 스킬 증폭 계수를 높였습니다."],
        valueSummary:
          "35/45/55/65/75(+스킬 증폭의 25/27/29/31/33%) → 35/45/55/65/75(+스킬 증폭의 27/29/31/33/35%)",
      },
    ],
  },
  {
    characterCode: 52, // 아디나
    patch: PATCH,
    changes: [
      {
        target: "루미너리(Q) - 해 컨정션 지속 피해량",
        changeType: "nerf",
        description: ["지난 패치 상향 이후 유지되던 높은 피해량 지표를 조정했습니다."],
        valueSummary: "대상 최대 체력의 11% → 10%",
      },
    ],
  },
  {
    characterCode: 67, // 아비게일
    patch: PATCH,
    changes: [
      {
        target: "호라이즌 클리브(W) - 보호막량",
        changeType: "buff",
        description: ["적진 진입 후 교전을 이어갈 수 있도록 보호막 계수를 높였습니다."],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 35%) → 50/75/100/125/150(+스킬 증폭의 40%)",
      },
    ],
  },
  {
    characterCode: 9, // 아이솔
    patch: PATCH,
    changes: [
      {
        target: "돌격 소총 무기 숙련도 레벨 당 공격 속도",
        changeType: "nerf",
        description: ["최상위권을 제외한 구간에서 강한 화력을 보이는 만큼 공격 속도를 낮췄습니다."],
        valueSummary: "3.3% → 3%",
      },
    ],
  },
  {
    characterCode: 59, // 아이작
    patch: PATCH,
    changes: [
      {
        target: "착취(P) - 피해량",
        changeType: "buff",
        description: ["근접 교전 경쟁력을 높이기 위해 대상 최대 체력 비례 피해량을 상향했습니다."],
        valueSummary:
          "20/30/40(+공격력의 60%)(+대상 최대 체력의 3/4/5%) → 20/30/40(+공격력의 60%)(+대상 최대 체력의 4/5/6%)",
      },
    ],
  },
  {
    characterCode: 55, // 에스텔
    patch: PATCH,
    changes: [
      {
        target: "방패 방어(E) - 받는 피해 감소",
        changeType: "buff",
        description: ["스킬 증폭 세팅에서도 내구도를 확보할 수 있도록 계수를 높였습니다."],
        valueSummary: "20/24/28/32/36%(+스킬 증폭의 3%) → 20/24/28/32/36%(+스킬 증폭의 4%)",
      },
    ],
  },
  {
    characterCode: 46, // 에이든
    patch: PATCH,
    changes: [
      {
        target: "양손검 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["높은 승률과 점수 획득량을 보이는 피해 능력을 견제했습니다."],
        valueSummary: "2.1% → 2%",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: PATCH,
    changes: [
      {
        target: "레이피어 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["기대 이하의 피해량 지표를 보완하기 위해 스킬 증폭 효율을 높였습니다."],
        valueSummary: "4.5% → 4.8%",
      },
    ],
  },
  {
    characterCode: 79, // 유스티나
    patch: PATCH,
    changes: [
      {
        target: "부스트 대시(E) - 피해량",
        changeType: "buff",
        description: ["교전 시 화력을 보완하기 위해 스킬 증폭 계수를 높였습니다."],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 30%) → 50/75/100/125/150(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 61, // 이렘
    patch: PATCH,
    changes: [
      {
        target: "바운싱 볼(Q) - 피해량",
        changeType: "buff",
        description: ["인간 상태의 견제 능력을 보완하기 위해 피해량을 높였습니다."],
        valueSummary: "50/70/90/110/130(+스킬 증폭의 55%) → 50/75/100/125/150(+스킬 증폭의 55%)",
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
        description: ["높은 점수 획득량을 보이는 양손검 재키의 위력을 낮췄습니다."],
        valueSummary: "2.5% → 2.4%",
      },
    ],
  },
  {
    characterCode: 72, // 카티야
    patch: PATCH,
    changes: [
      {
        target: "저격총 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "buff",
        description: ["낮은 점수 획득량과 피해량 지표를 보완하기 위해 무기 숙련도를 강화했습니다."],
        valueSummary: "1.9% → 2%",
      },
    ],
  },
  {
    characterCode: 54, // 칼라
    patch: PATCH,
    changes: [
      {
        target: "회수(W) - 피해량",
        changeType: "buff",
        description: [
          "대부분의 구간에서 아쉬운 지표를 보완하기 위해 주력 스킬 피해량을 높였습니다.",
        ],
        valueSummary:
          "70/95/120/145/170(+공격력의 30%)(+스킬 증폭의 75%)(+치명타 확률의 65%) → 80/105/130/155/180(+공격력의 30%)(+스킬 증폭의 75%)(+치명타 확률의 65%)",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: PATCH,
    changes: [
      {
        target: "외과 전문의(P) - 보호막량",
        changeType: "buff",
        description: ["장기간 부진한 지표를 보완하기 위해 패시브의 방어 성능을 높였습니다."],
        valueSummary: "50/100/150(+스킬 증폭의 45%) → 70/120/170(+스킬 증폭의 45%)",
      },
      {
        target: "외과 전문의(P) - 외상 피해량",
        changeType: "buff",
        description: ["장기간 부진한 지표를 보완하기 위해 패시브의 공격 성능을 높였습니다."],
        valueSummary: "스킬 증폭의 20% → 스킬 증폭의 25%",
      },
      {
        target: "외과 전문의(P) - 치명적 외상 피해량",
        changeType: "buff",
        description: ["장기간 부진한 지표를 보완하기 위해 최대 체력 비례 피해량을 높였습니다."],
        valueSummary:
          "(+대상 최대 체력의 4%)(+스킬 증폭의 25%) → (+대상 최대 체력의 6%)(+스킬 증폭의 25%)",
      },
    ],
  },
  {
    characterCode: 87, // 코렐라인
    patch: PATCH,
    changes: [
      {
        target: "아르카나 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["연속 하향 이후 낮아진 지표를 보완하기 위해 무기 숙련도를 소폭 높였습니다."],
        valueSummary: "4% → 4.1%",
      },
    ],
  },
  {
    characterCode: 89, // 크레이버
    patch: PATCH,
    changes: [
      {
        target: "데스페라도(P) - 피해량",
        changeType: "buff",
        description: ["부족한 자체 교전력을 보완하기 위해 기본 공격 추가 피해량을 높였습니다."],
        valueSummary:
          "10/30/50(+스킬 증폭의 25%)(+공격 속도의 50%) → 20/40/60(+스킬 증폭의 25%)(+공격 속도의 50%)",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: PATCH,
    changes: [
      {
        target: "아르띠지아나토(P) - 쿨다운",
        changeType: "buff",
        description: ["유리 파편 생성과 활용이 더 원활하도록 재사용 대기시간을 줄였습니다."],
        valueSummary: "13/10/7초 → 10/8/6초",
      },
    ],
  },
  {
    characterCode: 62, // 테오도르
    patch: PATCH,
    changes: [
      {
        target: "에너지 포(Q) - 스크린 발사 피해량",
        changeType: "buff",
        description: ["원거리 견제 위력을 보완하기 위해 스크린 발사 피해량 계수를 높였습니다."],
        valueSummary: "70/110/150/190/230(+스킬 증폭의 75%) → 70/110/150/190/230(+스킬 증폭의 80%)",
      },
    ],
  },
  {
    characterCode: 49, // 펠릭스
    patch: PATCH,
    changes: [
      {
        target: "기본 공격력",
        changeType: "buff",
        description: ["낮은 점수 획득량 지표를 보완하기 위해 기본 공격력을 높였습니다."],
        valueSummary: "33 → 35",
      },
    ],
  },
  {
    characterCode: 51, // 프리야
    patch: PATCH,
    changes: [
      {
        target: "개화의 선율(Q) - 피해량",
        changeType: "buff",
        description: ["원거리 견제 능력을 강화하기 위해 스킬 증폭 계수를 높였습니다."],
        valueSummary: "60/90/120/150/180(+스킬 증폭의 70%) → 60/90/120/150/180(+스킬 증폭의 75%)",
      },
    ],
  },
  {
    characterCode: 56, // 피올로
    patch: PATCH,
    changes: [
      {
        target: "쌍절곤 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["높은 점수 획득량을 유지하는 전반 성능을 낮췄습니다."],
        valueSummary: "4.6% → 4.5%",
      },
    ],
  },
  {
    characterCode: 83, // 헨리
    patch: PATCH,
    changes: [
      {
        target: "시차 균열(P) - 피해량",
        changeType: "nerf",
        description: [
          "다수 구간에서 이어지는 강세를 견제하기 위해 잃은 체력 비례 피해량을 낮췄습니다.",
        ],
        valueSummary:
          "40/70/100(+스킬 증폭의 30%)(+대상 잃은 체력의 8/12/16%) → 40/70/100(+스킬 증폭의 30%)(+대상 잃은 체력의 8/10/12%)",
      },
    ],
  },
  {
    characterCode: 7, // 현우
    patch: PATCH,
    changes: [
      {
        target: "도그파이트(P) - 피해량",
        changeType: "buff",
        description: ["오랜 약세를 보완하기 위해 패시브 피해 계수를 높였습니다."],
        valueSummary:
          "40/70/100(+공격력의 60%)(+스킬 증폭의 40%) → 40/70/100(+공격력의 70%)(+스킬 증폭의 45%)",
      },
    ],
  },
];
