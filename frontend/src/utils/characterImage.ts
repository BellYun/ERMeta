import itemImageMap from "../../const/itemImageMap.json";


/**
 * characterNum을 받아서 해당하는 캐릭터의 mini 이미지 경로를 반환합니다.
 * 파일명이 통일되어 있으므로 여러 가능한 경로를 시도합니다.
 * @param characterNum 캐릭터 번호 (1부터 시작)
 * @returns 캐릭터 mini 이미지 경로 또는 null
 */
export async function getCharacterMiniImagePath(characterNum: number | null | undefined): Promise<string | null> {
  if (!characterNum) return null;

  // TODO: Vercel에서는 파일 시스템 접근이 제한적이므로
  // 클라이언트에서 직접 경로를 구성하거나 빌드 타임 매핑 사용
  // 현재는 null을 반환하며, 나중에 캐릭터 이미지 매핑을 추가할 예정
  
  // 참고: 백엔드 API를 사용하던 방식은 제거되었고,
  // 향후 캐릭터 이미지 매핑 JSON 파일을 생성하여 사용할 예정
  return null;
}

/**
 * 장비 코드를 받아서 해당하는 장비 이미지 경로를 반환합니다.
 * itemImageMap.json 파일에서 매핑된 경로를 가져옵니다.
 * @param itemCode 장비 코드
 * @returns 장비 이미지 경로 또는 null
 */
export function getItemImagePath(itemCode: number | null | undefined): string | null {
  if (!itemCode || itemCode === 0) {
    return null;
  }

  const codeString = String(itemCode);
  const imagePath = (itemImageMap as Record<string, string>)[codeString];
  
  if (imagePath) {
    // console.log(`[getItemImagePath] 매핑 성공: ${itemCode} -> ${imagePath}`);
    return imagePath;
  }
  
  // console.log(`[getItemImagePath] 매핑되지 않은 itemCode: ${itemCode}`);
  return null;
}
