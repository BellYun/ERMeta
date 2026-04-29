// SSG/prerender-safe i18n helper.
// next-intl 의 getTranslations 는 cookies() 의존이라 정적 prerender 단계에서 실패함.
// 본 helper 는 messages JSON 을 직접 import 해서 형식화한다.
//
// layout.tsx 의 loadIntlMessages 와 같은 패턴.

import { cookies } from "next/headers";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/detectLanguage";

type Messages = Record<string, unknown>;

const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
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

function mergeMessages(base: Messages, overlay: Messages): Messages {
  const merged: Messages = { ...base };
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

function lookup(messages: Messages, path: string): string {
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

async function loadMessages(language: SupportedLanguage): Promise<Messages> {
  const locale = LOCALE_BY_LANGUAGE[language] ?? "en";
  const base = (await import("../../messages/en.json")).default as Messages;
  if (locale === "en") return base;
  try {
    const overlay = (await import(`../../messages/${locale}.json`)).default as Messages;
    return mergeMessages(base, overlay);
  } catch {
    return base;
  }
}

async function getRequestLanguage(): Promise<SupportedLanguage> {
  let cookieLang: string | undefined;
  try {
    const store = await cookies();
    cookieLang = store.get(LANGUAGE_COOKIE)?.value;
  } catch {
    cookieLang = undefined;
  }
  return cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
    ? (cookieLang as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export interface StaticTranslator {
  (key: string, values?: Record<string, string | number>): string;
}

export async function getStaticTranslator(namespace: string): Promise<StaticTranslator> {
  const language = await getRequestLanguage();
  const messages = await loadMessages(language);
  return (key, values) => format(lookup(messages, `${namespace}.${key}`), values);
}
