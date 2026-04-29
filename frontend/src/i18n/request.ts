import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_ROUTE_LOCALE,
  LANGUAGE_BY_ROUTE_LOCALE,
  ROUTE_LOCALE_BY_LANGUAGE,
  type RouteLocale,
} from "@/i18n/routing";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/detectLanguage";

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

export default getRequestConfig(async ({ locale, requestLocale }) => {
  let cookieLang: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  } catch {
    // Static prerender/build 단계에는 request cookie store가 없을 수 있다.
    cookieLang = undefined;
  }
  const routeLocale = (locale ?? (await requestLocale) ?? null) as RouteLocale | null;
  const routeLanguage = routeLocale ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale] : null;
  const language: SupportedLanguage = routeLanguage
    ? routeLanguage
    : cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
      ? (cookieLang as SupportedLanguage)
      : DEFAULT_LANGUAGE;

  const nextIntlLocale = routeLocale ?? ROUTE_LOCALE_BY_LANGUAGE[language] ?? DEFAULT_ROUTE_LOCALE;

  const baseMessages = (await import("../../messages/en.json")).default as Record<string, unknown>;
  let messages = baseMessages;

  if (nextIntlLocale !== "en") {
    try {
      const localeMessages = (await import(`../../messages/${nextIntlLocale}.json`))
        .default as Record<string, unknown>;
      messages = mergeMessages(baseMessages, localeMessages);
    } catch {
      messages = baseMessages;
    }
  }

  return { locale: nextIntlLocale, messages };
});
