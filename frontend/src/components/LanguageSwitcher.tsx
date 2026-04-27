"use client";

import { useL10n } from "@/components/L10nProvider";
import { Select, SelectItem } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/detectLanguage";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  Korean: "한국어",
  English: "English",
  Japanese: "日本語",
  ChineseSimplified: "简体中文",
  ChineseTraditional: "繁體中文",
  Spanish: "Español",
  French: "Français",
  German: "Deutsch",
  Russian: "Русский",
  Vietnamese: "Tiếng Việt",
  Thai: "ไทย",
};

export function LanguageSwitcher() {
  const { language, setLanguage } = useL10n();

  return (
    <Select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label="언어 선택"
      className="h-7 px-2.5 pr-7 text-[11px] sm:text-xs"
      wrapperClassName="shrink-0"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <SelectItem key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </SelectItem>
      ))}
    </Select>
  );
}
