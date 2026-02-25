export type ChangeType = "buff" | "nerf" | "rework"

export interface PatchChange {
  target: string          // 예: "Q - 전격 연속공격", "기본 체력"
  changeType: ChangeType
  description: string[]   // 변경 설명 (여러 줄 지원)
  valueSummary?: string   // 예: "850 → 920" (선택)
}

export interface CharacterPatchNote {
  characterCode: number   // getCharacterName(code)와 동일한 코드 체계
  patch: string           // 패치 버전 문자열 (DB의 patchVersion과 동일)
  changes: PatchChange[]
}

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: "10.3",
    changes: [
      {
        target: "짓뭉개기&꿰뚫기(Q) - 짓뭉개기 피해량",
        changeType: "buff",
        description: ["짓뭉개기 피해량이 증가했습니다."],
        valueSummary: "40/60/80/100/120(+스킬 증폭의 50%)(+최대 체력의 5%) → 40/65/90/115/140(+스킬 증폭의 50%)(+최대 체력의 5%)",
      },
      {
        target: "억누른 고통(W)",
        changeType: "buff",
        description: ["받는 피해 감소량이 증가했습니다."],
        valueSummary: "50% → 55%",
      },
      {
        target: "그릇된 집착(E)",
        changeType: "buff",
        description: ["돌진 충돌 범위 폭이 증가했습니다."],
        valueSummary: "1m → 1.2m",
      },
    ],
  },
  {
    characterCode: 33, // 니키
    patch: "10.3",
    changes: [
      {
        target: "다혈질(P)",
        changeType: "buff",
        description: ["기본 피해량이 증가했습니다."],
        valueSummary: "20/60/100(+스킬 증폭의 35%) → 30/70/110(+스킬 증폭의 35%)",
      },
      {
        target: "강력한 펀치(E)",
        changeType: "buff",
        description: ["이동 속도 감소량이 증가했습니다.", "분노의 펀치!에도 동일하게 적용됩니다."],
        valueSummary: "30% → 35%",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: "10.3",
    changes: [
      {
        target: "예고장(W)",
        changeType: "buff",
        description: ["체력 회복량이 증가했습니다."],
        valueSummary: "10/20/30/40/50(+스킬 증폭의 8%) → 18/26/34/42/50(+스킬 증폭의 8%)",
      },
      {
        target: "황혼의 도둑(R) - 2타 피해량",
        changeType: "buff",
        description: ["2타 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "170/250/330(+스킬 증폭의 75%) → 170/250/330(+스킬 증폭의 80%)",
      },
    ],
  },
  {
    characterCode: 20, // 레녹스
    patch: "10.3",
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["레벨 당 방어력이 증가했습니다."],
        valueSummary: "3 → 3.2",
      },
    ],
  },
  {
    characterCode: 22, // 루크
    patch: "10.3",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력이 감소했습니다."],
        valueSummary: "33 → 30",
      },
      {
        target: "무소음 청소기(E)",
        changeType: "nerf",
        description: ["피해량의 공격력 계수가 감소했습니다."],
        valueSummary: "50/75/100/125/150(+공격력의 65%) → 50/75/100/125/150(+공격력의 55%)",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: "10.3",
    changes: [
      {
        target: "되감기(E)",
        changeType: "buff",
        description: ["쿨다운이 감소했습니다."],
        valueSummary: "18/17/16/15/14초 → 17/16/15/14/13초",
      },
    ],
  },
  {
    characterCode: 45, // 마이
    patch: "10.3",
    changes: [
      {
        target: "기본 방어력",
        changeType: "nerf",
        description: ["기본 방어력이 감소했습니다."],
        valueSummary: "52 → 50",
      },
      {
        target: "드레이프(Q) - 피해량",
        changeType: "nerf",
        description: ["피해량이 감소했습니다."],
        valueSummary: "40/80/120/160/200(+스킬 증폭의 40%)(+최대 체력의 7%) → 40/75/110/145/180(+스킬 증폭의 40%)(+최대 체력의 7%)",
      },
    ],
  },
  {
    characterCode: 84, // 블레어
    patch: "10.3",
    changes: [
      {
        target: "블레이드 시프트(P) - 쌍검 기본 공격 강화 피해량",
        changeType: "nerf",
        description: ["쌍검 기본 공격 강화 피해량의 추가 공격력 계수가 감소했습니다."],
        valueSummary: "5/15/25(+추가 공격력의 15/20/25%) → 5/15/25(+추가 공격력의 10/15/20%)",
      },
      {
        target: "블레이드 시프트(P) - 쌍날검 기본 공격 강화 피해량",
        changeType: "nerf",
        description: ["쌍날검 기본 공격 강화 피해량의 추가 공격력 계수가 감소했습니다."],
        valueSummary: "10/30/50(+추가 공격력의 30/40/50%) → 10/30/50(+추가 공격력의 20/30/40%)",
      },
      {
        target: "칼날폭풍(쌍날검 W) - 피해량",
        changeType: "nerf",
        description: ["피해량의 공격력 계수가 감소했습니다."],
        valueSummary: "10/20/30/40/50(+공격력의 40%) → 10/20/30/40/50(+공격력의 30%)",
      },
    ],
  },
  {
    characterCode: 43, // 셀린
    patch: "10.3",
    changes: [
      {
        target: "플라즈마 폭탄(Q)",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "80/105/130/155/180(+스킬 증폭의 40%) → 80/105/130/155/180(+스킬 증폭의 42%)",
      },
      {
        target: "플라즈마 폭탄(Q) - 여러 개의 폭탄 적중 시 피해 감소량",
        changeType: "buff",
        description: ["여러 개의 폭탄 적중 시 피해 감소량이 감소했습니다."],
        valueSummary: "40% → 25%",
      },
      {
        target: "자력 융합(R)",
        changeType: "buff",
        description: ["기본 피해량이 증가했습니다."],
        valueSummary: "50/70/90/110/130(+스킬 증폭의 36%) → 60/80/100/120/140(+스킬 증폭의 36%)",
      },
    ],
  },
  {
    characterCode: 66, // 아르다
    patch: "10.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력이 증가했습니다."],
        valueSummary: "910 → 940",
      },
      {
        target: "유물 탐구(P)",
        changeType: "buff",
        description: ["체력 회복량이 증가했습니다."],
        valueSummary: "40/75/110(+스킬 증폭의 10%) → 50/85/120(+스킬 증폭의 10%)",
      },
    ],
  },
  {
    characterCode: 2, // 아야
    patch: "10.3",
    changes: [
      {
        target: "저격총 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "4.7% → 4.8%",
      },
    ],
  },
  {
    characterCode: 9, // 아이솔
    patch: "10.3",
    changes: [
      {
        target: "셈텍스 폭탄(Q) - 피해량",
        changeType: "buff",
        description: ["피해량이 증가했습니다."],
        valueSummary: "50/70/90/110/130(+공격력의 25%)(+스킬 증폭의 70%) → 60/85/110/135/160(+공격력의 25%)(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 27, // 알렉스
    patch: "10.3",
    changes: [
      {
        target: "정밀 폭격(R) - 최초 이동 속도 감소",
        changeType: "buff",
        description: ["최초 적중 시 이동 속도 감소량이 증가했습니다."],
        valueSummary: "30% → 40%",
      },
      {
        target: "플라즈마 마인(근거리 W)",
        changeType: "rework",
        description: ["이펙트 피아식별이 개선되었습니다."],
      },
    ],
  },
  {
    characterCode: 55, // 에스텔
    patch: "10.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력이 증가했습니다."],
        valueSummary: "940 → 980",
      },
      {
        target: "진압(Q) - 피해량",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "50/80/110/140/170(+스킬 증폭의 35%)(+최대 체력의 5%) → 50/80/110/140/170(+스킬 증폭의 40%)(+최대 체력의 5%)",
      },
    ],
  },
  {
    characterCode: 11, // 유키
    patch: "10.3",
    changes: [
      {
        target: "빗겨치고 일격(E)",
        changeType: "buff",
        description: ["적중 시 공격 속도 감소량이 증가했습니다."],
        valueSummary: "40% → 60%",
      },
    ],
  },
  {
    characterCode: 36, // 이바
    patch: "10.3",
    changes: [
      {
        target: "VF 방출(R)",
        changeType: "buff",
        description: ["피해량이 증가했습니다."],
        valueSummary: "5/10/15(+스킬 증폭의 5%) → 8/12/16(+스킬 증폭의 5%)",
      },
    ],
  },
  {
    characterCode: 80, // 이슈트반
    patch: "10.3",
    changes: [
      {
        target: "양자 얽힘(W) - 보호막량",
        changeType: "buff",
        description: ["보호막량이 증가했습니다."],
        valueSummary: "20/40/60/80/100(+공격력의 100%) → 50/70/90/110/130(+공격력의 100%)",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: "10.3",
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "nerf",
        description: ["레벨 당 방어력이 감소했습니다."],
        valueSummary: "3.4 → 3.2",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: "10.3",
    changes: [
      {
        target: "쌍검 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "4.5% → 4.6%",
      },
      {
        target: "외과 전문의(P) - 보호막 흡수량",
        changeType: "buff",
        description: ["보호막 흡수량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "50/100/150(+스킬 증폭의 40%) → 50/100/150(+스킬 증폭의 45%)",
      },
    ],
  },
  {
    characterCode: 71, // 케네스
    patch: "10.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["기본 체력이 감소했습니다."],
        valueSummary: "1000 → 960",
      },
      {
        target: "분노의 일격(Q) - 피해량",
        changeType: "nerf",
        description: ["피해량의 공격력 계수가 감소했습니다."],
        valueSummary: "30/40/50/60/70(+공격력의 160/165/170/175/180%) → 30/40/50/60/70(+공격력의 150/155/160/165/170%)",
      },
    ],
  },
  {
    characterCode: 14, // 키아라
    patch: "10.3",
    changes: [
      {
        target: "폭주(R)",
        changeType: "buff",
        description: ["체력 회복량이 증가했습니다."],
        valueSummary: "7/11/15(+스킬 증폭의 4%) → 12/17/22(+스킬 증폭의 4%)",
      },
      {
        target: "심판(R2)",
        changeType: "nerf",
        description: ["피해량이 감소했습니다."],
        valueSummary: "90/130/170(+스킬 증폭의 30%) → 70/110/150(+스킬 증폭의 25%)",
      },
      {
        target: "심판(R2) - 낙인 중첩 당 피해량 증가",
        changeType: "buff",
        description: ["낙인 중첩 당 피해량 증가량이 증가했습니다."],
        valueSummary: "15% → 20%",
      },
    ],
  },
  {
    characterCode: 62, // 테오도르
    patch: "10.3",
    changes: [
      {
        target: "에너지 포(Q) - 피해량",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "50/90/130/170/210(+스킬 증폭의 70%) → 50/90/130/170/210(+스킬 증폭의 75%)",
      },
      {
        target: "에너지 포(Q) - 증폭 피해량",
        changeType: "buff",
        description: ["증폭 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "70/110/150/190/230(+스킬 증폭의 70%) → 70/110/150/190/230(+스킬 증폭의 75%)",
      },
    ],
  },
  {
    characterCode: 86, // 펜리르
    patch: "10.3",
    changes: [
      {
        target: "최후의 발악(P) - 피격 시 이동 속도 감소",
        changeType: "buff",
        description: ["피격 시 이동 속도 감소 페널티가 완화됐습니다."],
        valueSummary: "10% → 8%",
      },
      {
        target: "최후의 발악(P) - 추가 피해량",
        changeType: "buff",
        description: ["추가 피해량의 대상 최대 체력 비례 수치가 증가했습니다."],
        valueSummary: "대상 최대 체력의 5% → 6%",
      },
      {
        target: "최후의 발악(P) - 적 탐색 범위",
        changeType: "buff",
        description: ["적 탐색 범위가 증가했습니다."],
        valueSummary: "7m → 9m",
      },
      {
        target: "찢는 손톱(Q) - 체력 회복량",
        changeType: "buff",
        description: ["체력 회복량이 증가했습니다."],
        valueSummary: "40/60/80/100/120(+공격력의 50%) → 40/65/90/115/140(+공격력의 60%)",
      },
    ],
  },
  {
    characterCode: 49, // 펠릭스
    patch: "10.3",
    changes: [
      {
        target: "창 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 기본 공격 증폭이 감소했습니다."],
        valueSummary: "1.6% → 1.5%",
      },
    ],
  },
  {
    characterCode: 8, // 하트
    patch: "10.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["기본 체력이 증가했습니다."],
        valueSummary: "880 → 910",
      },
    ],
  },
  {
    characterCode: 7, // 현우
    patch: "10.3",
    changes: [
      {
        target: "글러브 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 기본 공격 증폭이 증가했습니다."],
        valueSummary: "2.2% → 2.3%",
      },
      {
        target: "발 밟기(Q)",
        changeType: "buff",
        description: ["피해량의 추가 공격력 계수가 증가했습니다."],
        valueSummary: "50/100/150/200/250(+추가 공격력의 40%)(+스킬 증폭의 80%) → 50/100/150/200/250(+추가 공격력의 60%)(+스킬 증폭의 80%)",
      },
    ],
  },
]

export function getCharacterPatchNote(
  characterCode: number,
  patch: string
): CharacterPatchNote | undefined {
  return PATCH_NOTES.find(
    (note) => note.characterCode === characterCode && note.patch === patch
  )
}
