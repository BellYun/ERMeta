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

/** 이미지 경로는 별도 매핑이 생길 때까지 placeholder 사용. */
export function getCharacterImageUrl(_code: number): string {
  return `/characters/placeholder.png`;
}
