// 서비스 노출 언어 화이트리스트. 기본 한국어 + 영어/일본어/중국어만 운영.
export const SUPPORTED_LANGUAGES = [
  "Korean",
  "English",
  "Japanese",
  "ChineseSimplified",
  "ChineseTraditional",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "Korean";
export const LANGUAGE_COOKIE = "er-meta-language";

/** BCP 47 언어 태그 → 우리 언어. 첫 매치 우선. */
const BCP47_MAP: Array<[RegExp, SupportedLanguage]> = [
  [/^ko\b/i, "Korean"],
  [/^en\b/i, "English"],
  [/^ja\b/i, "Japanese"],
  // 중국어: hans/cn = 간체, hant/tw/hk/mo = 번체
  [/^zh-(hant|tw|hk|mo)\b/i, "ChineseTraditional"],
  [/^zh-(hans|cn|sg)\b/i, "ChineseSimplified"],
  [/^zh\b/i, "ChineseSimplified"],
];

function tagToLanguage(tag: string): SupportedLanguage | null {
  for (const [re, lang] of BCP47_MAP) {
    if (re.test(tag)) return lang;
  }
  return null;
}

/**
 * Accept-Language 헤더 파싱. 품질 가중치 q 기준 내림차순으로
 * 우리가 지원하는 언어 중 첫 매치 반환.
 */
export function detectFromAcceptLanguage(header: string | null): SupportedLanguage | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim().match(/^q=([\d.]+)/)).find(Boolean)?.[1];
      return { tag: tag.trim(), q: q ? Number(q) : 1 };
    })
    .filter((t) => t.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const lang = tagToLanguage(tag);
    if (lang) return lang;
  }
  return null;
}

/**
 * cookie value 또는 Accept-Language로부터 언어 결정.
 * 우선순위:
 *  1. cookie(유효 값) — 사용자 명시적 선택 최우선
 *  2. Accept-Language 매치 → 그 언어
 *  3. Accept-Language 있는데 미지원 (예: pt-BR, nl-NL) → English fallback
 *  4. Accept-Language 자체 없음 (봇/구형 클라이언트) → DEFAULT_LANGUAGE (Korean)
 */
export function resolveLanguage(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null
): SupportedLanguage {
  if (cookieValue && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieValue)) {
    return cookieValue as SupportedLanguage;
  }
  if (acceptLanguage) {
    return detectFromAcceptLanguage(acceptLanguage) ?? "English";
  }
  return DEFAULT_LANGUAGE;
}
