import raw from './characterBestWeapons.json';

export interface CharacterWeaponInfo {
  weaponCode: number;
  label?: string;
  isDefault?: boolean;
}

type CharacterBestWeaponsMap = Record<string, CharacterWeaponInfo[]>;

const data = raw as CharacterBestWeaponsMap;

export function getWeaponsForCharacter(characterCode: number): CharacterWeaponInfo[] {
  const list = data[String(characterCode)] ?? [];
  // JSON에 잘못 들어간 빈 객체 등이 있어도 방어적으로 필터링
  return list.filter((w) => typeof w.weaponCode === 'number');
}

export function getDefaultWeaponForCharacter(characterCode: number): CharacterWeaponInfo | null {
  const list = getWeaponsForCharacter(characterCode);
  if (!list.length) return null;
  return list.find((w) => w.isDefault) ?? list[0];
}


