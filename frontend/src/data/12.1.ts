import type { CharacterPatchNote } from "./10.1";

const PATCH = "12.1";

// 출처: https://playeternalreturn.com/posts/news/3769?hl=ko-KR
// 개별 실험체 변경 사항만 기록합니다.
export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 34, // 나타폰
    patch: PATCH,
    changes: [
      {
        target: "스냅샷(Q) - 피해량",
        changeType: "buff",
        description: ["평균 피해량 지표를 보완하기 위해 기본 피해량을 높였습니다."],
        valueSummary: "50/90/130/170/210(+스킬 증폭의 80%) → 60/100/140/180/220(+스킬 증폭의 80%)",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: PATCH,
    changes: [
      {
        target: "날카로운 꽃(Q) - 피해량",
        changeType: "nerf",
        description: ["채찍 무기 스킬 변경 이후 증가한 화력을 일부 낮췄습니다."],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 55%) → 50/75/100/125/150(+스킬 증폭의 50%)",
      },
    ],
  },
  {
    characterCode: 29, // 레온
    patch: PATCH,
    changes: [
      {
        target: "글러브 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["글러브 레온의 높은 통계를 견제하기 위해 숙련도 효과를 낮췄습니다."],
        valueSummary: "4.3% → 4.2%",
      },
    ],
  },
  {
    characterCode: 22, // 루크
    patch: PATCH,
    changes: [
      {
        target: "강박증(W) - 피해량",
        changeType: "buff",
        description: ["지속적으로 낮은 지표를 보완하기 위해 공격력 계수를 높였습니다."],
        valueSummary: "50/80/110/140/170(+공격력의 85%) → 50/80/110/140/170(+공격력의 90%)",
      },
    ],
  },
  {
    characterCode: 10, // 리 다이린
    patch: PATCH,
    changes: [
      {
        target: "취기(P) - 맹호청권 2타 피해량",
        changeType: "buff",
        description: ["공격적인 아이템 세팅의 효율을 높이기 위해 공격력 계수를 상향했습니다."],
        valueSummary:
          "(공격력의 30/40/50%) * (기본 공격 증폭) → (공격력의 35/45/55%) * (기본 공격 증폭)",
      },
    ],
  },
  {
    characterCode: 31, // 리오
    patch: PATCH,
    changes: [
      {
        target: "비상(E) - 쿨다운",
        changeType: "nerf",
        description: ["뛰어난 생존력을 낮추기 위해 재사용 대기시간을 늘렸습니다."],
        valueSummary: "15/14/13/12/11초 → 16/15/14/13/12초",
      },
      {
        target: "연사 / 정사필중(R) - 단궁 벽 충돌 시 기절 지속 시간",
        changeType: "nerf",
        description: ["단궁 궁극기의 벽 충돌 고점을 일부 낮췄습니다."],
        valueSummary: "1.5초 → 1.2초",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: PATCH,
    changes: [
      {
        target: "오뜨꾸뛰르(P) - 피해량",
        changeType: "buff",
        description: ["교전 기여도를 보완하기 위해 추가 체력 계수를 높였습니다."],
        valueSummary: "30(+추가 체력의 5/8/11%) → 30(+추가 체력의 6/9/12%)",
      },
    ],
  },
  {
    characterCode: 85, // 미르카
    patch: PATCH,
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["전반적인 내구력을 보완했습니다."],
        valueSummary: "2.9 → 3.1",
      },
    ],
  },
  {
    characterCode: 18, // 쇼이치
    patch: PATCH,
    changes: [
      {
        target: "부당 거래(P) - 기본 공격 추가 피해량",
        changeType: "nerf",
        description: ["단검 무기 스킬로 중첩을 얻는 변경 이후 높아진 위력을 견제했습니다."],
        valueSummary:
          "10/20/30(+스킬 증폭의 45%)(+대상 최대 체력의 2/3/4%) → 10/20/30(+스킬 증폭의 35%)(+대상 최대 체력의 2/3/4%)",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: PATCH,
    changes: [
      {
        target: "암기 무기 숙련도 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["암기 시셀라의 낮은 자체 피해량을 보완했습니다."],
        valueSummary: "3.9% → 4%",
      },
    ],
  },
  {
    characterCode: 59, // 아이작
    patch: PATCH,
    changes: [
      {
        target: "착취(P) - 체력 회복량",
        changeType: "buff",
        description: ["지속 교전 능력을 강화하기 위해 후반 회복량을 높였습니다."],
        valueSummary: "120/140/160% → 120/145/170%",
      },
    ],
  },
  {
    characterCode: 68, // 알론소
    patch: PATCH,
    changes: [
      {
        target: "플라즈마 베리어(P) - 체력 회복량",
        changeType: "buff",
        description: ["교전 중 내구도를 보완하기 위해 최대 체력 계수를 높였습니다."],
        valueSummary: "20/35/50(+최대 체력의 2/3/4%) → 20/35/50(+최대 체력의 3/4/5%)",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: PATCH,
    changes: [
      {
        target: "겨울 여왕의 영지(P) - 쿨다운",
        changeType: "buff",
        description: ["무기 스킬 없이 빙결시키는 데 걸리는 시간을 보완했습니다."],
        valueSummary: "8/6/4초 → 6/4/2초",
      },
      {
        target: "크리스탈 엘레강스(Q) - 2타 적중 시 영지 쿨다운 감소",
        changeType: "nerf",
        description: ["얼음 지대가 과도하게 생성될 가능성을 일부 낮췄습니다."],
        valueSummary: "60% → 50%",
      },
    ],
  },
  {
    characterCode: 79, // 유스티나
    patch: PATCH,
    changes: [
      {
        target: "연속 포격&섬멸 포격(Q) - 연속 포격(Q1) 피해량",
        changeType: "nerf",
        description: ["석궁 무기 스킬 변경 이후 과도해진 피해 능력을 낮췄습니다."],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 45%) → 50/75/100/125/150(+스킬 증폭의 40%)",
      },
    ],
  },
  {
    characterCode: 61, // 이렘
    patch: PATCH,
    changes: [
      {
        target: "이렘으로 짠~(고양이 R) - 보호막량",
        changeType: "buff",
        description: ["낮은 통계를 보완하기 위해 교전 중 보호막량을 높였습니다."],
        valueSummary: "20/45/70/95(+스킬 증폭의 30%) → 20/45/70/95(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: PATCH,
    changes: [
      {
        target: "사신의 눈(P) - 지속 피해 스킬 판정",
        changeType: "nerf",
        description: ["지속 피해로 표식을 지나치게 자주 얻지 않도록 판정 간격을 적용했습니다."],
        valueSummary: "지속 피해 개별 스킬은 3초마다 판정",
      },
      {
        target: "간디바(W) - 피해량",
        changeType: "nerf",
        description: ["특정 상황에서 과도하게 높아진 피해량을 낮췄습니다."],
        valueSummary: "70/95/120/145/170(+스킬 증폭의 50%) → 60/85/110/135/160(+스킬 증폭의 50%)",
      },
      {
        target: "간디바(W) - 지속 피해 스킬 판정",
        changeType: "nerf",
        description: ["마름쇠 투척 등 지속 피해로 중첩을 지나치게 자주 얻지 않도록 조정했습니다."],
        valueSummary: "0.4초 → 3초",
      },
      {
        target: "바르가바스트라(R) - 스킬 판정",
        changeType: "rework",
        description: ["궁극기의 각 피해에는 각각 개별 스킬 판정이 적용됩니다."],
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: PATCH,
    changes: [
      {
        target: "엠퓨테이션(W) - 바깥 범위 피해량",
        changeType: "nerf",
        description: ["무기 스킬 변경 이후 높아진 교전 위력을 일부 낮췄습니다."],
        valueSummary: "50/100/150/200/250(+스킬 증폭의 95%) → 50/100/150/200/250(+스킬 증폭의 90%)",
      },
    ],
  },
  {
    characterCode: 87, // 코렐라인
    patch: PATCH,
    changes: [
      {
        target: "인과의 이면(P) - 피해량",
        changeType: "nerf",
        description: ["아르카나 무기 스킬 이후 강해진 포킹 능력을 낮췄습니다."],
        valueSummary: "20/40/60/80/100(+스킬 증폭의 12%) → 20/40/60/80/100(+스킬 증폭의 10%)",
      },
      {
        target: "죄의 굴레(E) - 피해량",
        changeType: "buff",
        description: ["교전 성능을 일정 수준 유지하도록 피해량을 높였습니다."],
        valueSummary: "60/90/120/150/180(+스킬 증폭의 65%) → 60/90/120/150/180(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 62, // 테오도르
    patch: PATCH,
    changes: [
      {
        target: "에너지 프로토콜(P) - 이동 속도 증가",
        changeType: "buff",
        description: ["생존 능력과 변수 창출 능력을 강화했습니다."],
        valueSummary: "5/10/15% → 10/15/20%",
      },
    ],
  },
  {
    characterCode: 12, // 혜진
    patch: PATCH,
    changes: [
      {
        target: "오대존명왕진(R) - 부적 피해량",
        changeType: "nerf",
        description: ["무기 스킬 판정 적용 이후 높아진 스킬 활용도를 견제했습니다."],
        valueSummary: "80/105/130(+스킬 증폭의 50%) → 80/100/120(+스킬 증폭의 50%)",
      },
    ],
  },
];
