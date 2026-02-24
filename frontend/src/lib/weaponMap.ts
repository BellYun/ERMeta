// bestWeapon 숫자 코드 → 한국어 이름 (ERmangho weaponNames.ts 기준)
export const WEAPON_KOR_BY_CODE: Record<number, string> = {
  1: "글러브",
  2: "톤파",
  3: "방망이",
  4: "채찍",
  5: "투척",
  6: "암기",
  7: "활",
  8: "석궁",
  9: "권총",
  10: "돌격 소총",
  11: "저격총",
  13: "망치",
  14: "도끼",
  15: "단검",
  16: "양손검",
  17: "폴암",
  18: "쌍검",
  19: "창",
  20: "쌍절곤",
  21: "레이피어",
  22: "기타",
  23: "카메라",
  24: "아르카나",
  25: "VF의수",
};

/**
 * 무기 코드로 표시 이름 결정.
 * l10n은 WeaponType/Bat 형식 영문 enum 키라 숫자 코드로 직접 조회 불가.
 * → 정적 한국어 맵 우선, fallback: "무기 {code}"
 */
export function resolveWeaponName(code: number | null | undefined): string {
  if (code == null) return "전체 무기";
  return WEAPON_KOR_BY_CODE[code] ?? `무기 ${code}`;
}
