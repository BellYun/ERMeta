"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useL10n } from "@/components/L10nProvider";
import { Select, SelectItem } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/detectLanguage";
import { getLanguageTargetPath } from "@/lib/localizedPath";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  Korean: "한국어",
  English: "English",
  Japanese: "日本語",
  ChineseSimplified: "简体中文",
  ChineseTraditional: "繁體中文",
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useL10n();
  const t = useTranslations("header");

  return (
    <Select
      value={language}
      onChange={(e) => {
        const nextLanguage = e.target.value as SupportedLanguage;
        const nextPath = getLanguageTargetPath(pathname, nextLanguage);

        setLanguage(nextLanguage);

        if (nextPath !== pathname) {
          router.push(nextPath);
        }
      }}
      aria-label={t("languageSelectAria")}
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
