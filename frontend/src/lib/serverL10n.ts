import { readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_LANGUAGE, type SupportedLanguage } from "@/lib/detectLanguage";

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
