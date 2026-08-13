"use client";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Clock3,
  Gauge,
  Layers,
  Layers3,
  Menu,
  MessageSquarePlus,
  Moon,
  Network,
  NotebookText,
  Search,
  Sun,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocaleRecommendationBanner } from "@/components/layout/LocaleRecommendationBanner";
import { Navigation } from "@/components/layout/Navigation";
import { stripRouteLocaleFromPathname, withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";

interface HeaderProps {
  currentPatch: string;
  patchAnalysisPatch?: string;
}

export function Header({ currentPatch, patchAnalysisPatch }: HeaderProps) {
  const t = useTranslations("header");
  const tHome = useTranslations("home");
  const tNav = useTranslations("navigation");
  const pathname = usePathname();
  const normalizedPathname = stripRouteLocaleFromPathname(pathname);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const patchAnalysisPath = patchAnalysisPatch
    ? `/patch-analysis/${patchAnalysisPatch}`
    : "/patch-analysis";
  const seasonRecapPath = "/season11-recap";
  const showRankCollectionNotice = currentPatch === "12.1";
  const showSeasonRecapBanner = normalizedPathname !== seasonRecapPath;

  const navLinks: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    isActive: boolean;
  }> = [
    {
      href: withCurrentRouteLocale(pathname, "/"),
      label: tNav("metaAnalysis"),
      icon: BarChart3,
      isActive: normalizedPathname === "/",
    },
    {
      href: withCurrentRouteLocale(pathname, "/character/1"),
      label: tNav("characterAnalysis"),
      icon: Search,
      isActive: normalizedPathname.startsWith("/character/"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/synergy-detail"),
      label: tNav("synergyRecommendation"),
      icon: Network,
      isActive: normalizedPathname === "/synergy-detail",
    },
    {
      href: withCurrentRouteLocale(pathname, "/character-lab"),
      label: tNav("characterLab"),
      icon: Layers,
      isActive:
        (normalizedPathname.startsWith("/character-lab") &&
          !normalizedPathname.startsWith("/character-lab/new")) ||
        normalizedPathname === "/lab" ||
        normalizedPathname.startsWith("/lab/"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/patches"),
      label: tNav("patchNotes"),
      icon: NotebookText,
      isActive: normalizedPathname.startsWith("/patches"),
    },
  ];
  const labLinks: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    isActive: boolean;
  }> = [
    {
      href: withCurrentRouteLocale(pathname, "/character-lab/new"),
      label: tNav("characterLabNew"),
      icon: Layers3,
      isActive: normalizedPathname.startsWith("/character-lab/new"),
    },
    {
      href: withCurrentRouteLocale(pathname, patchAnalysisPath),
      label: tNav("patchAnalysisNav"),
      icon: Gauge,
      isActive: normalizedPathname.startsWith("/patch-analysis"),
    },
    {
      href: withCurrentRouteLocale(pathname, seasonRecapPath),
      label: tNav("seasonRecap"),
      icon: Trophy,
      isActive: normalizedPathname === seasonRecapPath,
    },
  ];
  const isLabActive = labLinks.some((link) => link.isActive);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  React.useLayoutEffect(() => {
    const applyTheme = (nextTheme: "light" | "dark") => {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      setTheme(nextTheme);
    };

    const getStoredTheme = () => {
      try {
        const storedTheme = localStorage.getItem("ergg-theme");
        return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
      } catch {
        return null;
      }
    };

    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const storedTheme = getStoredTheme();
      applyTheme(storedTheme ?? (systemThemeQuery.matches ? "dark" : "light"));
    };

    syncTheme();
    systemThemeQuery.addEventListener("change", syncTheme);

    return () => systemThemeQuery.removeEventListener("change", syncTheme);
  }, [pathname]);

  const toggleTheme = () => {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      try {
        localStorage.setItem("ergg-theme", nextTheme);
      } catch {
        // localStorage may be unavailable in private or restricted contexts.
      }
      return nextTheme;
    });
  };

  React.useEffect(() => {
    const handleFeedbackState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setIsFeedbackOpen(Boolean(detail?.open));
    };

    window.addEventListener("ergg:feedback-state", handleFeedbackState);
    return () => window.removeEventListener("ergg:feedback-state", handleFeedbackState);
  }, []);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "site-header sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]",
          normalizedPathname === "/" && "site-header--home"
        )}
      >
        <LocaleRecommendationBanner />

        {showRankCollectionNotice ? (
          <div
            role="status"
            aria-label={tHome("collecting.title")}
            className="site-collection-notice border-b-2 border-[var(--color-warning)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-foreground)] sm:px-4 lg:px-6"
          >
            <div className="mx-auto flex w-full max-w-[1440px] items-start justify-center gap-2.5 sm:items-center">
              <Clock3
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)] sm:mt-0"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-0.5 text-xs leading-5 sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
                <strong className="shrink-0 font-semibold">
                  {tHome("collecting.kicker", { patch: currentPatch })}
                </strong>
                <span className="hidden text-[var(--color-border)] sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {tHome("collectionPolicyNotice")}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {showSeasonRecapBanner && (
          <Link
            href={withCurrentRouteLocale(pathname, seasonRecapPath)}
            className="site-announcement group flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 sm:px-4 lg:px-6"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
                <Trophy className="h-4.5 w-4.5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("seasonRecapBadge")}
                  </span>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t("seasonRecapTitle")}
                  </p>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
                  {t("seasonRecapBody")}
                </p>
              </div>
            </div>

            <span className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)] sm:inline-flex">
              {t("seasonRecapCta")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>
        )}

        <div className="site-header__container mx-auto w-full max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6 lg:py-0">
          <div className="site-header__bar flex min-h-[54px] items-center gap-2.5 lg:min-h-[64px]">
            <button
              type="button"
              aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileMenuOpen((prev) => !prev);
              }}
              className="site-icon-button flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-4.5 w-4.5" strokeWidth={2.2} />
              ) : (
                <Menu className="h-4.5 w-4.5" strokeWidth={2.2} />
              )}
            </button>

            <Link
              href={withCurrentRouteLocale(pathname, "/")}
              title={currentPatch ? `${t("patchPrefix")}${currentPatch}` : t("logoTitle")}
              className="site-wordmark flex min-w-0 items-center gap-2.5"
            >
              <div className="site-wordmark__mark flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-foreground)]">
                ER
              </div>
              <div className="min-w-0">
                <p className="site-wordmark__title truncate text-[1.05rem] font-bold text-[var(--color-foreground)]">
                  {t("logoTitle")}
                </p>
                <p className="site-wordmark__meta hidden truncate text-[11px] text-[var(--color-muted-foreground)] lg:block">
                  {currentPatch ? `${t("patchPrefix")}${currentPatch}` : t("logoSubtitle")}
                </p>
              </div>
            </Link>

            <nav
              aria-label={tNav("ariaMain")}
              className="site-navigation hidden min-w-0 flex-1 items-center gap-1 px-2 lg:flex"
            >
              {navLinks.map(({ href, label, icon: Icon, isActive }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "site-navigation__link inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium xl:px-3 xl:text-[13px]",
                    isActive
                      ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                      : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              ))}

              <details
                className="site-navigation-lab relative shrink-0"
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.currentTarget.removeAttribute("open");
                  event.currentTarget.querySelector("summary")?.focus();
                }}
              >
                <summary
                  aria-current={isLabActive ? "page" : undefined}
                  className={cn(
                    "site-navigation__link inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium xl:px-3 xl:text-[13px]",
                    isLabActive
                      ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                      : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <span>{tNav("lab")}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="site-navigation-lab__chevron h-3.5 w-3.5"
                    strokeWidth={2}
                  />
                </summary>

                <div className="site-navigation-lab__menu">
                  {labLinks.map(({ href, label, icon: Icon, isActive }) => (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) =>
                        event.currentTarget.closest("details")?.removeAttribute("open")
                      }
                      className="site-navigation-lab__item"
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </details>
            </nav>

            <div
              className={cn(
                "site-header-search hidden shrink-0",
                normalizedPathname !== "/" && "lg:block"
              )}
            >
              <CharacterSearchCombobox className="site-header-search__field" />
            </div>

            <div className="ml-auto flex items-center gap-2 lg:gap-3">
              <button
                type="button"
                aria-label={mobileSearchOpen ? t("closeSearch") : t("openSearch")}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileSearchOpen((prev) => !prev);
                }}
                className="site-icon-button flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] lg:hidden"
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

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                aria-pressed={theme === "dark"}
                title={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                className="site-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] lg:h-9 lg:w-9 lg:rounded-md"
              >
                {theme === "dark" ? (
                  <Sun className="h-4.5 w-4.5 lg:h-3.5 lg:w-3.5" strokeWidth={2} />
                ) : (
                  <Moon className="h-4.5 w-4.5 lg:h-3.5 lg:w-3.5" strokeWidth={2} />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event("ergg:feedback-toggle"));
                }}
                aria-controls="feedback-panel"
                aria-expanded={isFeedbackOpen}
                aria-pressed={isFeedbackOpen}
                className={cn(
                  "site-action-button hidden h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium lg:inline-flex",
                  isFeedbackOpen
                    ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                )}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{tNav("feedback")}</span>
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="pt-3 lg:hidden">
              <CharacterSearchCombobox className="max-w-none" />
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="mobile-navigation-backdrop absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t("mobileMenu")}
            className="mobile-navigation-drawer absolute inset-y-0 left-0 flex h-dvh w-[min(21rem,calc(100vw-2rem))] max-w-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <button
              type="button"
              aria-label={t("closeMenu")}
              onClick={() => setMobileMenuOpen(false)}
              className="site-icon-button absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2.2} />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Navigation
                currentPatch={currentPatch}
                patchAnalysisPatch={patchAnalysisPatch}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <LanguageSwitcher />
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                  aria-pressed={theme === "dark"}
                  title={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                  className="site-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4.5 w-4.5" strokeWidth={2} />
                  ) : (
                    <Moon className="h-4.5 w-4.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
