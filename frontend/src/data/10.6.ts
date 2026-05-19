import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 가넷 (76)
  {
    characterCode: 76,
    patch: "10.6",
    changes: [
      {
        target: "짓뭉개기&꿰뚫기(Q) - 이동 속도 감소",
        changeType: "buff",
        description: ["이동 속도 감소 수치를 상향하여 저지력을 강화합니다."],
        valueSummary: "35% → 40%",
      },
      {
        target: "억누른 고통(W) - 쿨다운",
        changeType: "buff",
        description: ["재사용 대기 시간을 줄여 스킬 순환과 안정성을 개선합니다."],
        valueSummary: "15/14/13/12/11초 → 14/13/12/11/10초",
      },
    ],
  },
  // 라우라 (47)
  {
    characterCode: 47,
    patch: "10.6",
    changes: [
      {
        target: "채찍 무기 숙련도 - 공격 속도",
        changeType: "buff",
        description: ["채찍 무기 숙련도의 공격 속도 효과를 상향하여 플레이 감각을 개선합니다."],
        valueSummary: "레벨 당 2.8% → 3.3%",
      },
      {
        target: "황혼의 도둑(R) - 폭발 피해량",
        changeType: "buff",
        description: ["폭발 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "스킬 증폭의 85% → 90%",
      },
      {
        target: "황혼의 도둑(R) - 보호막량",
        changeType: "buff",
        description: ["보호막량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "스킬 증폭의 15% → 20%",
      },
    ],
  },
  // 레니 (69)
  {
    characterCode: 69,
    patch: "10.6",
    changes: [
      {
        target: "당근! 바주카(Q) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수를 상향하여 낮은 스킬 증폭 효율을 개선합니다."],
        valueSummary: "스킬 증폭의 30% → 35%",
      },
      {
        target: "당근! 바주카(Q) - 회복량",
        changeType: "buff",
        description: ["회복량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "스킬 증폭의 18% → 20%",
      },
    ],
  },
  // 레온 (29)
  {
    characterCode: 29,
    patch: "10.6",
    changes: [
      {
        target: "물보라(W) - 보호막 흡수량",
        changeType: "buff",
        description: ["보호막 계수를 상향하여 생존력을 보충합니다."],
        valueSummary: "스킬 증폭의 35% → 40%",
      },
    ],
  },
  // 르노어 (75)
  {
    characterCode: 75,
    patch: "10.6",
    changes: [
      {
        target: "고통의 선율(P) - 아첼레란도 쿨다운 감소",
        changeType: "buff",
        description: ["아첼레란도 중첩 당 쿨다운 감소 효과를 상향하여 성능의 저점을 보완합니다."],
        valueSummary: "중첩 당 쿨다운 감소 2 → 3",
      },
      {
        target: "고통의 선율(P) - 궁극기 쿨다운 감소",
        changeType: "nerf",
        description: ["쿨다운 감소 40 이후 궁극기 쿨다운 감소 효율을 하향 조정합니다."],
        valueSummary: "중첩 당 궁극기 쿨다운 감소 3 → 2",
      },
    ],
  },
  // 리 다이린 (10)
  {
    characterCode: 10,
    patch: "10.6",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["레벨 당 공격력을 상향하여 교전 결정력을 강화합니다."],
        valueSummary: "4.8 → 5",
      },
    ],
  },
  // 마르티나 (57)
  {
    characterCode: 57,
    patch: "10.6",
    changes: [
      {
        target: "일시정지 - 방송 중(W) - 속박 지속 시간",
        changeType: "buff",
        description: ["속박 지속 시간을 상향하여 스킬 연계가 안정적으로 이어지도록 지원합니다."],
        valueSummary: "1초 → 1.2초",
      },
    ],
  },
  // 마이 (45)
  {
    characterCode: 45,
    patch: "10.6",
    changes: [
      {
        target: "숄 장막(W) - 이동 속도 증가",
        changeType: "buff",
        description: ["이동 속도 증가 효과를 상향하여 기동력을 보강합니다."],
        valueSummary: "8/11/14/17/20% → 10/14/18/22/26%",
      },
    ],
  },
  // 바바라 (26)
  {
    characterCode: 26,
    patch: "10.6",
    changes: [
      {
        target: "BT-Mk2 센트리건(Q) - 기본 공격 피해량",
        changeType: "nerf",
        description: ["센트리건의 지속 화력을 견제하기 위해 기본 공격 피해량을 하향합니다."],
        valueSummary: "스킬 증폭의 20% → 18%",
      },
    ],
  },
  // 버니스 (25)
  {
    characterCode: 25,
    patch: "10.6",
    changes: [
      {
        target: "기본 공격력",
        changeType: "buff",
        description: ["기본 공격력을 높여 부족한 위력을 보완합니다."],
        valueSummary: "35 → 37",
      },
    ],
  },
  // 셀린 (43)
  {
    characterCode: 43,
    patch: "10.6",
    changes: [
      {
        target: "자력 융합(R) - 피해량",
        changeType: "buff",
        description: ["피해량을 높여 피해 능력을 강화합니다."],
        valueSummary: "스킬 증폭의 36% → 37%",
      },
    ],
  },
  // 쇼이치 (18)
  {
    characterCode: 18,
    patch: "10.6",
    changes: [
      {
        target: "비약(W) - 피해량",
        changeType: "nerf",
        description: ["기본 피해량을 낮추어 피해 능력을 견제합니다."],
        valueSummary: "40/60/80/100/120 → 30/50/70/90/110",
      },
    ],
  },
  // 수아 (28)
  {
    characterCode: 28,
    patch: "10.6",
    changes: [
      {
        target: "기억력(R) - 쿨다운",
        changeType: "buff",
        description: ["낮은 레벨 구간 쿨다운을 단축하여 초반 교전 능력을 보완합니다."],
        valueSummary: "30/24/18초 → 26/22/18초",
      },
    ],
  },
  // 슈린 (82)
  {
    characterCode: 82,
    patch: "10.6",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["레벨 당 공격력을 상향하여 후반부 부족한 화력을 보완합니다."],
        valueSummary: "4.3 → 4.6",
      },
    ],
  },
  // 시셀라 (15)
  {
    characterCode: 15,
    patch: "10.6",
    changes: [
      {
        target: "삶은 고통이에요.(P) - 피해량",
        changeType: "buff",
        description: ["패시브 피해량의 스킬 증폭 계수를 높여 누적 피해를 강화합니다."],
        valueSummary: "스킬 증폭의 40% → 45%",
      },
    ],
  },
  // 아디나 (52)
  {
    characterCode: 52,
    patch: "10.6",
    changes: [
      {
        target: "폴 디그니티(E) - 별 컨정션 체력 회복량",
        changeType: "buff",
        description: ["별 컨정션 체력 회복량을 상향하여 지원 능력을 강화합니다."],
        valueSummary: "스킬 증폭의 4% → 6%",
      },
    ],
  },
  // 아이솔 (9)
  {
    characterCode: 9,
    patch: "10.6",
    changes: [
      {
        target: "권총 무기 숙련도 - 스킬 증폭",
        changeType: "buff",
        description: ["권총 무기 숙련도 효과를 강화합니다."],
        valueSummary: "레벨 당 4.4% → 4.5%",
      },
    ],
  },
  // 아이작 (59)
  {
    characterCode: 59,
    patch: "10.6",
    changes: [
      {
        target: "현장 급습(Q) - 피해량",
        changeType: "nerf",
        description: ["피해량을 소폭 하향하여 교전 위력을 견제합니다."],
        valueSummary: "30/70/110/150/190 → 20/60/100/140/180",
      },
    ],
  },
  // 알렉스 (27)
  {
    characterCode: 27,
    patch: "10.6",
    changes: [
      {
        target: "플라즈마 마인(W) - 피해량",
        changeType: "nerf",
        description: ["피해량을 낮춰 스킬 연계 위력을 하향합니다."],
        valueSummary: "40/80/120/160/200 → 40/75/110/145/180",
      },
    ],
  },
  // 알론소 (68)
  {
    characterCode: 68,
    patch: "10.6",
    changes: [
      {
        target: "게더링 필드(R) - 최소 마무리 피해량",
        changeType: "buff",
        description: ["마무리 피해량의 추가 체력 계수를 높여 영향력을 강화합니다."],
        valueSummary: "추가 체력의 8% → 12%",
      },
      {
        target: "게더링 필드(R) - 최대 마무리 피해량",
        changeType: "buff",
        description: ["최대 마무리 피해량의 추가 체력 계수를 높여 영향력을 강화합니다."],
        valueSummary: "추가 체력의 16% → 24%",
      },
    ],
  },
  // 에스텔 (55)
  {
    characterCode: 55,
    patch: "10.6",
    changes: [
      {
        target: "헬기호출(R) - 보호막 흡수량",
        changeType: "buff",
        description: ["보호막 흡수량 계수를 높여 생존력을 보장합니다."],
        valueSummary: "스킬 증폭의 50% → 55%",
      },
      {
        target: "헬기호출(R) - 아군 보호막 흡수량",
        changeType: "buff",
        description: ["아군 보호막 흡수량 계수를 높여 지원 능력을 강화합니다."],
        valueSummary: "스킬 증폭의 50% → 55%",
      },
    ],
  },
  // 에키온 (44)
  {
    characterCode: 44,
    patch: "10.6",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["전반적인 위력을 억제하기 위해 기본 공격력을 하향합니다."],
        valueSummary: "39 → 35",
      },
      {
        target: "VF 폭주(R) - 독사의 진노[블랙맘바] 피해량",
        changeType: "buff",
        description: ["블랙맘바의 추가 체력 계수를 높여 성능을 보완합니다."],
        valueSummary: "추가 체력의 10% → 12%",
      },
    ],
  },
  // 엠마 (19)
  {
    characterCode: 19,
    patch: "10.6",
    changes: [
      {
        target: "마술 토끼(E) - 피해량",
        changeType: "buff",
        description: ["피해량을 상향하여 견제력을 강화합니다."],
        valueSummary: "20/40/60/80/100 → 30/55/80/105/130",
      },
      {
        target: "마술 토끼(E) - 변이 지속 시간",
        changeType: "buff",
        description: ["저레벨 구간의 변이 지속 시간을 늘려 스킬 연계를 돕습니다."],
        valueSummary: "0.6/0.7/0.8/0.9/1초 → 0.8/0.85/0.9/0.95/1초",
      },
    ],
  },
  // 유키 (11)
  {
    characterCode: 11,
    patch: "10.6",
    changes: [
      {
        target: "머리치기!(Q) - 쿨다운",
        changeType: "buff",
        description: ["쿨다운을 단축해 지속적인 위협과 압박을 강화합니다."],
        valueSummary: "6초 → 5초",
      },
    ],
  },
  // 이렘 (61)
  {
    characterCode: 61,
    patch: "10.6",
    changes: [
      {
        target: "투척 무기 숙련도 - 공격 속도",
        changeType: "buff",
        description: ["무기 숙련도의 공격 속도 효과를 강화합니다."],
        valueSummary: "레벨 당 1.6% → 2.2%",
      },
    ],
  },
  // 이슈트반 (80)
  {
    characterCode: 80,
    patch: "10.6",
    changes: [
      {
        target: "관측(Q) - 피해량",
        changeType: "nerf",
        description: ["공격력 계수를 낮춰 위력을 하향합니다."],
        valueSummary: "공격력의 110% → 100%",
      },
    ],
  },
  // 츠바메 (70)
  {
    characterCode: 70,
    patch: "10.6",
    changes: [
      {
        target: "오의 - 생사 각인(P) - 피해량",
        changeType: "nerf",
        description: ["주력 피해 스킬의 추가 공격력 계수를 낮춰 과도한 위력을 억제합니다."],
        valueSummary: "추가 공격력의 45% → 25%",
      },
    ],
  },
  // 카밀로 (39)
  {
    characterCode: 39,
    patch: "10.6",
    changes: [
      {
        target: "레이피어 무기 숙련도 - 기본 공격 증폭",
        changeType: "nerf",
        description: ["무기 숙련도 효과를 낮춰 전반적인 피해량을 하향합니다."],
        valueSummary: "레벨 당 1.5% → 1.4%",
      },
    ],
  },
  // 캐시 (23)
  {
    characterCode: 23,
    patch: "10.6",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력을 상향해 교전 중 생존력을 보완합니다."],
        valueSummary: "940 → 970",
      },
    ],
  },
  // 코렐라인 (87)
  {
    characterCode: 87,
    patch: "10.6",
    changes: [
      {
        target: "단죄의 섬광(Q) - 피해량",
        changeType: "buff",
        description: ["거울 연계 없는 Q 피해량을 높여 안정적인 피해 능력을 보완합니다."],
        valueSummary: "스킬 증폭의 75% → 80%",
      },
      {
        target: "죄의 굴레(E) - 백경/흑경 피해량",
        changeType: "nerf",
        description: ["거울 연계 시 피해량을 낮추어 과도한 위력을 하향합니다."],
        valueSummary: "스킬 증폭의 70% → 65%",
      },
      {
        target: "죄의 굴레(E) - 흑경 방어력 감소량",
        changeType: "nerf",
        description: ["흑경 방어력 감소 효과를 하향합니다."],
        valueSummary: "12/13/14/15/16% → 10/11/12/13/14%",
      },
    ],
  },
  // 클로에 (40)
  {
    characterCode: 40,
    patch: "10.6",
    changes: [
      {
        target: "살아 있는 마리오네트(P) - 체력 소모량",
        changeType: "buff",
        description: [
          "니나 부활 시 체력 소모량을 완화하여 안정적으로 전투에 합류할 수 있도록 돕습니다.",
        ],
        valueSummary: "현재 체력의 30% → 20%",
      },
    ],
  },
  // 키아라 (14)
  {
    characterCode: 14,
    patch: "10.6",
    changes: [
      {
        target: "뒤틀린 기도(W) - 최소 보호막량",
        changeType: "buff",
        description: ["보호막 흡수량을 상향하여 안정적인 플레이를 보완합니다."],
        valueSummary: "90/110/130/150/170 → 110/130/150/170/190",
      },
      {
        target: "뒤틀린 기도(W) - 최대 보호막량",
        changeType: "buff",
        description: ["최대 보호막량을 상향합니다."],
        valueSummary: "135/165/195/225/255 → 165/195/225/255/285",
      },
    ],
  },
  // 펜리르 (86)
  {
    characterCode: 86,
    patch: "10.6",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["레벨 당 체력을 상향하여 후반 내구도를 보충합니다."],
        valueSummary: "92 → 94",
      },
      {
        target: "본능적 후퇴(W2) - 피해량",
        changeType: "buff",
        description: ["피해량을 늘려 교전에서의 위력을 보강합니다."],
        valueSummary: "20/40/60/80/100 → 30/55/80/105/130",
      },
    ],
  },
  // 프리야 (51)
  {
    characterCode: 51,
    patch: "10.6",
    changes: [
      {
        target: "포르타멘토(W) - 아군 이동 속도 증가",
        changeType: "nerf",
        description: ["아군 이동 속도 증가량을 낮추어 지원 능력을 견제합니다."],
        valueSummary: "10/11/12/13/14% → 8/9/10/11/12%",
      },
      {
        target: "대지의 메아리(R) - 받는 피해 감소",
        changeType: "nerf",
        description: ["받는 피해 감소 효과를 하향하여 적절한 리스크를 부여합니다."],
        valueSummary: "50% → 40%",
      },
    ],
  },
  // 피오라 (3)
  {
    characterCode: 3,
    patch: "10.6",
    changes: [
      {
        target: "레이피어 무기 숙련도 - 스킬 증폭",
        changeType: "nerf",
        description: ["레이피어 무기 숙련도 효과를 하향합니다."],
        valueSummary: "레벨 당 4.3% → 4.2%",
      },
    ],
  },
  // 현우 (7)
  {
    characterCode: 7,
    patch: "10.6",
    changes: [
      {
        target: "톤파 무기 숙련도 - 스킬 증폭",
        changeType: "buff",
        description: ["톤파 무기 숙련도 효과를 강화하여 성능을 보완합니다."],
        valueSummary: "레벨 당 4.3% → 4.5%",
      },
      {
        target: "허세(W) - 방어력 증가",
        changeType: "nerf",
        description: ["방어력 수치를 하향하여 생존 능력을 견제합니다."],
        valueSummary: "14/23/32/41/50 → 14/21/28/35/42",
      },
    ],
  },
];
