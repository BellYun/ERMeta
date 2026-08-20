import type { CharacterPatchNote } from "./10.1";

const PATCH = "12.2";

// 출처:
// - 12.2 패치노트: https://playeternalreturn.com/posts/news/3783?hl=ko-KR
// 개별 실험체 변경 사항만 기록합니다.
export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 6, // 나딘
    patch: PATCH,
    changes: [
      {
        target: "석궁 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["석궁 나딘의 높은 피해 지표를 견제하기 위해 숙련도 효과를 낮췄습니다."],
        valueSummary: "1.3% → 1.2%",
      },
    ],
  },
  {
    characterCode: 74, // 다르코
    patch: PATCH,
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["게임 초중반의 지나치게 강한 교전 능력을 낮췄습니다."],
        valueSummary: "42 → 40",
      },
      {
        target: "수금(W) - 보호막량",
        changeType: "nerf",
        description: ["게임 초중반의 지나치게 강한 교전 능력을 낮췄습니다."],
        valueSummary: "50/90/130/170/210(+공격력의 55%) → 50/85/120/155/190(+공격력의 55%)",
      },
    ],
  },
  {
    characterCode: 65, // 데비&마를렌
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["게임 후반의 내구도와 교전 위력을 보완했습니다."],
        valueSummary: "3 → 3.2",
      },
      {
        target: "휠 댄스(데비 W) - 피해량",
        changeType: "buff",
        description: ["게임 후반의 내구도와 교전 위력을 보완했습니다."],
        valueSummary:
          "40/70/100/130/160(+추가 공격력의 60%)(+대상 최대 체력의 5/5.5/6/6.5/7%) → 40/70/100/130/160(+추가 공격력의 75%)(+대상 최대 체력의 5/5.5/6/6.5/7%)",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: PATCH,
    changes: [
      {
        target: "황혼의 도둑(R) - 보호막량",
        changeType: "nerf",
        description: ["높은 피해량과 내구도를 함께 갖춘 진입의 위험 부담을 높였습니다."],
        valueSummary: "90/120/150(+스킬 증폭의 20%) → 80/110/140(+스킬 증폭의 15%)",
      },
    ],
  },
  {
    characterCode: 20, // 레녹스
    patch: PATCH,
    changes: [
      {
        target: "위풍당당(P) - 보호막량",
        changeType: "buff",
        description: ["전열에서 버틸 수 있도록 교전 유지력을 높였습니다."],
        valueSummary: "최대 체력의 7/10/13% → 8/11/14%",
      },
    ],
  },
  {
    characterCode: 69, // 레니
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["스킬 증폭 아이템 세팅의 내구도와 효율을 보완했습니다."],
        valueSummary: "2.8 → 3",
      },
      {
        target: "권총 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["스킬 증폭 아이템 세팅의 내구도와 효율을 보완했습니다."],
        valueSummary: "4.2% → 4.4%",
      },
      {
        target: "뿅! 망치(W) - 아군 이동 속도 증가",
        changeType: "buff",
        description: ["스킬 증폭 아이템 세팅의 내구도와 효율을 보완했습니다."],
        valueSummary: "12/14/16/18/20(+스킬 증폭의 2%)% → 12/14/16/18/20(+스킬 증폭의 2.5%)%",
      },
    ],
  },
  {
    characterCode: 21, // 로지
    patch: PATCH,
    changes: [
      {
        target: "스핀샷(W) - 방어력 감소",
        changeType: "buff",
        description: ["근접 실험체를 상대할 때의 교전 능력을 높였습니다."],
        valueSummary: "8/9/10/11/12% → 10/11/12/13/14%",
      },
      {
        target: "셈텍스 탄 Mk-II(R) - 즉시 폭발 피해량",
        changeType: "buff",
        description: ["근접 실험체를 상대할 때의 교전 능력을 높였습니다."],
        valueSummary: "대상 최대 체력의 6/9/12% → 7/10/13%",
      },
    ],
  },
  {
    characterCode: 75, // 르노어
    patch: PATCH,
    changes: [
      {
        target: "스타카토(Q) - 동일 대상 연속 적중 피해 감소",
        changeType: "buff",
        description: ["내구도가 높은 대상을 상대할 때의 피해 감소 페널티를 완화했습니다."],
        valueSummary: "55% → 50%",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: PATCH,
    changes: [
      {
        target: "숄 장막(W) - 받는 피해 감소",
        changeType: "buff",
        description: ["낮은 지표를 보완하기 위해 게임 후반 내구도를 높였습니다."],
        valueSummary: "25/27/29/31/33% → 25/28/31/34/37%",
      },
    ],
  },
  {
    characterCode: 53, // 마커스
    patch: PATCH,
    changes: [
      {
        target: "전투 교범(Q) - 체력 회복량",
        changeType: "nerf",
        description: ["높은 내구도와 지속 교전 능력을 일부 낮췄습니다."],
        valueSummary: "입힌 피해량의 130% → 120%",
      },
    ],
  },
  {
    characterCode: 4, // 매그너스
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["게임 초반의 지나치게 강한 교전 능력을 견제했습니다."],
        valueSummary: "1070 → 1030",
      },
    ],
  },
  {
    characterCode: 64, // 바냐
    patch: PATCH,
    changes: [
      {
        target: "몽환 나비(P) - 보호막량",
        changeType: "nerf",
        description: [
          "아르카나 무기 스킬로 높아진 보호막 생성 빈도를 반영해 보호막량을 낮췄습니다.",
        ],
        valueSummary: "30/65/100(+스킬 증폭의 30%) → 30/60/90(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 84, // 블레어
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["전반적으로 낮은 지표를 보완하기 위해 기본 성능을 높였습니다."],
        valueSummary: "86 → 89",
      },
    ],
  },
  {
    characterCode: 88, // 비형
    patch: PATCH,
    changes: [
      {
        target: "신명나게 놀아보자!(R) - 시전 중 받는 피해 감소",
        changeType: "buff",
        description: ["궁극기를 보다 안정적으로 시전할 수 있도록 내구도를 높였습니다."],
        valueSummary: "30% → 40%",
      },
    ],
  },
  {
    characterCode: 28, // 수아
    patch: PATCH,
    changes: [
      {
        target: "마음의 양식(P) - 피해량",
        changeType: "nerf",
        description: ["스킬 개편 이후 이어진 강세를 낮추고 대응 여지를 늘렸습니다."],
        valueSummary: "100/160/220(+스킬 증폭의 50%) → 70/120/170(+스킬 증폭의 50%)",
      },
      {
        target: "오딧세이(Q) - 책 충돌 지점 이동 속도 감소",
        changeType: "nerf",
        description: ["스킬 적중 후에도 벗어날 수 있도록 둔화량을 낮췄습니다."],
        valueSummary: "50/55/60/65/70% → 40/45/50/55/60%",
      },
      {
        target: "돈키호테(E) - 이동 속도 감소",
        changeType: "nerf",
        description: ["스킬 적중 후에도 벗어날 수 있도록 둔화량을 낮췄습니다."],
        valueSummary: "50% → 30%",
      },
    ],
  },
  {
    characterCode: 24, // 아델라
    patch: PATCH,
    changes: [
      {
        target: "레이피어 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["상대적으로 낮은 레이피어 지표를 보완했습니다."],
        valueSummary: "4.6% → 4.7%",
      },
    ],
  },
  {
    characterCode: 17, // 아드리아나
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "nerf",
        description: ["높은 승률과 점수 획득량을 기록한 생존 능력을 견제했습니다."],
        valueSummary: "76 → 74",
      },
    ],
  },
  {
    characterCode: 52, // 아디나
    patch: PATCH,
    changes: [
      {
        target: "루미너리(Q) - 해 천체 추가 피해량",
        changeType: "buff",
        description: ["다른 천체보다 효율이 낮았던 해 천체 효과를 강화했습니다."],
        valueSummary: "20(+스킬 증폭의 15%) → 30(+스킬 증폭의 25%)",
      },
      {
        target: "트라인 에스펙트(W) - 해 천체 추가 피해량",
        changeType: "buff",
        description: ["다른 천체보다 효율이 낮았던 해 천체 효과를 강화했습니다."],
        valueSummary: "20(+스킬 증폭의 15%) → 30(+스킬 증폭의 25%)",
      },
      {
        target: "폴 디그니티(E) - 해 천체 추가 피해량",
        changeType: "buff",
        description: ["다른 천체보다 효율이 낮았던 해 천체 효과를 강화했습니다."],
        valueSummary: "10(+스킬 증폭의 10%) → 20(+스킬 증폭의 15%)",
      },
    ],
  },
  {
    characterCode: 66, // 아르다
    patch: PATCH,
    changes: [
      {
        target: "바빌론의 입방체(W) - 1타 피해량",
        changeType: "buff",
        description: ["낮아진 평균 피해량을 보완했으며 바빌론의 주사위(RW)에도 적용됩니다."],
        valueSummary: "60/80/100/120/140(+스킬 증폭의 45%) → 60/80/100/120/140(+스킬 증폭의 50%)",
      },
    ],
  },
  {
    characterCode: 9, // 아이솔
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["낮은 내구도와 전반적인 지표를 보완했습니다."],
        valueSummary: "900 → 920",
      },
      {
        target: "셈텍스 폭탄(Q) - 피해량",
        changeType: "buff",
        description: ["스킬 적중 시 보다 확실한 피해를 줄 수 있도록 공격력 계수를 높였습니다."],
        valueSummary:
          "60/85/110/135/160(+공격력의 25%)(+스킬 증폭의 70%) → 60/85/110/135/160(+공격력의 35%)(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 35, // 얀
    patch: PATCH,
    changes: [
      {
        target: "위빙(E) - 피해량",
        changeType: "buff",
        description: ["톤파 얀의 낮은 지표를 보완하기 위해 스킬 증폭 계수를 높였습니다."],
        valueSummary:
          "20/30/40/50/60(+추가 공격력의 100%)(+스킬 증폭의 50%)(+적 최대 체력의 5%) → 20/30/40/50/60(+추가 공격력의 100%)(+스킬 증폭의 60%)(+적 최대 체력의 5%)",
      },
    ],
  },
  {
    characterCode: 46, // 에이든
    patch: PATCH,
    changes: [
      {
        target: "과전하(P) - 종료 시 이동 속도 증가",
        changeType: "buff",
        description: ["낮은 점수 획득량을 보완하고 포지셔닝을 돕도록 이동 속도를 높였습니다."],
        valueSummary: "7/10/13% → 10/13/16%",
      },
    ],
  },
  {
    characterCode: 41, // 요한
    patch: PATCH,
    changes: [
      {
        target: "인도하는 빛(E) - 이동 속도 증가",
        changeType: "buff",
        description: ["낮아진 교전 기여도와 아군 보조 능력을 강화했습니다."],
        valueSummary: "6/8/10/12/14(+스킬 증폭의 1%)% → 6/8/10/12/14(+스킬 증폭의 2%)%",
      },
    ],
  },
  {
    characterCode: 36, // 이바
    patch: PATCH,
    changes: [
      {
        target: "VF 방출(R) - 피해량",
        changeType: "nerf",
        description: ["높은 승률과 점수 획득량을 유지한 후반 위력을 낮췄습니다."],
        valueSummary: "8/12/16(+스킬 증폭의 5%) → 6/10/14(+스킬 증폭의 5%)",
      },
      {
        target: "VF 방출(R) - 5스택 추가 피해량",
        changeType: "nerf",
        description: ["높은 승률과 점수 획득량을 유지한 후반 위력을 낮췄습니다."],
        valueSummary: "30/50/70(+스킬 증폭의 30%) → 30/45/60(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: PATCH,
    changes: [
      {
        target: "해방(R) - 공포 지속 시간",
        changeType: "nerf",
        description: ["지속적으로 평균 이상이었던 교전 영향력을 낮췄습니다."],
        valueSummary: "0.9/1.1/1.3초 → 0.9/1/1.1초",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: PATCH,
    changes: [
      {
        target: "암기 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["상대적으로 낮은 암기 지표를 보완했습니다."],
        valueSummary: "3.9% → 4%",
      },
    ],
  },
  {
    characterCode: 1, // 재키
    patch: PATCH,
    changes: [
      {
        target: "단검 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["무기군별 성능 격차를 줄이기 위해 강한 무기 숙련도를 낮췄습니다."],
        valueSummary: "2.8% → 2.4%",
      },
      {
        target: "양손검 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: ["무기군별 성능 격차를 줄이기 위해 강한 무기 숙련도를 낮췄습니다."],
        valueSummary: "2.3% → 2.2%",
      },
      {
        target: "도끼 무기 숙련도 레벨 당 기본 공격 증폭",
        changeType: "buff",
        description: ["무기군별 성능 격차를 줄이기 위해 낮은 도끼 지표를 보완했습니다."],
        valueSummary: "1.9% → 2.1%",
      },
    ],
  },
  {
    characterCode: 38, // 제니
    patch: PATCH,
    changes: [
      {
        target: "페르소나(E) - 피해량",
        changeType: "buff",
        description: ["낮은 스킬 증폭 계수를 소폭 높여 피해 능력을 보완했습니다."],
        valueSummary: "60/95/130/165/200(+스킬 증폭의 58%) → 60/95/130/165/200(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 39, // 카밀로
    patch: PATCH,
    changes: [
      {
        target: "씨에레(W) - 피해량",
        changeType: "nerf",
        description: ["대부분의 구간에서 기록한 매우 높은 지표를 낮췄습니다."],
        valueSummary:
          "5/15/25/35/45(+공격력의 20%) × 기본 공격 증폭 → 5/15/25/35/45(+공격력의 18%) × 기본 공격 증폭",
      },
    ],
  },
  {
    characterCode: 54, // 칼라
    patch: PATCH,
    changes: [
      {
        target: "작살 장전(P) - 장전 게이지 충전 시간",
        changeType: "nerf",
        description: ["강한 성능과 과도한 저지 능력을 낮추기 위해 발동 빈도를 줄였습니다."],
        valueSummary: "13/11/9초 → 14/12/10초",
      },
      {
        target: "구속의 사슬(R) - 이동 속도 감소",
        changeType: "nerf",
        description: ["강한 성능과 과도한 저지 능력을 낮췄습니다."],
        valueSummary: "40/45/50% → 30/35/40%",
      },
    ],
  },
  {
    characterCode: 40, // 클로에
    patch: PATCH,
    changes: [
      {
        target: "살아 있는 마리오네트(P) - 니나 추가 방어력",
        changeType: "buff",
        description: ["니나의 내구도와 자체 전투 능력을 강화했습니다."],
        valueSummary: "15/30/45 → 20/35/50",
      },
      {
        target: "공격 명령(Q) - 피해량",
        changeType: "buff",
        description: ["니나의 내구도와 자체 전투 능력을 강화했습니다."],
        valueSummary:
          "70/90/110/130/150(+니나 공격력의 75%) → 70/90/110/130/150(+니나 공격력의 80%)",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: PATCH,
    changes: [
      {
        target: "파라디소(R) - 대검 적중 피해량",
        changeType: "buff",
        description: ["스킬 난이도에 맞게 대검 적중 시의 보상을 높였습니다."],
        valueSummary: "60/100/140(+스킬 증폭의 40%) → 70/120/170(+스킬 증폭의 45%)",
      },
    ],
  },
  {
    characterCode: 51, // 프리야
    patch: PATCH,
    changes: [
      {
        target: "대지의 메아리(R) - 피해량",
        changeType: "buff",
        description: ["지나치게 낮아진 평균 피해량을 보완했습니다."],
        valueSummary: "80/150/220(+스킬 증폭의 60%) → 80/150/220(+스킬 증폭의 65%)",
      },
    ],
  },
  {
    characterCode: 3, // 피오라
    patch: PATCH,
    changes: [
      {
        target: "레이피어 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["매우 높은 점수 획득량을 기록한 레이피어의 숙련도 효과를 낮췄습니다."],
        valueSummary: "4.2% → 4.1%",
      },
    ],
  },
  {
    characterCode: 83, // 헨리
    patch: PATCH,
    changes: [
      {
        target: "시간 도약(E) - 피해량",
        changeType: "buff",
        description: ["공격적인 스킬 연계를 성공시켰을 때의 보상을 높였습니다."],
        valueSummary: "40/80/120/160/200(+스킬 증폭의 60%) → 40/80/120/160/200(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 7, // 현우
    patch: PATCH,
    changes: [
      {
        target: "도그파이트(P) - 체력 회복량",
        changeType: "buff",
        description: ["오랜 기간 이어진 약세를 보완하기 위해 회복량을 높였습니다."],
        valueSummary: "최대 체력의 5/8/11% → 6/9/12%",
      },
    ],
  },
  {
    characterCode: 78, // 히스이
    patch: PATCH,
    changes: [
      {
        target: "거합일섬(W) - 일륜난무(W3) 피해량",
        changeType: "buff",
        description: ["활용도가 낮았던 일륜난무의 가치를 높였습니다."],
        valueSummary: "10(+추가 공격력의 15/20/25/30/35%) → 20(+추가 공격력의 15/20/25/30/35%)",
      },
    ],
  },
];
