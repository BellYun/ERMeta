import { getRequestConfig } from "next-intl/server";
import { DEFAULT_ROUTE_LOCALE, LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";

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
  const routeLocale = (locale ?? (await requestLocale) ?? null) as RouteLocale | null;
  const routeLanguage = routeLocale ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale] : null;
  const language: SupportedLanguage = routeLanguage ?? DEFAULT_LANGUAGE;

  const nextIntlLocale = routeLocale ?? DEFAULT_ROUTE_LOCALE;

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
