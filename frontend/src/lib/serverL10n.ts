import { readFileSync } from "fs";
import { join } from "path";
import { L10N_CORE_SEEDS } from "@/generated/l10nCoreSeeds";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";

const L10N_SEED_PREFIXES = ["Character/Name/", "WeaponType/", "Trait/Name/"] as const;

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
  const seed: Record<string, string> = {};

  for (const key of Object.keys(l10n)) {
    if (L10N_SEED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      seed[key] = l10n[key];
    }
  }

  return seed;
}

/**
 * 첫 paint에 필요한 이름만 반환한다. 추가 사전은 기능별 namespace로 지연 로드한다.
 * 정적으로 생성된 core seed를 사용해 서버 함수의 public 디렉터리 전체 추적을 방지한다.
 */
export function loadL10nSeed(language: SupportedLanguage): Record<string, string> | undefined {
  return L10N_CORE_SEEDS[language];
}
