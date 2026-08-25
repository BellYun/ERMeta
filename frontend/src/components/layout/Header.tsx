"use client";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
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
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { resolveAnnouncementCollapsed } from "@/components/layout/announcementScroll";
import { LocaleRecommendationBanner } from "@/components/layout/LocaleRecommendationBanner";
import { Navigation } from "@/components/layout/Navigation";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { Button } from "@/components/ui/button";
import { stripRouteLocaleFromPathname, withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";

interface HeaderProps {
  currentPatch: string;
  patchAnalysisPatch?: string;
}

export function Header({ currentPatch, patchAnalysisPatch }: HeaderProps) {
  const t = useTranslations("header");
  const tNav = useTranslations("navigation");
  const pathname = usePathname();
  const normalizedPathname = stripRouteLocaleFromPathname(pathname);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [announcementCollapsed, setAnnouncementCollapsed] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const patchAnalysisPath = patchAnalysisPatch
    ? `/patch-analysis/${patchAnalysisPatch}`
    : "/patch-analysis";
  const seasonRecapPath = "/season11-recap";
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

  React.useEffect(() => {
    if (!showSeasonRecapBanner) {
      setAnnouncementCollapsed(false);
      return;
    }

    const syncAnnouncement = () => {
      const announcementHasFocus = Boolean(document.activeElement?.closest(".site-announcement"));
      setAnnouncementCollapsed((currentlyCollapsed) =>
        resolveAnnouncementCollapsed({
          currentlyCollapsed,
          scrollY: window.scrollY,
          hasFocus: announcementHasFocus,
        })
      );
    };

    syncAnnouncement();
    window.addEventListener("scroll", syncAnnouncement, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncAnnouncement);
    };
  }, [showSeasonRecapBanner]);

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
        data-announcement-collapsed={announcementCollapsed ? "true" : "false"}
        className={cn(
          "site-header sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]",
          normalizedPathname === "/" && "site-header--home"
        )}
      >
        <LocaleRecommendationBanner />

        {showSeasonRecapBanner && (
          <Link
            href={withCurrentRouteLocale(pathname, seasonRecapPath)}
            prefetch={false}
            className="site-announcement group flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 sm:px-4 lg:px-6"
          >
            <div className="site-announcement__content flex min-w-0 items-center gap-3">
              <span className="site-announcement__icon flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
                <Trophy className="h-4.5 w-4.5" strokeWidth={2} />
              </span>
              <div className="site-announcement__copy min-w-0">
                <div className="site-announcement__meta flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("seasonRecapBadge")}
                  </span>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t("seasonRecapTitle")}
                  </p>
                </div>
                <p className="site-announcement__body mt-0.5 text-xs leading-5 text-[var(--color-muted-foreground)] sm:text-sm">
                  {t("seasonRecapBody")}
                </p>
              </div>
            </div>

            <span className="site-announcement__cta hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)] sm:inline-flex">
              {t("seasonRecapCta")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>
        )}

        <div className="site-header__container mx-auto w-full max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6 lg:py-0">
          <div className="site-header__bar flex min-h-[54px] items-center gap-2.5 lg:min-h-[64px]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileMenuOpen((prev) => !prev);
              }}
              className="site-icon-button h-11 w-11 rounded-[var(--radius-input)] lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-4.5 w-4.5" strokeWidth={2.2} />
              ) : (
                <Menu className="h-4.5 w-4.5" strokeWidth={2.2} />
              )}
            </Button>

            <IntentPrefetchLink
              href={withCurrentRouteLocale(pathname, "/")}
              title={t("logoTitle")}
              className="site-wordmark flex min-w-0 items-center gap-2.5"
            >
              <Image
                src="/brand/ergg-mark.svg"
                alt=""
                width={36}
                height={36}
                className="site-wordmark__mark h-9 w-9 shrink-0"
                priority
              />
              <div className="min-w-0">
                <p className="site-wordmark__title truncate text-[1.05rem] font-bold text-[var(--color-foreground)]">
                  {t("logoTitle")}
                </p>
              </div>
            </IntentPrefetchLink>

            <nav
              aria-label={tNav("ariaMain")}
              className="site-navigation hidden min-w-0 flex-1 items-center gap-1 px-2 lg:flex"
            >
              {navLinks.map(({ href, label, icon: Icon, isActive }) => (
                <IntentPrefetchLink
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
                </IntentPrefetchLink>
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
                    <IntentPrefetchLink
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
                    </IntentPrefetchLink>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={mobileSearchOpen ? t("closeSearch") : t("openSearch")}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileSearchOpen((prev) => !prev);
                }}
                className="site-icon-button h-11 w-11 rounded-[var(--radius-input)] lg:hidden"
              >
                {mobileSearchOpen ? (
                  <X className="h-4.5 w-4.5" strokeWidth={2.2} />
                ) : (
                  <Search className="h-4.5 w-4.5" strokeWidth={2.2} />
                )}
              </Button>

              <div className="hidden lg:block">
                <LanguageSwitcher />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                aria-pressed={theme === "dark"}
                title={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                className="site-icon-button h-11 w-11 shrink-0 rounded-[var(--radius-input)]"
              >
                {theme === "dark" ? (
                  <Sun className="h-4.5 w-4.5 lg:h-3.5 lg:w-3.5" strokeWidth={2} />
                ) : (
                  <Moon className="h-4.5 w-4.5 lg:h-3.5 lg:w-3.5" strokeWidth={2} />
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(new Event("ergg:feedback-toggle"));
                }}
                aria-controls="feedback-panel"
                aria-expanded={isFeedbackOpen}
                aria-pressed={isFeedbackOpen}
                className={cn(
                  "site-action-button hidden h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] px-3 text-xs lg:inline-flex",
                  isFeedbackOpen
                    ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                )}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{tNav("feedback")}</span>
              </Button>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("closeMenu")}
              onClick={() => setMobileMenuOpen(false)}
              className="site-icon-button absolute right-3 top-3 z-10 h-11 w-11 rounded-[var(--radius-input)]"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2.2} />
            </Button>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                  aria-pressed={theme === "dark"}
                  title={theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme")}
                  className="site-icon-button h-11 w-11 shrink-0 rounded-[var(--radius-input)]"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4.5 w-4.5" strokeWidth={2} />
                  ) : (
                    <Moon className="h-4.5 w-4.5" strokeWidth={2} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
