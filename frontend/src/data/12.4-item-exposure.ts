// 2026-09-17 snapshot: 12.3 Diamond+ (DIAMOND, METEORITE, MITHRIL)
// v2_CharacterEquipmentBuildStats 전체 행을 실험체와 무기 타입별로 합산했습니다.
// 선택률 = 해당 슬롯에서 이 아이템을 장착한 게임 / 해당 슬롯 아이템이 있는 게임.
// 직접 조정 조합은 대체로 5% 이상, 아이템만 바뀐 조합은 20% 이상을 기록합니다.
// 장비 집계는 최종 장비 기준입니다. 12.4 신규 아이템의 사전 선택률은 알 수 없습니다.
// https://playeternalreturn.com/posts/news/3838?hl=ko-KR
export interface PatchItemExposure {
  itemCode: number;
  pickRate: number;
}

export const PATCH_12_4_ITEM_EXPOSURE: Readonly<Record<string, readonly PatchItemExposure[]>> = {
  "1:18": [{ itemCode: 204507, pickRate: 38.8 }],
  "3:19": [{ itemCode: 205503, pickRate: 43.1 }],
  "5:6": [{ itemCode: 201507, pickRate: 7.6 }],
  "6:8": [{ itemCode: 202504, pickRate: 4.9 }],
  "7:1": [{ itemCode: 201537, pickRate: 7.0 }],
  "7:2": [
    { itemCode: 205503, pickRate: 22.9 },
    { itemCode: 201504, pickRate: 6.3 },
  ],
  "9:9": [{ itemCode: 201507, pickRate: 5.9 }],
  "9:10": [{ itemCode: 202529, pickRate: 24.6 }],
  "10:20": [{ itemCode: 204507, pickRate: 22.5 }],
  "16:9": [{ itemCode: 201507, pickRate: 47.6 }],
  "18:15": [{ itemCode: 705608, pickRate: 23.6 }],
  "19:6": [
    { itemCode: 705608, pickRate: 21.5 },
    { itemCode: 205503, pickRate: 17.1 },
  ],
  "21:9": [
    { itemCode: 204507, pickRate: 46.2 },
    { itemCode: 202529, pickRate: 40.1 },
  ],
  "22:3": [{ itemCode: 201537, pickRate: 42.0 }],
  "23:15": [{ itemCode: 204511, pickRate: 7.4 }],
  "24:3": [{ itemCode: 205503, pickRate: 38.1 }],
  "25:11": [
    { itemCode: 202529, pickRate: 67.4 },
    { itemCode: 204507, pickRate: 37.9 },
  ],
  "29:2": [
    { itemCode: 202516, pickRate: 15.6 },
    { itemCode: 201507, pickRate: 13.5 },
  ],
  "31:7": [{ itemCode: 204507, pickRate: 57.5 }],
  "32:5": [
    { itemCode: 204507, pickRate: 42.0 },
    { itemCode: 202529, pickRate: 5.9 },
  ],
  "39:21": [{ itemCode: 204507, pickRate: 38.2 }],
  "41:24": [{ itemCode: 202516, pickRate: 48.1 }],
  "44:25": [{ itemCode: 201537, pickRate: 40.4 }],
  "46:16": [
    { itemCode: 204507, pickRate: 49.3 },
    { itemCode: 203412, pickRate: 8.3 },
    { itemCode: 102412, pickRate: 7.8 },
  ],
  "53:13": [{ itemCode: 201537, pickRate: 77.4 }],
  "53:14": [{ itemCode: 201537, pickRate: 80.5 }],
  "55:14": [{ itemCode: 201507, pickRate: 43.2 }],
  "56:20": [{ itemCode: 203515, pickRate: 6.3 }],
  "58:10": [{ itemCode: 705608, pickRate: 5.4 }],
  "60:6": [{ itemCode: 705608, pickRate: 28.4 }],
  "65:16": [{ itemCode: 102409, pickRate: 33.9 }],
  "69:9": [{ itemCode: 202516, pickRate: 53.5 }],
  "70:6": [{ itemCode: 202504, pickRate: 13.2 }],
  "72:11": [{ itemCode: 204507, pickRate: 44.8 }],
  "73:24": [{ itemCode: 202516, pickRate: 41.0 }],
  "81:9": [{ itemCode: 201504, pickRate: 5.9 }],
  "84:18": [{ itemCode: 204507, pickRate: 46.6 }],
  "88:3": [{ itemCode: 201537, pickRate: 23.2 }],
};

export function get12_4ItemExposure(
  characterCode: number,
  weaponCode: number
): readonly PatchItemExposure[] {
  return PATCH_12_4_ITEM_EXPOSURE[`${characterCode}:${weaponCode}`] ?? [];
}
