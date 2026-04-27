import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/detectLanguage";

/**
 * BSER l10n 언어명 (Korean, English, ...) → next-intl 표준 BCP47 (ko, en, ...).
 * 두 시스템을 한 cookie로 정렬해서 동일 locale로 운용.
 */
export const NEXT_INTL_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
  ChineseSimplified: "zh-Hans",
  ChineseTraditional: "zh-Hant",
  Spanish: "es",
  French: "fr",
  German: "de",
  Russian: "ru",
  Vietnamese: "vi",
  Thai: "th",
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  const language: SupportedLanguage =
    cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
      ? (cookieLang as SupportedLanguage)
      : DEFAULT_LANGUAGE;

  const locale = NEXT_INTL_LOCALE_BY_LANGUAGE[language];

  // ko / en 는 항상 존재. 그 외는 누락 시 영어 fallback.
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import("../../messages/en.json")).default;
  }

  return { locale, messages };
});
