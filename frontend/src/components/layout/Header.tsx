import Link from "next/link";
import { useTranslations } from "next-intl";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface HeaderProps {
  currentPatch: string;
}

export function Header({ currentPatch }: HeaderProps) {
  const t = useTranslations("header");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[rgba(6,11,24,0.86)] backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:min-h-[78px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5fa8ff,#3266d6)] text-sm font-black text-white shadow-[0_12px_24px_-14px_rgba(96,165,250,0.9)]">
            ER
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--color-foreground)]">{t("logoTitle")}</p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {t("patchPrefix")}
              {currentPatch}
            </p>
          </div>
        </Link>

        <div className="hidden flex-1 lg:flex">
          <CharacterSearchCombobox className="max-w-[34rem]" />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 lg:hidden">
        <CharacterSearchCombobox className="max-w-none" />
      </div>
    </header>
  );
}
