import type { CharacterPatchNote } from "./10.1";

const PATCH = "12.3";

// 출처:
// - 12.3 패치노트: https://playeternalreturn.com/posts/news/3813?hl=ko-KR
// 개별 실험체 변경 사항만 기록합니다.
export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: PATCH,
    changes: [
      {
        target: "억누른 고통(W) - 받는 피해 감소",
        changeType: "nerf",
        description: ["교전 중의 과도한 생존력을 낮췄습니다."],
        valueSummary: "50% → 45%",
      },
      {
        target: "처형식(R) - 속박 지속 시간",
        changeType: "nerf",
        description: ["강력한 군중 제어 능력을 일부 낮췄습니다."],
        valueSummary: "0.8초 → 0.7초",
      },
    ],
  },
  {
    characterCode: 6, // 나딘
    patch: PATCH,
    changes: [
      {
        target: "늑대 맹습(R) - 피해량",
        changeType: "nerf",
        description: ["석궁 나딘의 강력한 교전 화력을 낮췄습니다."],
        valueSummary:
          "100/150/200(+추가 공격력의 80%)(+스킬 증폭의 80%)(+야성 중첩 피해) → 100/150/200(+추가 공격력의 75%)(+스킬 증폭의 80%)(+야성 중첩 피해)",
      },
    ],
  },
  {
    characterCode: 34, // 나타폰
    patch: PATCH,
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["초반 안정성을 높였습니다."],
        valueSummary: "905 → 930",
      },
      {
        target: "슬로우 셔터(P) - 피해량",
        changeType: "buff",
        description: ["부족한 교전 위력을 보완했습니다."],
        valueSummary:
          "30/60/90(+공격 속도의 20%)(+스킬 증폭의 65%) → 40/70/100(+공격 속도의 20%)(+스킬 증폭의 65%)",
      },
    ],
  },
  {
    characterCode: 33, // 니키
    patch: PATCH,
    changes: [
      {
        target: "격투 액션(Q) - 미적중 시 후딜레이",
        changeType: "buff",
        description: ["스킬을 적중시키지 못했을 때의 조작감을 개선했습니다."],
        valueSummary: "0.13초 → 삭제",
      },
    ],
  },
  {
    characterCode: 37, // 다니엘
    patch: PATCH,
    changes: [
      {
        target: "걸작(R) - 종료 피해량",
        changeType: "buff",
        description: ["암살 역할의 결정력을 보완했습니다."],
        valueSummary: "40/105/170(+공격력의 90%) → 40/105/170(+공격력의 95%)",
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
        description: ["높은 선택률과 강력한 기본 공격 위력을 낮췄습니다."],
        valueSummary: "1.7% → 1.6%",
      },
    ],
  },
  {
    characterCode: 69, // 레니
    patch: PATCH,
    changes: [
      {
        target: "에어 호른! 건(E) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 세팅의 교전 위력을 높였습니다."],
        valueSummary:
          "20/40/60/80/100(+레니 레벨*5)(+스킬 증폭의 45%) → 20/40/60/80/100(+레니 레벨*5)(+스킬 증폭의 55%)",
      },
      {
        target: "에어 호른! 건(E) - 보호막량",
        changeType: "buff",
        description: ["아군 보호 능력을 보완했습니다."],
        valueSummary:
          "50/65/80/95/110(+레니 레벨*3)(+스킬 증폭의 20%) → 50/65/80/95/110(+레니 레벨*3)(+스킬 증폭의 25%)",
      },
    ],
  },
  {
    characterCode: 29, // 레온
    patch: PATCH,
    changes: [
      {
        target: "인간 어뢰(P) - 피해량",
        changeType: "nerf",
        description: ["물길 위에서의 과도한 교전 위력을 낮췄습니다."],
        valueSummary: "30/45/60(+스킬 증폭의 35%) → 30/40/50(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 90, // 루치아
    patch: PATCH,
    changes: [
      {
        target: "무엄하시네요!(E) - 쿨다운",
        changeType: "buff",
        description: ["높은 기동력의 적을 상대할 때의 생존력과 교전 빈도를 보완했습니다."],
        valueSummary: "14/13/12/11/10초 → 13/12/11/10/9초",
      },
    ],
  },
  {
    characterCode: 10, // 리 다이린
    patch: PATCH,
    changes: [
      {
        target: "취호격파산(R) - 최소 피해량",
        changeType: "buff",
        description: ["공격력 아이템 세팅의 결정력을 높였습니다."],
        valueSummary:
          "20/70/120(+공격력의 60%)(+소모한 취기의 50%) → 20/70/120(+공격력의 70%)(+소모한 취기의 50%)",
      },
      {
        target: "취호격파산(R) - 최대 피해량",
        changeType: "buff",
        description: ["공격력 아이템 세팅의 결정력을 높였습니다."],
        valueSummary:
          "30/105/180(+공격력의 90%)(+소모한 취기의 75%) → 30/105/180(+공격력의 105%)(+소모한 취기의 75%)",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: PATCH,
    changes: [
      {
        target: "재생(P) - 방송 중 기본 공격 피해량",
        changeType: "nerf",
        description: ["상위 구간에서의 과도한 기본 공격 위력을 낮췄습니다."],
        valueSummary: "(+공격력의 55%)*(기본 공격 증폭) → (+공격력의 52%)*(기본 공격 증폭)",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: PATCH,
    changes: [
      {
        target: "캣 워크(E) - 쿨다운",
        changeType: "buff",
        description: ["아군 보조와 진형 진입의 유연성을 높였습니다."],
        valueSummary: "18/17/16/15/14초 → 17/16/15/14/13초",
      },
    ],
  },
  {
    characterCode: 42, // 비앙카
    patch: PATCH,
    changes: [
      {
        target: "흡혈귀(P) - 피해량",
        changeType: "buff",
        description: ["체력이 높은 전열을 상대할 때의 압박 능력을 높였습니다."],
        valueSummary:
          "30/70/110(+스킬 증폭의 40%)(+대상 최대 체력의 5%) → 30/70/110(+스킬 증폭의 40%)(+대상 최대 체력의 8%)",
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
        description: ["낮아진 교전 내구도를 보완했습니다."],
        valueSummary: "30/60/90/120/150(+최대 체력의 12%) → 50/75/100/125/150(+최대 체력의 13%)",
      },
      {
        target: "신명나게 놀아보자!(R) - 최대 체력 증가",
        changeType: "buff",
        description: ["낮아진 교전 내구도를 보완했습니다."],
        valueSummary: "150/300/450 → 150/325/500",
      },
    ],
  },
  {
    characterCode: 73, // 샬럿
    patch: PATCH,
    changes: [
      {
        target: "치유의 빛(W) - 체력 회복량",
        changeType: "buff",
        description: ["감소한 아군 치유 능력을 일부 보완했습니다."],
        valueSummary: "30/50/70/90/110(+스킬 증폭의 15%) → 30/50/70/90/110(+스킬 증폭의 18%)",
      },
    ],
  },
  {
    characterCode: 13, // 쇼우
    patch: PATCH,
    changes: [
      {
        target: "창 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["상대적으로 낮은 창 쇼우의 교전 위력을 높였습니다."],
        valueSummary: "4.4% → 4.7%",
      },
    ],
  },
  {
    characterCode: 18, // 쇼이치
    patch: PATCH,
    changes: [
      {
        target: "부당거래(P) - 단검 투척 피해량",
        changeType: "buff",
        description: ["낮은 통계를 보완하기 위해 교전 능력을 높였습니다."],
        valueSummary: "50/80/110(+스킬 증폭의 30%) → 60/90/120(+스킬 증폭의 30%)",
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
        description: ["근접 교전에서의 과도한 피해량을 낮췄습니다."],
        valueSummary: "70/120/170(+스킬 증폭의 50%) → 50/100/150(+스킬 증폭의 50%)",
      },
      {
        target: "마음의 양식(P) - 주변 범위 피해량",
        changeType: "nerf",
        description: ["근접 교전에서의 과도한 피해량을 낮췄습니다."],
        valueSummary: "50/80/110(+스킬 증폭의 25%) → 40/70/100(+스킬 증폭의 25%)",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: PATCH,
    changes: [
      {
        target: "윌슨! 도와줘(Q) - 경로 피해량",
        changeType: "buff",
        description: ["윌슨을 정확히 조작했을 때의 교전 위력을 높였습니다."],
        valueSummary: "40/50/60/70/80(+스킬 증폭의 30%) → 40/50/60/70/80(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 52, // 아디나
    patch: PATCH,
    changes: [
      {
        target: "루미너리(Q) - 피해량",
        changeType: "buff",
        description: ["해 컨정션 의존도를 낮추기 위해 피해량 일부를 기본 스킬로 이전했습니다."],
        valueSummary: "60/85/110/135/160(+스킬 증폭의 60%) → 60/85/110/135/160(+스킬 증폭의 65%)",
      },
      {
        target: "루미너리(Q) - 해 컨정션 효과 피해량",
        changeType: "nerf",
        description: ["해 컨정션 적중 여부에 따른 피해량 편차를 줄였습니다."],
        valueSummary: "90/150/210/270(+스킬 증폭의 100%) → 90/150/210/270(+스킬 증폭의 90%)",
      },
      {
        target: "트라인 에스펙트(W) - 피해량",
        changeType: "buff",
        description: ["높은 적중 난이도에 비해 낮았던 위력을 높였습니다."],
        valueSummary: "70/90/110/130/150(+스킬 증폭의 60%) → 80/105/130/155/180(+스킬 증폭의 65%)",
      },
      {
        target: "트라인 에스펙트(W) - 달 컨정션 1회 당 피해량",
        changeType: "buff",
        description: ["높은 적중 난이도에 비해 낮았던 위력을 높였습니다."],
        valueSummary: "50/90/130/170(+스킬 증폭의 45%) → 50/100/150/200(+스킬 증폭의 50%)",
      },
      {
        target: "폴 디그니티(E) - 1타 피해량",
        changeType: "buff",
        description: ["기본 스킬의 교전 위력을 높였습니다."],
        valueSummary: "40/60/80/100/120(+스킬 증폭의 40%) → 40/60/80/100/120(+스킬 증폭의 45%)",
      },
    ],
  },
  {
    characterCode: 66, // 아르다
    patch: PATCH,
    changes: [
      {
        target: "님루드의 비석(E) - 피해량",
        changeType: "buff",
        description: [
          "낮아진 평균 피해량과 견제 능력을 보완했습니다. 님루드의 문(RE)에도 적용됩니다.",
        ],
        valueSummary: "80/110/140/170/200(+스킬 증폭의 55%) → 80/110/140/170/200(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 35, // 얀
    patch: PATCH,
    changes: [
      {
        target: "위빙(E) - 기본 공격 강화 피해량",
        changeType: "buff",
        description: ["체력이 높은 실험체를 상대할 때의 피해량을 높였습니다."],
        valueSummary:
          "20/30/40/50/60(+추가 공격력의 100%)(+스킬 증폭의 60%)(+적 최대 체력의 5%) → 20/30/40/50/60(+추가 공격력의 100%)(+스킬 증폭의 60%)(+적 최대 체력의 6%)",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: PATCH,
    changes: [
      {
        target: "겨울여왕의 영지(P) - 쿨다운",
        changeType: "nerf",
        description: ["얼음 지대의 과도한 생성 빈도를 낮췄습니다."],
        valueSummary: "6/4/2초 → 7/5/3초",
      },
      {
        target: "더블 악셀(W) - 피해량",
        changeType: "nerf",
        description: ["높아진 교전 위력을 일부 낮췄습니다."],
        valueSummary:
          "50/70/90/110/130(+스킬 증폭의 55%)(+추가 체력의 12%) → 50/70/90/110/130(+스킬 증폭의 55%)(+추가 체력의 10%)",
      },
    ],
  },
  {
    characterCode: 77, // 유민
    patch: PATCH,
    changes: [
      {
        target: "풍인(W) - 강화 피해량",
        changeType: "buff",
        description: ["낮은 활용도를 보완해 상황에 따른 선택 가치를 높였습니다."],
        valueSummary:
          "100/135/170/205/240(+스킬 증폭의 75%) → 100/135/170/205/240(+스킬 증폭의 85%)",
      },
    ],
  },
  {
    characterCode: 11, // 유키
    patch: PATCH,
    changes: [
      {
        target: "빗겨치고 일격(E) - 쿨다운",
        changeType: "nerf",
        description: ["늘어난 사거리와 함께 강해진 기동력을 낮췄습니다."],
        valueSummary: "15/14/13/12/11초 → 16/15/14/13/12초",
      },
    ],
  },
  {
    characterCode: 61, // 이렘
    patch: PATCH,
    changes: [
      {
        target: "고양이로 펑!(이렘 R) - 기본 공격 강화 피해량",
        changeType: "buff",
        description: ["인간 상태에서의 부족한 교전 능력을 보완했습니다."],
        valueSummary:
          "10/50/90/130(+스킬 증폭의 25/30/35/40%) → 10/50/90/130(+스킬 증폭의 30/35/40/45%)",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "nerf",
        description: ["교전에서의 뛰어난 생존력을 낮췄습니다."],
        valueSummary: "94 → 91",
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
        description: ["단검 재키의 지나치게 강한 화력을 낮췄습니다."],
        valueSummary: "2.1% → 1.3%",
      },
      {
        target: "단검 무기 숙련도 레벨 당 공격 속도",
        changeType: "nerf",
        description: ["단검 재키의 지나치게 강한 화력을 낮췄습니다."],
        valueSummary: "4.1% → 2.7%",
      },
      {
        target: "양손검 무기 숙련도 레벨 당 공격 속도",
        changeType: "buff",
        description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
        valueSummary: "3.6% → 4%",
      },
      {
        target: "도끼 무기 숙련도 레벨 당 공격 속도",
        changeType: "buff",
        description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
        valueSummary: "3% → 3.4%",
      },
      {
        target: "쌍검 무기 숙련도 레벨 당 공격 속도",
        changeType: "buff",
        description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
        valueSummary: "4% → 4.4%",
      },
      {
        target: "피의 축제(P) - 출혈 피해량",
        changeType: "nerf",
        description: ["전 무기군의 출혈 화력을 일부 낮췄습니다."],
        valueSummary: "10/20/30(+공격력의 25%) → 10/20/30(+공격력의 20%)",
      },
      {
        target: "전기톱 살인마(R) - 공격 속도 증가",
        changeType: "nerf",
        description: ["전 무기군의 궁극기 화력을 일부 낮췄습니다."],
        valueSummary: "20/30/40% → 20/25/30%",
      },
    ],
  },
  {
    characterCode: 39, // 카밀로
    patch: PATCH,
    changes: [
      {
        target: "브엘따(Q) - 피해량",
        changeType: "nerf",
        description: ["매우 높은 피해량 지표를 낮췄습니다."],
        valueSummary:
          "10/30/50/70/90(+공격력의 70%)*(기본 공격 증폭) → 10/30/50/70/90(+공격력의 65%)*(기본 공격 증폭)",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: PATCH,
    changes: [
      {
        target: "쌍검 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["쌍검 캐시의 높은 전반적인 성능을 낮췄습니다."],
        valueSummary: "4.8% → 4.6%",
      },
    ],
  },
  {
    characterCode: 71, // 케네스
    patch: PATCH,
    changes: [
      {
        target: "기본 공격력",
        changeType: "buff",
        description: ["상위 아이템을 갖추기 전의 초반 교전 성능을 보완했습니다."],
        valueSummary: "34 → 37",
      },
    ],
  },
  {
    characterCode: 89, // 크레이버
    patch: PATCH,
    changes: [
      {
        target: "더블 탭 / 포커스 샷(Q) - 포커스 샷 피해량",
        changeType: "nerf",
        description: ["마탄 Q의 뛰어난 견제 화력을 일부 낮췄습니다."],
        valueSummary: "80/120/160/200/240(+스킬 증폭의 85%) → 80/120/160/200/240(+스킬 증폭의 80%)",
      },
      {
        target: "스윕 킥 / 백플립(W) - 스윕 킥 피해량",
        changeType: "buff",
        description: ["쿨다운 하향을 보완하도록 피해량을 높였습니다."],
        valueSummary: "30/55/80/105/130(+스킬 증폭의 40%) → 40/65/90/115/140(+스킬 증폭의 40%)",
      },
      {
        target: "스윕 킥 / 백플립(W) - 적중 시 쿨다운 감소",
        changeType: "buff",
        description: ["스킬 적중 시의 보상을 높였습니다."],
        valueSummary: "15% → 20%",
      },
      {
        target: "스윕 킥 / 백플립(W) - 쿨다운",
        changeType: "nerf",
        description: ["과도한 기동력을 낮췄습니다."],
        valueSummary: "11/10.5/10/9.5/9초 → 12/11.5/11/10.5/10초",
      },
      {
        target: "컴뱃 롤 / 퀵 스텝(E) - 컴뱃 롤 피해량",
        changeType: "buff",
        description: ["기동력 하향 후 피해 능력이 지나치게 낮아지지 않도록 보완했습니다."],
        valueSummary: "50/80/110/140/170(+스킬 증폭의 55%) → 50/80/110/140/170(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 14, // 키아라
    patch: PATCH,
    changes: [
      {
        target: "부정의 손길(Q) - 피해량",
        changeType: "nerf",
        description: ["게임 후반부의 강력한 교전 위력을 낮췄습니다."],
        valueSummary: "60/90/120/150/180(+스킬 증폭의 65%) → 60/90/120/150/180(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 51, // 프리야
    patch: PATCH,
    changes: [
      {
        target: "대지의 메아리(R) - 받는 피해 감소",
        changeType: "buff",
        description: ["궁극기를 보다 안정적으로 활용할 수 있도록 이전 수준으로 복구했습니다."],
        valueSummary: "40% → 50%",
      },
    ],
  },
  {
    characterCode: 3, // 피오라
    patch: PATCH,
    changes: [
      {
        target: "뚜셰(P) - 체력 회복량",
        changeType: "buff",
        description: ["지속 교전에서의 유지력을 높였습니다."],
        valueSummary: "20/40/60(+스킬 증폭의 25%) → 20/50/80(+스킬 증폭의 25%)",
      },
    ],
  },
  {
    characterCode: 8, // 하트
    patch: PATCH,
    changes: [
      {
        target: "Flanger(E) - 피해량",
        changeType: "buff",
        description: ["공격적으로 사용했을 때의 위력을 높였습니다."],
        valueSummary: "70/90/110/130/150(+공격력의 60%) → 70/90/110/130/150(+공격력의 65%)",
      },
    ],
  },
  {
    characterCode: 83, // 헨리
    patch: PATCH,
    changes: [
      {
        target: "시계바늘(Q) - 분침(Q1) 피해량",
        changeType: "buff",
        description: ["상위 구간에서 부족한 스킬 증폭 효율과 견제 능력을 보완했습니다."],
        valueSummary: "40/65/90/115/140(+스킬 증폭의 60%) → 40/65/90/115/140(+스킬 증폭의 65%)",
      },
    ],
  },
  {
    characterCode: 12, // 혜진
    patch: PATCH,
    changes: [
      {
        target: "활 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["지속적으로 우수한 활 혜진의 성능을 소폭 낮췄습니다."],
        valueSummary: "4.8% → 4.7%",
      },
    ],
  },
  {
    characterCode: 78, // 히스이
    patch: PATCH,
    changes: [
      {
        target: "거합일섬(W) - 일도양단(W1) 보호막량",
        changeType: "buff",
        description: ["낮아진 지속 교전 능력을 일부 복구했습니다."],
        valueSummary: "10/15/20/25/30(+추가 공격력의 30%) → 10/15/20/25/30(+추가 공격력의 35%)",
      },
    ],
  },
];
