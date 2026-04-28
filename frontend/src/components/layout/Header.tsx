"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface HeaderProps {
  currentPatch: string;
}

export function Header({ currentPatch }: HeaderProps) {
  const t = useTranslations("header");
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[rgba(6,11,24,0.86)] backdrop-blur-xl">
      <div className="px-3 py-3 sm:px-4 lg:px-6 lg:py-0">
        <div className="flex min-h-[54px] items-center gap-3 lg:min-h-[78px]">
          <Link
            href="/"
            title={`${t("patchPrefix")}${currentPatch}`}
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
