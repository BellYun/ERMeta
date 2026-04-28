"use client";

import { ArrowRight, Search, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface HeaderProps {
  currentPatch: string;
}

export function Header({ currentPatch }: HeaderProps) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const showSeasonRecapBanner = !pathname.startsWith("/season10-recap");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[rgba(6,11,24,0.86)] backdrop-blur-xl">
      {showSeasonRecapBanner && (
        <Link
          href="/season10-recap"
          className="group flex items-center justify-between gap-3 border-b border-[rgba(251,191,36,0.16)] bg-[linear-gradient(90deg,rgba(251,191,36,0.12),rgba(96,165,250,0.08))] px-3 py-2.5 transition-colors hover:bg-[linear-gradient(90deg,rgba(251,191,36,0.16),rgba(96,165,250,0.12))] sm:px-4 lg:px-6"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.12)] text-[var(--color-accent-gold)]">
              <Trophy className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-gold)]">
                  {t("seasonRecapBadge")}
                </span>
                <p className="text-sm font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                  {t("seasonRecapTitle")}
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--color-foreground)]/76 sm:text-sm">
                {t("seasonRecapBody")}
              </p>
            </div>
          </div>

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)] transition group-hover:border-[rgba(255,255,255,0.14)] group-hover:bg-[rgba(255,255,255,0.08)] sm:inline-flex">
            {t("seasonRecapCta")}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>
      )}

      <div className="px-3 py-3 sm:px-4 lg:px-6 lg:py-0">
        <div className="flex min-h-[54px] items-center gap-3 lg:min-h-[78px]">
          <Link
            href="/"
            title={currentPatch ? `${t("patchPrefix")}${currentPatch}` : t("logoTitle")}
            className="flex items-center gap-3 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5fa8ff,#3266d6)] text-sm font-black text-white shadow-[0_12px_24px_-14px_rgba(96,165,250,0.9)]">
              ER
            </div>
            <div className="min-w-0">
              <p className="text-[1.05rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
                {t("logoTitle")}
              </p>
            </div>
          </Link>

          <div className="hidden flex-1 lg:flex">
            <CharacterSearchCombobox className="max-w-[34rem]" />
          </div>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              aria-label={mobileSearchOpen ? t("closeSearch") : t("openSearch")}
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.05)] lg:hidden"
            >
              {mobileSearchOpen ? (
                <X className="h-4.5 w-4.5" strokeWidth={2.2} />
              ) : (
                <Search className="h-4.5 w-4.5" strokeWidth={2.2} />
              )}
            </button>

            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="pt-3 lg:hidden">
            <CharacterSearchCombobox className="max-w-none" />
          </div>
        )}
      </div>
    </header>
  );
}
