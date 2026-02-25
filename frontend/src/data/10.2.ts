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
    patch: "10.2",
    changes: [
      {
        target: "억누른 고통(W) - 0.2초당 잃은 체력 비례 회복량",
        changeType: "buff",
        description: ["0.2초당 잃은 체력 비례 회복량이 증가했습니다."],
        valueSummary: "3% → 4%",
      },
      {
        target: "억누른 고통(W) - 중첩 당 쿨다운 감소",
        changeType: "buff",
        description: ["중첩 당 짓뭉개기&꿰뚫기(Q), 그릇된 집착(E) 쿨다운 감소량이 증가했습니다."],
        valueSummary: "0.6초 → 0.8초",
      },
      {
        target: "그릇된 집착(E)",
        changeType: "buff",
        description: ["돌진 속도가 증가했습니다."],
        valueSummary: "14m/s → 15m/s",
      },
    ],
  },
  {
    characterCode: 81, // 니아
    patch: "10.2",
    changes: [
      {
        target: "아케이드 드롭(Q)",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "60/100/140/180/220(+스킬 증폭의 65%) → 60/100/140/180/220(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 48, // 띠아
    patch: "10.2",
    changes: [
      {
        target: "알록달록 컬러믹스(P) - 축복의 다람쥐(파란색+빨간색)",
        changeType: "buff",
        description: ["이동 속도 증가량이 증가했습니다."],
        valueSummary: "15/20/25/30/35% → 20/25/30/35/40%",
      },
    ],
  },
  {
    characterCode: 29, // 레온
    patch: "10.2",
    changes: [
      {
        target: "톤파 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "4.8% → 5%",
      },
    ],
  },
  {
    characterCode: 21, // 로지
    patch: "10.2",
    changes: [
      {
        target: "스핀샷(W)",
        changeType: "buff",
        description: ["이동 속도 증가량이 증가했습니다."],
        valueSummary: "120% → 150%",
      },
    ],
  },
  {
    characterCode: 22, // 루크
    patch: "10.2",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "50 → 52",
      },
    ],
  },
  {
    characterCode: 10, // 리 다이린
    patch: "10.2",
    changes: [
      {
        target: "글러브 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 공격 속도가 감소했습니다."],
        valueSummary: "4.3% → 3.8%",
      },
    ],
  },
  {
    characterCode: 31, // 리오
    patch: "10.2",
    changes: [
      {
        target: "카에유미(Q) - 화궁 피해량",
        changeType: "buff",
        description: ["화궁 피해량의 공격력 계수가 증가했습니다."],
        valueSummary: "(공격력의 102%) * (기본 공격 증폭) → (공격력의 104%) * (기본 공격 증폭)",
      },
    ],
  },
  {
    characterCode: 53, // 마커스
    patch: "10.2",
    changes: [
      {
        target: "지각변동(R)",
        changeType: "nerf",
        description: ["방어력 감소 효과가 감소했습니다."],
        valueSummary: "20% → 15%",
      },
    ],
  },
  {
    characterCode: 4, // 매그너스
    patch: "10.2",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "47 → 49",
      },
    ],
  },
  {
    characterCode: 25, // 버니스
    patch: "10.2",
    changes: [
      {
        target: "저격총 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 공격 속도가 증가했습니다."],
        valueSummary: "2.5% → 2.8%",
      },
    ],
  },
  {
    characterCode: 42, // 비앙카
    patch: "10.2",
    changes: [
      {
        target: "아르카나 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 스킬 증폭이 감소했습니다."],
        valueSummary: "4.6% → 4.5%",
      },
    ],
  },
  {
    characterCode: 84, // 블레어
    patch: "10.2",
    changes: [
      {
        target: "말살(쌍검 W) - 피해량",
        changeType: "nerf",
        description: ["피해량이 감소했습니다."],
        valueSummary: "60/90/120/150/180(+추가 공격력의 100%) → 50/80/110/140/170(+추가 공격력의 100%)",
      },
      {
        target: "말살(쌍검 W) - 방어력 감소",
        changeType: "nerf",
        description: ["낮은 스킬 레벨에서의 방어력 감소 수치가 감소했습니다."],
        valueSummary: "12/13/14/15/16% → 8/10/12/14/16%",
      },
      {
        target: "절단 베기(쌍검 E) - 피해량",
        changeType: "nerf",
        description: ["피해량의 추가 공격력 계수가 감소했습니다."],
        valueSummary: "40/70/100/130/160(+추가 공격력의 70/80/90/100/110%) → 40/70/100/130/160(+추가 공격력의 60/70/80/90/100%)",
      },
    ],
  },
  {
    characterCode: 13, // 쇼우
    patch: "10.2",
    changes: [
      {
        target: "식사 시간(W)",
        changeType: "buff",
        description: ["체력 회복량이 증가했습니다."],
        valueSummary: "20/40/60/80/100(+최대 체력의 4%)(+요리사의 열정 중첩 수) → 40/60/80/100/120(+최대 체력의 4%)(+요리사의 열정 중첩 수)",
      },
      {
        target: "웍 돌진(E)",
        changeType: "buff",
        description: ["에어본 지속 시간이 증가했습니다."],
        valueSummary: "0.9초 → 1초",
      },
    ],
  },
  {
    characterCode: 28, // 수아
    patch: "10.2",
    changes: [
      {
        target: "파랑새(W)",
        changeType: "buff",
        description: ["보호막량이 증가했습니다."],
        valueSummary: "40/65/90/115/140(+스킬 증폭의 30%) → 80/100/120/140/160(+스킬 증폭의 30%)",
      },
      {
        target: "기억력(R) - 파랑새(RW) 보호막량",
        changeType: "buff",
        description: ["파랑새(RW) 보호막량이 증가했습니다."],
        valueSummary: "50/150/250(+스킬 증폭의 30%) → 100/180/260(+스킬 증폭의 30%)",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: "10.2",
    changes: [
      {
        target: "투척 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 스킬 증폭이 감소했습니다."],
        valueSummary: "4.8% → 4.6%",
      },
    ],
  },
  {
    characterCode: 66, // 아르다
    patch: "10.2",
    changes: [
      {
        target: "님루드의 비석(E) / 님루드의 문(RE) - 피해량",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다. 님루드의 문(RE)에도 동일하게 적용됩니다."],
        valueSummary: "80/110/140/170/200(+스킬 증폭의 50%) → 80/110/140/170/200(+스킬 증폭의 55%)",
      },
    ],
  },
  {
    characterCode: 67, // 아비게일
    patch: "10.2",
    changes: [
      {
        target: "바이너리 스핀(Q) - 1타 피해량",
        changeType: "nerf",
        description: ["1타 피해량의 스킬 증폭 계수가 감소했습니다."],
        valueSummary: "20/40/60/80/100(+스킬 증폭의 35%) → 20/40/60/80/100(+스킬 증폭의 30%)",
      },
      {
        target: "바이너리 스핀(Q) - 2타 피해량",
        changeType: "nerf",
        description: ["2타 피해량이 감소했습니다."],
        valueSummary: "50/85/120/155/190(+스킬 증폭의 35%) → 40/75/110/145/180(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 9, // 아이솔
    patch: "10.2",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["레벨 당 체력이 증가했습니다."],
        valueSummary: "73 → 75",
      },
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["레벨 당 방어력이 증가했습니다."],
        valueSummary: "2.5 → 2.6",
      },
    ],
  },
  {
    characterCode: 68, // 알론소
    patch: "10.2",
    changes: [
      {
        target: "마그네틱 펀치(Q) - 연결된 적 피해량",
        changeType: "buff",
        description: ["연결된 적에게 주는 최대 체력 비례 피해량이 증가했습니다."],
        valueSummary: "(알론소 레벨*8)(+적 최대 체력의 5/6/7/8/9%) → (알론소 레벨*8)(+적 최대 체력의 6/7/8/9/10%)",
      },
    ],
  },
  {
    characterCode: 19, // 엠마
    patch: "10.2",
    changes: [
      {
        target: "비둘기 딜러(Q)",
        changeType: "buff",
        description: ["적중 시 쿨다운 감소량이 증가했습니다."],
        valueSummary: "15% → 25%",
      },
      {
        target: "폭죽 모자(W) - 쿨다운",
        changeType: "buff",
        description: ["쿨다운이 감소했습니다."],
        valueSummary: "11/10.5/10/9.5/9초 → 10/9.5/9/8.5/8초",
      },
      {
        target: "폭죽 모자(W) - 적중 시 쿨다운 감소량",
        changeType: "nerf",
        description: ["적중 시 쿨다운 감소량이 감소했습니다."],
        valueSummary: "30% → 25%",
      },
    ],
  },
  {
    characterCode: 32, // 윌리엄
    patch: "10.2",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력이 감소했습니다."],
        valueSummary: "40 → 37",
      },
    ],
  },
  {
    characterCode: 77, // 유민
    patch: "10.2",
    changes: [
      {
        target: "풍류운산(R) - 이동 속도 감소",
        changeType: "buff",
        description: ["첫 번째 공격 적중 시 이동 속도 감소량이 증가했습니다."],
        valueSummary: "40% → 45%",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: "10.2",
    changes: [
      {
        target: "사로잡힌 육신(P) - 귀신 상태 체력 회복량",
        changeType: "nerf",
        description: ["귀신 상태일 때 고정 피해량 비례 체력 회복량이 감소했습니다."],
        valueSummary: "150% → 140%",
      },
    ],
  },
  {
    characterCode: 38, // 제니
    patch: "10.2",
    changes: [
      {
        target: "권총 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 공격 속도가 증가했습니다."],
        valueSummary: "3% → 3.3%",
      },
    ],
  },
  {
    characterCode: 70, // 츠바메
    patch: "10.2",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "nerf",
        description: ["레벨 당 체력이 감소했습니다."],
        valueSummary: "77 → 75",
      },
    ],
  },
  {
    characterCode: 39, // 카밀로
    patch: "10.2",
    changes: [
      {
        target: "브엘따(Q) - 강화 시 2타 피해량",
        changeType: "nerf",
        description: ["강화 시 2타 피해량의 공격력 계수가 감소했습니다."],
        valueSummary: "30/60/90/120/150(+공격력의 90%)*(기본 공격 증폭) → 30/60/90/120/150(+공격력의 80%)*(기본 공격 증폭)",
      },
    ],
  },
  {
    characterCode: 54, // 칼라
    patch: "10.2",
    changes: [
      {
        target: "작살 장전(P) - 공격 속도 전환",
        changeType: "nerf",
        description: ["초과된 공격 속도 0.01 당 스킬 증폭 전환율이 감소했습니다."],
        valueSummary: "1.2 → 1.0",
      },
      {
        target: "작살 장전(P) - 완전히 충전된 피해량",
        changeType: "nerf",
        description: ["완전히 충전된 피해량의 스킬 증폭 계수가 감소했습니다."],
        valueSummary: "10/25/40(+스킬 증폭의 30%)(+대상 최대 체력의 4/7/10%) → 10/25/40(+스킬 증폭의 25%)(+대상 최대 체력의 4/7/10%)",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: "10.2",
    changes: [
      {
        target: "앰퓨테이션(W) - 이동 속도 감소",
        changeType: "buff",
        description: ["외곽 적중 시 이동 속도 감소량이 증가했습니다."],
        valueSummary: "30% → 40%",
      },
    ],
  },
  {
    characterCode: 62, // 테오도르
    patch: "10.2",
    changes: [
      {
        target: "증폭 스크린(W) - 기본 공격 추가 스킬 피해량",
        changeType: "buff",
        description: ["기본 공격의 추가 스킬 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "30/40/50/60/70(+스킬 증폭의 24%) → 30/40/50/60/70(+스킬 증폭의 26%)",
      },
    ],
  },
  {
    characterCode: 49, // 펠릭스
    patch: "10.2",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력이 감소했습니다."],
        valueSummary: "35 → 33",
      },
    ],
  },
  {
    characterCode: 3, // 피오라
    patch: "10.2",
    changes: [
      {
        target: "레이피어 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 스킬 증폭이 감소했습니다."],
        valueSummary: "4.6% → 4.5%",
      },
      {
        target: "양손검 무기 숙련도",
        changeType: "buff",
        description: ["레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "4.7% → 4.8%",
      },
    ],
  },
  {
    characterCode: 83, // 헨리
    patch: "10.2",
    changes: [
      {
        target: "시간 제어 장치(W)",
        changeType: "buff",
        description: ["쿨다운이 감소했습니다."],
        valueSummary: "12초 → 11초",
      },
    ],
  },
  {
    characterCode: 78, // 히스이
    patch: "10.2",
    changes: [
      {
        target: "모노호시자오(R)",
        changeType: "buff",
        description: ["쿨다운이 감소했습니다."],
        valueSummary: "70/60/50초 → 65/55/45초",
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
