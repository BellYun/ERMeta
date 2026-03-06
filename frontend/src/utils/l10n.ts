// l10n 데이터를 정적 파일에서 가져와서 Map으로 변환
// public/l10n/{language}.json 은 npm run fetch-l10n 으로 생성
export async function fetchAndParseL10n(language: string = 'Korean'): Promise<Map<string, string>> {
  try {
    const response = await fetch(`/l10n/${language}.json`);
    if (!response.ok) {
      throw new Error('l10n 데이터를 불러올 수 없습니다.');
    }
    const data = await response.json() as Record<string, string>;
    return new Map(Object.entries(data));
  } catch (error) {
    console.error('l10n 데이터 로딩 실패:', error);
    return new Map();
  }
}

// 아이템 이름 가져오기
export function getItemName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Item/Name/${code}`) ?? null;
}

// 아이템 설명 가져오기
export function getItemDesc(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Item/Desc/${code}`) ?? null;
}

// 캐릭터 이름 가져오기
export function getCharacterName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Character/Name/${code}`) ?? null;
}

// 스킬 이름 가져오기
export function getSkillName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Skill/Name/${code}`) ?? null;
}

// 전술 스킬 이름 가져오기
export function getTacticalSkillName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`TacticalSkill/Name/${code}`) ?? null;
} 

// 무기 이름 가져오기
export function getWeaponName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`WeaponType/${code}`) ?? null;
} 

// 특성(룬) 이름 가져오기
export function getTraitName(l10n: Map<string, string>, code: number): string | null {
  return (
    l10n.get(`Trait/Name/${code}`) ??
    l10n.get(`TraitName/${code}`) ??
    l10n.get(`Trait/${code}`) ??
    null
  );
}
