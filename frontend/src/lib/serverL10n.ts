import { readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";

const L10N_SEED_PREFIXES = ["Character/Name/", "WeaponType/", "Trait/Name/"] as const;
const l10nSeedCache = new Map<SupportedLanguage, Record<string, string>>();

export function loadL10nRecord(language: SupportedLanguage): Record<string, string> | undefined {
  try {
    const filePath = join(process.cwd(), `public/l10n/${language}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    if (language !== DEFAULT_LANGUAGE) {
      try {
        const fallback = join(process.cwd(), `public/l10n/${DEFAULT_LANGUAGE}.json`);
        return JSON.parse(readFileSync(fallback, "utf-8")) as Record<string, string>;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

export function loadL10nMap(language: SupportedLanguage): Map<string, string> {
  return new Map(Object.entries(loadL10nRecord(language) ?? {}));
}

export function extractL10nSeed(l10n: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(l10n).filter(([key]) =>
      L10N_SEED_PREFIXES.some((prefix) => key.startsWith(prefix))
    )
  );
}

/**
 * 첫 paint에 필요한 이름만 반환한다. 전체 사전은 client에서 정적 JSON으로 보충한다.
 * 빌드/ISR 중 동일 언어의 3~4MB 원본을 반복 파싱하지 않도록 seed만 캐시한다.
 */
export function loadL10nSeed(language: SupportedLanguage): Record<string, string> | undefined {
  const cached = l10nSeedCache.get(language);
  if (cached) return cached;

  const l10n = loadL10nRecord(language);
  if (!l10n) return undefined;

  const seed = extractL10nSeed(l10n);
  l10nSeedCache.set(language, seed);
  return seed;
}
