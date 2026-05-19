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

// 숫자 코드 → BSER l10n 의 영문 enum (WeaponType/{enum} 키로 사용)
export const WEAPON_ENUM_BY_CODE: Record<number, string> = {
  1: "Glove",
  2: "Tonfa",
  3: "Bat",
  4: "Whip",
  5: "HighAngleFire",
  6: "DirectFire",
  7: "Bow",
  8: "CrossBow",
  9: "Pistol",
  10: "AssaultRifle",
  11: "SniperRifle",
  13: "Hammer",
  14: "Axe",
  15: "OneHandSword",
  16: "TwoHandSword",
  17: "Polearm",
  18: "DualSword",
  19: "Spear",
  20: "Nunchaku",
  21: "Rapier",
  22: "Guitar",
  23: "Camera",
  24: "Arcana",
  25: "VFArm",
};

/**
 * 무기 코드로 표시 이름 결정.
 * - l10n Map이 주어지면 `WeaponType/{영문 enum}` 키로 우선 조회 (다국어 대응)
 * - 매칭 실패 또는 l10n 미제공 시 한국어 정적 매핑 fallback
 * - 매핑에 없는 코드는 "무기 {code}"
 */
export function resolveWeaponName(code: number | null, l10n?: Map<string, string>): string {
  // null 또는 0(무기 무관 합산 센티넬) → 전체 무기
  if (code == null || code === 0) return "전체 무기";
  if (l10n) {
    const enumName = WEAPON_ENUM_BY_CODE[code];
    if (enumName) {
      const localized = l10n.get(`WeaponType/${enumName}`);
      if (localized) return localized;
    }
  }
  return WEAPON_KOR_BY_CODE[code] ?? `무기 ${code}`;
}
