// l10n 데이터를 백엔드에서 가져와서 Map으로 변환
export async function fetchAndParseL10n(language: string = 'Korean'): Promise<Map<string, string>> {
  try {
    const response = await fetch(`/api/bser/l10n/${language}`);
    if (!response.ok) {
      throw new Error('l10n 데이터를 불러올 수 없습니다.');
    }
    
    const data = await response.json();
    
    // 백엔드에서 이미 파싱된 l10n 데이터 사용
    if (data.parsedL10n) {
      return new Map(Object.entries(data.parsedL10n));
    }
    
    // fallback: 기존 방식 (l10n 파일 직접 가져오기)
    const l10nUrl = data.data?.l10Path;
    if (!l10nUrl) {
      throw new Error('l10n 파일 경로를 찾을 수 없습니다.');
    }
    
    const l10nResponse = await fetch(l10nUrl);
    if (!l10nResponse.ok) {
      throw new Error('l10n 파일을 불러올 수 없습니다.');
    }
    
    const l10nText = await l10nResponse.text();
    return parseL10nText(l10nText);
  } catch (error) {
    console.error('l10n 데이터 로딩 실패:', error);
    return new Map();
  }
}

// l10n 텍스트를 파싱하여 Map으로 변환
function parseL10nText(text: string): Map<string, string> {
  const l10nMap = new Map<string, string>();
  
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('\t');
      if (key && valueParts.length > 0) {
        l10nMap.set(key, valueParts.join('\t'));
      }
    }
  }
  
  return l10nMap;
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
