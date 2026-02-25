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
  // 실제 패치 데이터를 여기에 추가
  // 패치 버전 형식은 DB의 patchVersion과 일치해야 함 (예: "10.3")
  {
    characterCode: 1,  // 재키
    patch: "10.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: ["최대 체력이 증가했습니다."],
        valueSummary: "850 → 920",
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
