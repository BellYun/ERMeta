import { Bell, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

        <div className="hidden lg:flex flex-1">
          <div className="flex w-full max-w-[34rem] items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-[rgba(17,25,46,0.82)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {t("searchPlaceholder")}
            </span>
            <span className="ml-auto rounded-md border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
              {t("searchShortcut")}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            aria-label={t("notificationsAria")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[rgba(17,25,46,0.72)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(26,38,66,0.82)]"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[rgba(17,25,46,0.78)] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(90,120,170,0.88),rgba(38,52,88,0.92))] text-xs font-bold text-white">
              ER
            </div>
            <div className="hidden xl:block min-w-0">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {t("profileLabel")}
              </p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                {t("patchPrefix")}
                {currentPatch}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 lg:hidden">
        <div className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-[rgba(17,25,46,0.82)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {t("searchPlaceholder")}
          </span>
        </div>
      </div>
    </header>
  );
}
