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
    patch: "10.1",
    changes: [
      {
        target: "짓뭉개기&꿰뚫기(Q)",
        changeType: "buff",
        description: ["체력 소모량이 감소했습니다."],
        valueSummary: "현재 체력의 3% → 2%",
      },
    ],
  },
  {
    characterCode: 81, // 니아
    patch: "10.1",
    changes: [
      {
        target: "니아의 게임월드(R)",
        changeType: "buff",
        description: ["배터리 중첩 당 보호막량이 증가했습니다."],
        valueSummary: "10/15/20 → 15/20/25",
      },
    ],
  },
  {
    characterCode: 75, // 르노어
    patch: "10.1",
    changes: [
      {
        target: "스타카토(Q)",
        changeType: "buff",
        description: ["피해량이 증가했습니다."],
        valueSummary: "60/80/100/120/140(+스킬 증폭의 60%) → 70/90/110/130/150(+스킬 증폭의 60%)",
      },
    ],
  },
  {
    characterCode: 53, // 마커스
    patch: "10.1",
    changes: [
      {
        target: "망치 무기 숙련도",
        changeType: "nerf",
        description: ["레벨 당 기본 공격 증폭이 감소했습니다."],
        valueSummary: "3.2% → 2.9%",
      },
    ],
  },
  {
    characterCode: 85, // 미르카
    patch: "10.1",
    changes: [
      {
        target: "리펄스 배리어(W)",
        changeType: "nerf",
        description: ["리펄스 게이지 획득량 증가 수치(방어력 비례)가 감소했습니다."],
        valueSummary: "방어력 1 당 0.35% → 0.3%",
      },
      {
        target: "백스텝 러시(E)",
        changeType: "nerf",
        description: ["충돌 범위가 감소했습니다."],
        valueSummary: "반지름 1.3m → 1.25m",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: "10.1",
    changes: [
      {
        target: "윌슨! 도와줘(Q) - 경로 피해량",
        changeType: "buff",
        description: ["경로 피해량이 증가했습니다."],
        valueSummary: "30/40/50/60/70(+스킬 증폭의 30%) → 40/50/60/70/80(+스킬 증폭의 30%)",
      },
      {
        target: "윌슨! 도와줘(Q) - 도착 피해량",
        changeType: "buff",
        description: ["도착 피해량이 증가했습니다."],
        valueSummary: "70/105/140/175/210(+스킬 증폭의 65%) → 80/115/150/185/220(+스킬 증폭의 65%)",
      },
    ],
  },
  {
    characterCode: 2, // 아야
    patch: "10.1",
    changes: [
      {
        target: "고정 사격(W)",
        changeType: "nerf",
        description: ["스킬 증폭 계수가 감소했습니다."],
        valueSummary: "20/30/40/50/60(+공격력의 50%)(+스킬 증폭의 30/35/40/45/50%) → 20/30/40/50/60(+공격력의 50%)(+스킬 증폭의 28/33/38/43/48%)",
      },
    ],
  },
  {
    characterCode: 59, // 아이작
    patch: "10.1",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "48 → 50",
      },
    ],
  },
  {
    characterCode: 79, // 유스티나
    patch: "10.1",
    changes: [
      {
        target: "집중 포격(W)",
        changeType: "buff",
        description: ["피해량이 증가했습니다."],
        valueSummary: "40/60/80/100/120(+스킬 증폭의 35%) → 50/70/90/110/130(+스킬 증폭의 35%)",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: "10.1",
    changes: [
      {
        target: "나라야나스트라(Q) - 강화 피해량",
        changeType: "buff",
        description: ["강화 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "60/110/160/210/260(+스킬 증폭의 65%) → 60/110/160/210/260(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 49, // 펠릭스
    patch: "10.1",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "nerf",
        description: ["레벨 당 공격력이 감소했습니다."],
        valueSummary: "4.5 → 4.3",
      },
    ],
  },
  {
    characterCode: 83, // 헨리
    patch: "10.1",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "50 → 52",
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
