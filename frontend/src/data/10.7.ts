import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 가넷 (76)
  {
    characterCode: 76,
    patch: "10.7",
    changes: [
      {
        target: "억누른 고통(W) - 받는 피해 감소",
        changeType: "nerf",
        description: ["받는 피해 감소 효과를 일부 되돌려 내구도를 하향 조정합니다."],
        valueSummary: "55% → 50%",
      },
    ],
  },
  // 나딘 (6)
  {
    characterCode: 6,
    patch: "10.7",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력을 낮추어 화력을 소폭 하향 조정합니다."],
        valueSummary: "35 → 33",
      },
    ],
  },
  // 나타폰 (34)
  {
    characterCode: 34,
    patch: "10.7",
    changes: [
      {
        target: "카메라 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["무기 숙련도 효과를 상향하여 부족한 피해 능력을 보완합니다."],
        valueSummary: "4.3% → 4.4%",
      },
    ],
  },
  // 라우라 (47)
  {
    characterCode: 47,
    patch: "10.7",
    changes: [
      {
        target: "날카로운 꽃(Q) - 피해량",
        changeType: "nerf",
        description: ["스킬 증폭 계수를 이전 값으로 되돌려 지속 화력을 견제합니다."],
        valueSummary: "스킬 증폭의 60% → 55%",
      },
    ],
  },
  // 레니 (69)
  {
    characterCode: 69,
    patch: "10.7",
    changes: [
      {
        target: "스프링! 트랩(R) - 쿨다운",
        changeType: "nerf",
        description: ["후반부 쿨다운을 늘려 과도했던 사용 빈도를 조정합니다."],
        valueSummary: "20/16/12초 → 20/17/14초",
      },
    ],
  },
  // 리 다이린 (10)
  {
    characterCode: 10,
    patch: "10.7",
    changes: [
      {
        target: "글러브 무기 숙련도 - 레벨 당 기본 공격 증폭",
        changeType: "buff",
        description: ["무기 숙련도 효과를 강화하여 부족한 위력을 보완합니다."],
        valueSummary: "1.8% → 1.9%",
      },
    ],
  },
  // 마이 (45)
  {
    characterCode: 45,
    patch: "10.7",
    changes: [
      {
        target: "오뜨꾸뛰르(P) - 기본 공격 추가 피해량",
        changeType: "buff",
        description: ["추가 체력 계수를 상향하여 지속 교전 시 피해 능력을 보완합니다."],
        valueSummary: "추가 체력의 4/7/10% → 5/8/11%",
      },
    ],
  },
  // 마커스 (53)
  {
    characterCode: 53,
    patch: "10.7",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "nerf",
        description: ["레벨 당 체력을 낮추어 높은 내구도를 견제합니다."],
        valueSummary: "97 → 94",
      },
      {
        target: "파괴(W) - 쿨다운",
        changeType: "nerf",
        description: ["쿨다운을 늘려 과도했던 방해 효과의 빈도를 조정합니다."],
        valueSummary: "12/11/10/9/8초 → 13/12/11/10/9초",
      },
    ],
  },
  // 매그너스 (4)
  {
    characterCode: 4,
    patch: "10.7",
    changes: [
      {
        target: "17대 1(W) - 피해량",
        changeType: "nerf",
        description: ["추가 공격력 계수를 낮추어 매그너스의 화력을 견제합니다."],
        valueSummary: "추가 공격력의 50% → 45%",
      },
    ],
  },
  // 미르카 (85)
  {
    characterCode: 85,
    patch: "10.7",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력을 상향하여 전반적인 성능을 개선합니다."],
        valueSummary: "930 → 960",
      },
    ],
  },
  // 쇼우 (13)
  {
    characterCode: 13,
    patch: "10.7",
    changes: [
      {
        target: "식사 시간(W) - 방어력 증가 지속 시간",
        changeType: "buff",
        description: ["방어력 증가 지속 시간을 늘려 아군 지원 능력을 보강합니다."],
        valueSummary: "2초 → 2.5초",
      },
    ],
  },
  // 실비아 (16)
  {
    characterCode: 16,
    patch: "10.7",
    changes: [
      {
        target: "기동전(R) - 방어력 증가",
        changeType: "nerf",
        description: [
          "바이크 탑승 시 방어력 증가 수치를 낮추어 근접 교전 내구도를 하향 조정합니다.",
        ],
        valueSummary: "15/20/25 → 14/18/22",
      },
    ],
  },
  // 아비게일 (67)
  {
    characterCode: 67,
    patch: "10.7",
    changes: [
      {
        target: "티어링 블레이드(P) - 방어력 감소",
        changeType: "nerf",
        description: ["방어력 감소 효과를 낮추어 후반부 순간 피해 능력을 견제합니다."],
        valueSummary: "4/8/12 → 4/7/10",
      },
      {
        target: "워프 슬래시(E) - 피해량",
        changeType: "nerf",
        description: ["기본 피해량을 하향하여 폭발적인 피해 능력을 견제합니다."],
        valueSummary: "80/100/120/140/160(+스킬 증폭의 40%) → 70/85/100/115/130(+스킬 증폭의 40%)",
      },
    ],
  },
  // 아야 (2)
  {
    characterCode: 2,
    patch: "10.7",
    changes: [
      {
        target: "2연발(Q) - 피해량",
        changeType: "nerf",
        description: ["스킬 증폭 계수를 하향 조정하여 아야의 위력을 견제합니다."],
        valueSummary: "스킬 증폭의 70% → 65%",
      },
    ],
  },
  // 알론소 (68)
  {
    characterCode: 68,
    patch: "10.7",
    changes: [
      {
        target: "마그네틱 펀치(Q) - 기절 지속 시간",
        changeType: "buff",
        description: ["기절 지속 시간을 상향하여 적의 움직임을 저지하는 역할을 강화합니다."],
        valueSummary: "0.85초 → 0.9초",
      },
    ],
  },
  // 에이든 (46)
  {
    characterCode: 46,
    patch: "10.7",
    changes: [
      {
        target: "뇌격(Q) - 피해량",
        changeType: "buff",
        description: ["기본 피해량을 상향하여 평균 점수 획득 지표를 개선합니다."],
        valueSummary: "60/90/120/150/180(+공격력의 75%) → 70/100/130/160/190(+공격력의 75%)",
      },
      {
        target: "전자포(과전하 Q) - 피해량",
        changeType: "buff",
        description: ["과전하 Q 피해량을 함께 상향하여 화력을 보강합니다."],
        valueSummary: "60/90/120/150/180(+공격력의 75%) → 70/100/130/160/190(+공격력의 75%)",
      },
    ],
  },
  // 일레븐 (30)
  {
    characterCode: 30,
    patch: "10.7",
    changes: [
      {
        target: "힘내자고!(P) - 일레븐 버거 체력 회복량",
        changeType: "nerf",
        description: ["체력 회복량을 낮추어 지속 교전 시의 유지력을 견제합니다."],
        valueSummary: "최대 체력의 3/5/7% → 2/4/6%",
      },
    ],
  },
  // 칼라 (54)
  {
    characterCode: 54,
    patch: "10.7",
    changes: [
      {
        target: "작살 장전(P) - 완전 충전 시 피해량",
        changeType: "buff",
        description: [
          "대상 최대 체력 비례 피해량을 상향하여 내구도 높은 적 상대 위력을 보완합니다.",
        ],
        valueSummary: "대상 최대 체력의 4/7/10% → 4/8/12%",
      },
    ],
  },
  // 케네스 (71)
  {
    characterCode: 71,
    patch: "10.7",
    changes: [
      {
        target: "분노의 일격(Q) - 피해량",
        changeType: "buff",
        description: ["공격력 계수를 상향하여 공격력 아이템 효율과 성장 위력을 강화합니다."],
        valueSummary: "공격력의 150/155/160/165/170% → 165/170/175/180/185%",
      },
    ],
  },
  // 코렐라인 (87)
  {
    characterCode: 87,
    patch: "10.7",
    changes: [
      {
        target: "진실의 거울/거짓의 거울(W) - 스킬 증폭 증가",
        changeType: "nerf",
        description: ["스킬 증폭 증가량을 낮추어 거울 상호작용의 위력을 견제합니다."],
        valueSummary: "4/6/8% → 3/5/7%",
      },
      {
        target: "죄의 굴레(E) - 거울 강화 시 투사체 속도",
        changeType: "nerf",
        description: [
          "투사체 속도를 낮추어 스킬 적중 난이도를 높이고 상대 입장에서 대응할 여지를 마련합니다.",
        ],
        valueSummary: "15m/s → 13m/s",
      },
    ],
  },
  // 클로에 (40)
  {
    characterCode: 40,
    patch: "10.7",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력을 낮추어 위력을 하향 조정합니다."],
        valueSummary: "35 → 32",
      },
    ],
  },
  // 키아라 (14)
  {
    characterCode: 14,
    patch: "10.7",
    changes: [
      {
        target: "부정의 손길(Q) - 체력 회복량",
        changeType: "buff",
        description: ["적중 시 체력 회복량을 높여 부족한 지속 교전 능력을 보완합니다."],
        valueSummary: "10/13/16/19/22(+스킬 증폭의 3%) → 13/16/19/22/25(+스킬 증폭의 4%)",
      },
    ],
  },
  // 타지아 (60)
  {
    characterCode: 60,
    patch: "10.7",
    changes: [
      {
        target: "스틸레토(Q) - 피해량",
        changeType: "buff",
        description: ["기본 피해량을 상향하여 타지아의 교전 영향력을 보강합니다."],
        valueSummary: "30/55/80/105/130 → 30/60/90/120/150",
      },
      {
        target: "스파다(강화 Q) - 피해량",
        changeType: "buff",
        description: ["강화 Q 피해량을 함께 상향하여 주력 기술 위력을 강화합니다."],
        valueSummary: "30/55/80/105/130 → 30/60/90/120/150",
      },
    ],
  },
  // 테오도르 (62)
  {
    characterCode: 62,
    patch: "10.7",
    changes: [
      {
        target: "에너지 필드(R) - 이동 속도 증가",
        changeType: "nerf",
        description: ["이동 속도 증가량을 낮추어 궁극기 기반 교전 개시 능력을 견제합니다."],
        valueSummary: "60/80/100% → 50/70/90%",
      },
    ],
  },
  // 펜리르 (86)
  {
    characterCode: 86,
    patch: "10.7",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: ["레벨 당 공격력을 상향하여 후반부 위력을 보완합니다."],
        valueSummary: "4.6 → 4.8",
      },
    ],
  },
  // 프리야 (51)
  {
    characterCode: 51,
    patch: "10.7",
    changes: [
      {
        target: "개화의 선율(Q) - 만개 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수를 상향하여 공격적 사용 시 위력을 강화합니다."],
        valueSummary: "스킬 증폭의 55% → 60%",
      },
      {
        target: "포르타멘토(W) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수를 상향하여 자체 피해 능력을 보강합니다."],
        valueSummary: "스킬 증폭의 60% → 65%",
      },
    ],
  },
  // 하트 (8)
  {
    characterCode: 8,
    patch: "10.7",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력을 높여 부족한 내구도를 보완합니다."],
        valueSummary: "49 → 51",
      },
    ],
  },
  // 헤이즈 (58)
  {
    characterCode: 58,
    patch: "10.7",
    changes: [
      {
        target: "산탄 포화(W) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수를 상향하여 근접 교전 위력을 보완합니다."],
        valueSummary: "스킬 증폭의 70% → 75%",
      },
    ],
  },
  // 헨리 (83)
  {
    characterCode: 83,
    patch: "10.7",
    changes: [
      {
        target: "시간 제어 장치(W) - 피해량",
        changeType: "buff",
        description: ["스킬 증폭 계수를 상향하여 낮았던 스킬 증폭 효율을 개선합니다."],
        valueSummary: "스킬 증폭의 20% → 22%",
      },
    ],
  },
  // 현우 (7)
  {
    characterCode: 7,
    patch: "10.7",
    changes: [
      {
        target: "핵펀치(R) - 방어력 감소",
        changeType: "nerf",
        description: ["방어력 감소 효과를 낮추어 교전 영향력을 억제합니다."],
        valueSummary: "15/20/25% → 10/15/20%",
      },
    ],
  },
  // 혜진 (12)
  {
    characterCode: 12,
    patch: "10.7",
    changes: [
      {
        target: "오대존명왕진(R) - 부적 피해량",
        changeType: "nerf",
        description: ["높은 레벨 구간 피해량을 낮추어 후반부 화력을 하향 조정합니다."],
        valueSummary: "80/115/150(+스킬 증폭의 50%) → 80/105/130(+스킬 증폭의 50%)",
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
