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
  Indonesian: "id",
  Italian: "it",
  Polish: "pl",
  Portuguese: "pt",
  Russian: "ru",
  Vietnamese: "vi",
  Thai: "th",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    const current = merged[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = mergeMessages(current, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  const language: SupportedLanguage =
    cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
      ? (cookieLang as SupportedLanguage)
      : DEFAULT_LANGUAGE;

  const locale = NEXT_INTL_LOCALE_BY_LANGUAGE[language];

  const baseMessages = (await import("../../messages/en.json")).default as Record<string, unknown>;
  let messages = baseMessages;

  if (locale !== "en") {
    try {
      const localeMessages = (await import(`../../messages/${locale}.json`)).default as Record<
        string,
        unknown
      >;
      messages = mergeMessages(baseMessages, localeMessages);
    } catch {
      messages = baseMessages;
    }
  }

  return { locale, messages };
});
