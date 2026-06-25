"use client";

import { Globe2, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import {
  DEFAULT_LANGUAGE,
  detectFromAcceptLanguage,
  type SupportedLanguage,
} from "@/lib/detectLanguage";
import { getLanguageTargetPath, getRouteLocaleSegmentFromPathname } from "@/lib/localizedPath";

const DISMISS_KEY_PREFIX = "ergg-locale-recommendation-dismissed";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  Korean: "한국어",
  English: "English",
  Japanese: "日本語",
};

function getBrowserPreferredLanguage(): SupportedLanguage | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return detectFromAcceptLanguage(navigator.languages.join(","));
}

export function LocaleRecommendationBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("header");
  const { language, setLanguage } = useL10n();
  const [recommendedLanguage, setRecommendedLanguage] = React.useState<SupportedLanguage | null>(
    null
  );
  const [dismissed, setDismissed] = React.useState(true);
  const routeLocaleSegment = getRouteLocaleSegmentFromPathname(pathname);

  React.useEffect(() => {
    const browserLanguage = getBrowserPreferredLanguage();

    if (
      routeLocaleSegment ||
      !browserLanguage ||
      browserLanguage === DEFAULT_LANGUAGE ||
      browserLanguage === language
    ) {
      setRecommendedLanguage(null);
      setDismissed(true);
      return;
    }

    const dismissKey = `${DISMISS_KEY_PREFIX}:${browserLanguage}`;
    const hidden = window.sessionStorage.getItem(dismissKey) === "1";

    setRecommendedLanguage(browserLanguage);
    setDismissed(hidden);
  }, [language, routeLocaleSegment]);

  if (!recommendedLanguage || dismissed) {
    return null;
  }

  const dismissKey = `${DISMISS_KEY_PREFIX}:${recommendedLanguage}`;
  const nextPath = getLanguageTargetPath(pathname, recommendedLanguage);

  const handleDismiss = () => {
    window.sessionStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const handleSwitch = () => {
    window.sessionStorage.setItem(dismissKey, "1");
    setLanguage(recommendedLanguage);
    router.push(nextPath);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
          <Globe2 className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="min-w-0 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
          {t("localeRecommendationBody", {
            language: LANGUAGE_LABELS[recommendedLanguage],
          })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleSwitch}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] sm:text-sm"
        >
          {t("localeRecommendationCta")}
        </button>
        <button
          type="button"
          aria-label={t("localeRecommendationDismiss")}
          onClick={handleDismiss}
          className="flex h-8 w-8 items-center justify-center rounded border border-transparent text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
