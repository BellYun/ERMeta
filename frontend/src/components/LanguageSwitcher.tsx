"use client";

import { Globe2 } from "lucide-react";
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
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useL10n();
  const t = useTranslations("header");

  return (
    <div className="relative shrink-0" translate="no">
      <Globe2
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
      />
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
        aria-label={`Language / ${t("languageSelectAria")}`}
        title="Language · 한국어 / English / 日本語"
        className="min-h-11 pl-8 pr-6 text-xs sm:text-sm"
        wrapperClassName="w-full min-w-[104px] sm:min-w-[120px]"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem
            key={lang}
            value={lang}
            lang={lang === "Korean" ? "ko" : lang === "Japanese" ? "ja" : "en"}
          >
            {LANGUAGE_LABELS[lang]}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
