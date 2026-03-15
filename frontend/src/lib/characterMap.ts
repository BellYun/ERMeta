// characterCode(숫자) → 이름 매핑 (정적 fallback, l10n API 기준)
// 식별자는 항상 숫자 코드. 이름은 코드 → 이름 방향으로만 변환.
const CHARACTER_NAMES: Record<number, string> = {
  1: "재키",
  2: "아야",
  3: "피오라",
  4: "매그너스",
  5: "자히르",
  6: "나딘",
  7: "현우",
  8: "하트",
  9: "아이솔",
  10: "리 다이린",
  11: "유키",
  12: "혜진",
  13: "쇼우",
  14: "키아라",
  15: "시셀라",
  16: "실비아",
  17: "아드리아나",
  18: "쇼이치",
  19: "엠마",
  20: "레녹스",
  21: "로지",
  22: "루크",
  23: "캐시",
  24: "아델라",
  25: "버니스",
  26: "바바라",
  27: "알렉스",
  28: "수아",
  29: "레온",
  30: "일레븐",
  31: "리오",
  32: "윌리엄",
  33: "니키",
  34: "나타폰",
  35: "얀",
  36: "이바",
  37: "다니엘",
  38: "제니",
  39: "카밀로",
  40: "클로에",
  41: "요한",
  42: "비앙카",
  43: "셀린",
  44: "에키온",
  45: "마이",
  46: "에이든",
  47: "라우라",
  48: "띠아",
  49: "펠릭스",
  50: "엘레나",
  51: "프리야",
  52: "아디나",
  53: "마커스",
  54: "칼라",
  55: "에스텔",
  56: "피올로",
  57: "마르티나",
  58: "헤이즈",
  59: "아이작",
  60: "타지아",
  61: "이렘",
  62: "테오도르",
  63: "이안",
  64: "바냐",
  65: "데비&마를렌",
  66: "아르다",
  67: "아비게일",
  68: "알론소",
  69: "레니",
  70: "츠바메",
  71: "케네스",
  72: "카티야",
  73: "샬럿",
  74: "다르코",
  75: "르노어",
  76: "가넷",
  77: "유민",
  78: "히스이",
  79: "유스티나",
  80: "이슈트반",
  81: "니아",
  82: "슈린",
  83: "헨리",
  84: "블레어",
  85: "미르카",
  86: "펜리르",
  9998: "Dr. 하나",
  9999: "나쟈",
};

/** 정적 fallback Map 생성. 앱 시작 시 1회만 호출. */
export function buildFallbackMap(): Map<number, string> {
  return new Map(Object.entries(CHARACTER_NAMES).map(([k, v]) => [Number(k), v]));
}

/**
 * 캐릭터 코드로 표시 이름을 결정하는 공통 함수.
 * 우선순위: l10n → fallbackMap → "코드: ${code}"
 */
export function resolveCharacterName(
  code: number,
  l10n: Map<string, string>,
  fallbackMap: Map<number, string>
): string {
  return (
    l10n.get(`Character/Name/${code}`) ??
    fallbackMap.get(code) ??
    `코드: ${code}`
  );
}

/**
 * l10n 없이 정적 fallback만으로 이름을 반환.
 * 서버 컴포넌트 / l10n 로드 전 초기 렌더에서 사용.
 */
export function getCharacterName(code: number): string {
  return CHARACTER_NAMES[code] ?? `코드: ${code}`;
}

const CHARACTER_MINI_IMAGES: Record<number, string> = {
  1: "/CharactER/001.%20Jackie/02.%20Default/Mini.png",
  2: "/CharactER/002.%20Aya/02.%20Default/Mini.png",
  3: "/CharactER/005.%20Fiora/02.%20Default/Mini.png",
  4: "/CharactER/004.%20Magnus/02.%20Default/Mini.png",
  5: "/CharactER/007.%20Zahir/02.%20Default/Mini.png",
  6: "/CharactER/006.%20Nadine/02.%20Default/Mini.png",
  7: "/CharactER/003.%20Hyunwoo/02.%20Default/Mini.png",
  8: "/CharactER/008.%20Hart/02.%20Default/Mini.png",
  9: "/CharactER/009.%20Isol/02.%20Default/Mini.png",
  10: "/CharactER/010.%20Li%20Dailin/02.%20Default/Mini.png",
  11: "/CharactER/011.%20Yuki/02.%20Default/Mini.png",
  12: "/CharactER/012.%20Hyejin/02.%20Default/Mini.png",
  13: "/CharactER/013.%20Xiukai/02.%20Default/Mini.png",
  14: "/CharactER/015.%20Chiara/02.%20Default/Mini.png",
  15: "/CharactER/014.%20Sissela/02.%20Default/Mini.png",
  16: "/CharactER/018.%20Silvia/02.%20Default/Mini.png",
  17: "/CharactER/016.%20Adriana/02.%20Default/Mini.png",
  18: "/CharactER/017.%20Shoichi/02.%20Default/Mini.png",
  19: "/CharactER/019.%20Emma/02.%20Default/Mini.png",
  20: "/CharactER/020.%20Lenox/02.%20Default/Mini.png",
  21: "/CharactER/021.%20Rozzi/02.%20Default/Mini.png",
  22: "/CharactER/022.%20Luke/02.%20Default/Mini.png",
  23: "/CharactER/023.%20Cathy/02.%20Default/Mini.png",
  24: "/CharactER/024.%20Adela/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  25: "/CharactER/025.%20bERnice/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  26: "/CharactER/026.%20Barbara/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  27: "/CharactER/027.%20Alex/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  28: "/CharactER/028.%20Sua/02.%20Default/Mini.png",
  29: "/CharactER/029.%20Leon/02.%20Default/Mini.png",
  30: "/CharactER/030.%20Eleven/02.%20Default/Mini.png",
  31: "/CharactER/031.%20Rio/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  32: "/CharactER/032.%20William/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  33: "/CharactER/033.%20Nicky/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  34: "/CharactER/034.%20Nathapon/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  35: "/CharactER/035.%20Jan/02.%20Default/Mini.png",
  36: "/CharactER/036.%20Eva/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  37: "/CharactER/037.%20Daniel/02.%20Default/Mini.png",
  38: "/CharactER/038.%20Jenny/02.%20Default/Mini.png",
  39: "/CharactER/039.%20Camilo/02.%20Default/Mini.png",
  40: "/CharactER/040.%20Chloe/02.%20Default/Mini.png",
  41: "/CharactER/041.%20Johann/02.%20Default/Mini.png",
  42: "/CharactER/042.%20Bianca/02.%20Default/Mini.png",
  43: "/CharactER/043.%20Celine/02.%20Default/Mini.png",
  44: "/CharactER/044.%20Echion/02.%20Default/Mini.png",
  45: "/CharactER/045.%20Mai/02.%20Default/Mini.png",
  46: "/CharactER/046.%20Aiden/02.%20Default/Mini.png",
  47: "/CharactER/047.%20Laura/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  48: "/CharactER/048.%20Tia/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  49: "/CharactER/049.%20Felix/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  50: "/CharactER/050.%20Elena/02.%20Default/Mini.png",
  51: "/CharactER/051.%20Priya/02.%20Default/Mini.png",
  52: "/CharactER/052.%20Adina/02.%20Default/Mini.png",
  53: "/CharactER/053.%20Markus/02.%20Default/Mini.png",
  54: "/CharactER/054.%20Karla/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  55: "/CharactER/055.%20Estelle/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  56: "/CharactER/056.%20Piolo/02.%20Default%20-%20%EA%B8%B0%EB%B3%B8/Mini.png",
  57: "/CharactER/057.%20Martina/02.%20Default/Mini.png",
  58: "/CharactER/058.%20Haze/02.%20Default/Mini.png",
  59: "/CharactER/059.%20Isaac/02.%20Default/Mini.png",
  60: "/CharactER/060.%20Tazia/02.%20Default/Mini.png",
  61: "/CharactER/061.%20Irem/02.%20Default/Mini.png",
  62: "/CharactER/062.%20Theodore/02.%20Default/Mini.png",
  63: "/CharactER/063.%20Ly%20anh/02.%20Default/Mini.png",
  64: "/CharactER/064.%20Vanya/02.%20Default/Mini.png",
  65: "/CharactER/065.%20Debi%20%26%20Marlene/02.%20Default/Mini.png",
  66: "/CharactER/066.%20Arda/02.%20Default/Mini.png",
  67: "/CharactER/067.%20Abigail/02.%20Default/Mini.png",
  68: "/CharactER/068.%20Alonso/02.%20Default/Mini.png",
  69: "/CharactER/069.%20Leni/02.%20Default/Mini.png",
  70: "/CharactER/070.%20Tsubame/02.%20Default/Mini.png",
  71: "/CharactER/071.%20Kenneth/02.%20Default/Mini.png",
  72: "/CharactER/072.%20Katja/02.%20Default/Mini.png",
  73: "/CharactER/073.%20Charlotte/02.%20Default/Mini.png",
  74: "/CharactER/074.%20Darko/02.%20Default/Mini.png",
  75: "/CharactER/075.%20Lenore/02.%20Default/Mini.png",
  76: "/CharactER/076.%20Garnet/02.%20Default/Mini.png",
  77: "/CharactER/077.%20Yumin/02.%20Default/Mini.png",
  78: "/CharactER/078.%20Hisui/02.%20Default/Mini.png",
  79: "/CharactER/079.%20Justyna/02.%20Default/Mini.png",
  80: "/CharactER/080.%20Istv%C3%A1n/02.%20Default/Mini.png",
  81: "/CharactER/081.%20NiaH/02.%20Default/Mini.png",
  82: "/CharactER/082.%20Xuelin/02.%20Default/Mini.png",
  83: "/CharactER/083.%20Henry/02.%20Default/Mini.png",
  84: "/CharactER/084.%20Blair/02.%20Default/Mini.png",
  85: "/CharactER/085.%20Mirka/02.%20Default/Mini.png",
  86: "/CharactER/086.%20Fenrir/02.%20Default/Mini.png",
};

/** characterNum으로 Mini 이미지 경로 반환. 없으면 placeholder. */
export function getCharacterImageUrl(code: number): string {
  return CHARACTER_MINI_IMAGES[code] ?? `/characters/placeholder.png`;
}

// 직업군 타입
export type CharacterRole = "탱커" | "전사" | "암살자" | "스킬딜러" | "원거리 딜러" | "지원가";

// 캐릭터+무기 조합 → 직업군 매핑 (key: "캐릭터코드_무기코드")
const COMBO_ROLES: Record<string, CharacterRole[]> = {
  // 탱커
  "55_14": ["탱커", "전사"],       // 에스텔+도끼
  "85_13": ["탱커", "전사"],       // 미르카+망치
  "20_4":  ["탱커"],               // 레녹스+채찍
  "4_13":  ["탱커", "전사"],       // 매그너스+망치
  "13_15": ["탱커"],               // 쇼우+단검
  "30_13": ["탱커"],               // 일레븐+망치
  "45_4":  ["탱커", "지원가"],     // 마이+채찍
  "4_3":   ["탱커", "전사"],       // 매그너스+방망이
  "76_3":  ["탱커", "전사"],       // 가넷+방망이
  "50_21": ["탱커"],               // 엘레나+레이피어
  "53_13": ["탱커", "전사"],       // 마커스+망치
  "53_14": ["탱커", "전사"],       // 마커스+도끼
  "13_19": ["탱커"],               // 쇼우+창
  // 전사 (탱커와 중복 제외)
  "27_2":  ["전사"],               // 알렉스+톤파
  "49_19": ["전사"],               // 펠릭스+창
  "3_21":  ["전사"],               // 피오라+레이피어
  "63_15": ["전사"],               // 이안+단검
  "35_1":  ["전사"],               // 얀+글러브
  "56_20": ["전사"],               // 피올로+쌍절곤
  "39_18": ["전사"],               // 카밀로+쌍검
  "80_19": ["전사"],               // 이슈트반+창
  "7_1":   ["전사"],               // 현우+글러브
  "64_24": ["전사"],               // 바냐+아르카나
  "16_9":  ["전사", "스킬딜러"],   // 실비아+권총
  "28_3":  ["전사", "스킬딜러"],   // 수아+방망이
  "71_14": ["전사"],               // 케네스+도끼
  "65_16": ["전사"],               // 데비&마를렌+양손검
  "61_5":  ["전사", "스킬딜러"],   // 이렘+투척
  "39_21": ["전사"],               // 카밀로+레이피어
  "47_4":  ["전사"],               // 라우라+채찍
  "82_21": ["전사", "암살자"],     // 슈린+레이피어
  "10_1":  ["전사"],               // 리 다이린+글러브
  "1_16":  ["전사"],               // 재키+양손검
  "33_1":  ["전사"],               // 니키+글러브
  "67_14": ["전사"],               // 아비게일+도끼
  "78_16": ["전사"],               // 히스이+양손검
  "44_25": ["전사"],               // 에키온+VF의수
  "29_1":  ["전사"],               // 레온+글러브
  "11_16": ["전사"],               // 유키+양손검
  "74_3":  ["전사"],               // 다르코+방망이
  "22_3":  ["전사"],               // 루크+방망이
  "86_1":  ["전사"],               // 펜리르+글러브
  "11_18": ["전사"],               // 유키+쌍검
  "14_21": ["전사"],               // 키아라+레이피어
  "1_15":  ["전사"],               // 재키+단검
  "3_16":  ["전사"],               // 피오라+양손검
  "35_2":  ["전사"],               // 얀+톤파
  "7_2":   ["전사"],               // 현우+톤파
  "1_14":  ["전사"],               // 재키+도끼
  // 암살자
  "23_18": ["암살자"],             // 캐시+쌍검
  "37_15": ["암살자"],             // 다니엘+단검
  "23_15": ["암살자"],             // 캐시+단검
  "18_15": ["암살자"],             // 쇼이치+단검
  // 스킬딜러
  "12_7":  ["스킬딜러"],           // 혜진+활
  "26_9":  ["스킬딜러"],           // 바바라+권총
  "42_24": ["스킬딜러"],           // 비앙카+아르카나
  "5_6":   ["스킬딜러"],           // 자히르+암기
  "66_24": ["스킬딜러", "지원가"], // 아르다+아르카나
  "81_9":  ["스킬딜러"],           // 니아+권총
  "36_5":  ["스킬딜러"],           // 이바+투척
  "34_23": ["스킬딜러"],           // 나타폰+카메라
  "48_3":  ["스킬딜러"],           // 띠아+방망이
  "2_11":  ["스킬딜러", "원거리 딜러"], // 아야+저격총
  "43_5":  ["스킬딜러"],           // 셀린+투척
  "77_24": ["스킬딜러"],           // 유민+아르카나
  "52_24": ["스킬딜러", "지원가"], // 아디나+아르카나
  "83_6":  ["스킬딜러"],           // 헨리+암기
  "9_10":  ["스킬딜러", "원거리 딜러"], // 아이솔+돌격 소총
  "5_5":   ["스킬딜러"],           // 자히르+투척
  "12_6":  ["스킬딜러"],           // 혜진+암기
  "24_21": ["스킬딜러"],           // 아델라+레이피어
  "24_3":  ["스킬딜러"],           // 아델라+방망이
  "15_6":  ["스킬딜러"],           // 시셀라+암기
  "79_8":  ["스킬딜러"],           // 유스티나+석궁
  "51_22": ["스킬딜러", "지원가"], // 프리야+기타
  "75_22": ["스킬딜러"],           // 르노어+기타
  "9_9":   ["스킬딜러", "원거리 딜러"], // 아이솔+권총
  "19_24": ["스킬딜러"],           // 엠마+아르카나
  "60_6":  ["스킬딜러"],           // 타지아+암기
  "6_7":   ["스킬딜러", "원거리 딜러"], // 나딘+활
  "2_9":   ["스킬딜러", "원거리 딜러"], // 아야+권총
  "15_5":  ["스킬딜러"],           // 시셀라+투척
  // 원거리 딜러
  "21_9":  ["원거리 딜러"],        // 로지+권총
  "40_6":  ["원거리 딜러"],        // 클로에+암기
  "25_11": ["원거리 딜러"],        // 버니스+저격총
  "32_5":  ["원거리 딜러"],        // 윌리엄+투척
  "31_7":  ["원거리 딜러"],        // 리오+활
  "6_8":   ["원거리 딜러"],        // 나딘+석궁
  "38_9":  ["원거리 딜러"],        // 제니+권총
  "62_11": ["원거리 딜러", "지원가"], // 테오도르+저격총
  "70_6":  ["원거리 딜러"],        // 츠바메+암기
  "8_22":  ["원거리 딜러"],        // 하트+기타
  "72_11": ["원거리 딜러"],        // 카티야+저격총
  "2_10":  ["원거리 딜러"],        // 아야+돌격 소총
  "57_23": ["원거리 딜러"],        // 마르티나+카메라
  // 지원가
  "41_24": ["지원가"],             // 요한+아르카나
  "69_9":  ["지원가"],             // 레니+권총
  "73_24": ["지원가"],             // 샬럿+아르카나
};

// 무기코드 fallback (조합 매핑에 없을 때 사용)
const WEAPON_ROLES_FALLBACK: Record<number, CharacterRole[]> = {
  1:  ["전사"],                    // 글러브
  2:  ["전사"],                    // 톤파
  3:  ["전사"],                    // 방망이
  4:  ["탱커"],                    // 채찍
  5:  ["스킬딜러"],                // 투척
  6:  ["스킬딜러"],                // 암기
  7:  ["스킬딜러"],                // 활
  8:  ["스킬딜러"],                // 석궁
  9:  ["원거리 딜러"],             // 권총
  10: ["원거리 딜러"],             // 돌격 소총
  11: ["원거리 딜러"],             // 저격총
  13: ["전사"],                    // 망치
  14: ["전사"],                    // 도끼
  15: ["전사"],                    // 단검
  16: ["전사"],                    // 양손검
  17: ["전사"],                    // 폴암
  18: ["전사"],                    // 쌍검
  19: ["전사"],                    // 창
  20: ["전사"],                    // 쌍절곤
  21: ["전사"],                    // 레이피어
  22: ["스킬딜러"],                // 기타
  23: ["스킬딜러"],                // 카메라
  24: ["스킬딜러"],                // 아르카나
  25: ["전사"],                    // VF의수
};

/** 캐릭터+무기 조합으로 직업군 조회. 없으면 무기 fallback. */
export function getComboRoles(characterCode: number, weaponCode: number): CharacterRole[] {
  const key = `${characterCode}_${weaponCode}`;
  return COMBO_ROLES[key] ?? WEAPON_ROLES_FALLBACK[weaponCode] ?? [];
}

/** Half 이미지 경로. Mini 경로에서 Mini.png → Half.png 치환. 없는 캐릭터는 Mini fallback. */
export function getCharacterHalfImageUrl(code: number): string {
  const miniPath = CHARACTER_MINI_IMAGES[code];
  if (!miniPath) return `/characters/placeholder.png`;
  return miniPath.replace(/Mini\.png$/, "Half.png");
}
