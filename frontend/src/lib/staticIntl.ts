import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";

export type IntlMessages = Record<string, unknown>;

export const HTML_LANG_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
  ChineseSimplified: "zh-Hans",
  ChineseTraditional: "zh-Hant",
};

export const OG_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko_KR",
  English: "en_US",
  Japanese: "ja_JP",
  ChineseSimplified: "zh_CN",
  ChineseTraditional: "zh_TW",
};

export const STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko-KR",
  English: "en-US",
  Japanese: "ja-JP",
  ChineseSimplified: "zh-CN",
  ChineseTraditional: "zh-TW",
};

type MessagesModule = { default: IntlMessages };

const MESSAGE_LOADERS: Record<string, () => Promise<MessagesModule>> = {
  en: () => import("../../messages/en.json"),
  ko: () => import("../../messages/ko.json"),
  ja: () => import("../../messages/ja.json"),
  "zh-Hans": () => import("../../messages/zh-Hans.json"),
  "zh-Hant": () => import("../../messages/zh-Hant.json"),
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeMessages(base: IntlMessages, overlay: IntlMessages): IntlMessages {
  const merged: IntlMessages = { ...base };

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

export function getMessage(messages: IntlMessages, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (!isPlainObject(acc)) return undefined;
    return acc[key];
  }, messages);

  return typeof value === "string" ? value : path;
}

function format(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export async function loadIntlMessages(
  language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<IntlMessages> {
  const locale = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
  const baseMessages = (await MESSAGE_LOADERS.en()).default as IntlMessages;

  if (locale === "en") {
    return baseMessages;
  }

  const loadLocaleMessages = MESSAGE_LOADERS[locale];
  if (!loadLocaleMessages) {
    return baseMessages;
  }

  try {
    const localeMessages = (await loadLocaleMessages()).default as IntlMessages;
    return mergeMessages(baseMessages, localeMessages);
  } catch {
    return baseMessages;
  }
}

export interface StaticTranslator {
  (key: string, values?: Record<string, string | number>): string;
}

export async function getStaticTranslator(
  namespace: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<StaticTranslator> {
  const messages = await loadIntlMessages(language);
  return (key, values) => format(getMessage(messages, `${namespace}.${key}`), values);
}
