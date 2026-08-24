"use client";

import {
  BarChart3,
  Gauge,
  Layers,
  Layers3,
  MessageSquarePlus,
  Network,
  NotebookText,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { stripRouteLocaleFromPathname, withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPatch: string;
  patchAnalysisPatch?: string;
  onNavigate?: () => void;
}

interface NavigationLink {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: string;
}

export function Navigation({ currentPatch, patchAnalysisPatch, onNavigate }: NavigationProps) {
  const pathname = usePathname();
  const normalizedPathname = stripRouteLocaleFromPathname(pathname);
  const patchAnalysisPath = patchAnalysisPatch
    ? `/patch-analysis/${patchAnalysisPatch}`
    : "/patch-analysis";
  const seasonRecapPath = "/season11-recap";
  const t = useTranslations("navigation");
  const tHeader = useTranslations("header");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    const handleFeedbackState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setIsFeedbackOpen(Boolean(detail?.open));
    };

    window.addEventListener("ergg:feedback-state", handleFeedbackState);
    return () => window.removeEventListener("ergg:feedback-state", handleFeedbackState);
  }, []);

  const navLinks: NavigationLink[] = [
    {
      href: withCurrentRouteLocale(pathname, "/"),
      label: t("metaAnalysis"),
      icon: BarChart3,
      isActive: normalizedPathname === "/",
    },
    {
      href: withCurrentRouteLocale(pathname, "/character/1"),
      label: t("characterAnalysis"),
      icon: Search,
      isActive: normalizedPathname.startsWith("/character/"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/synergy-detail"),
      label: t("synergyRecommendation"),
      icon: Network,
      isActive: normalizedPathname === "/synergy-detail",
    },
    {
      href: withCurrentRouteLocale(pathname, "/character-lab"),
      label: t("characterLab"),
      icon: Layers,
      isActive:
        (normalizedPathname.startsWith("/character-lab") &&
          !normalizedPathname.startsWith("/character-lab/new")) ||
        normalizedPathname === "/lab" ||
        normalizedPathname.startsWith("/lab/"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/patches"),
      label: t("patchNotes"),
      icon: NotebookText,
      isActive: normalizedPathname.startsWith("/patches"),
    },
  ];
  const labLinks: NavigationLink[] = [
    {
      href: withCurrentRouteLocale(pathname, "/character-lab/new"),
      label: t("characterLabNew"),
      icon: Layers3,
      isActive: normalizedPathname.startsWith("/character-lab/new"),
    },
    {
      href: withCurrentRouteLocale(pathname, patchAnalysisPath),
      label: t("patchAnalysisNav"),
      icon: Gauge,
      isActive: normalizedPathname.startsWith("/patch-analysis"),
    },
    {
      href: withCurrentRouteLocale(pathname, seasonRecapPath),
      label: t("seasonRecap"),
      icon: Trophy,
      isActive: normalizedPathname === seasonRecapPath,
    },
  ];

  const renderNavigationLink = (link: NavigationLink) => {
    const { href, label, icon: Icon, isActive, badge } = link;
    return (
      <IntentPrefetchLink
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors",
          isActive
            ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
            : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded border transition-colors",
            isActive
              ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <span>{label}</span>
        {badge && (
          <span className="ml-auto text-[9px] font-semibold text-[var(--color-muted-foreground)]">
            {badge}
          </span>
        )}
      </IntentPrefetchLink>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-surface)] px-4 py-5">
      <IntentPrefetchLink
        href={withCurrentRouteLocale(pathname, "/")}
        onClick={onNavigate}
        className="flex items-center gap-3 px-2"
      >
        <Image
          src="/brand/ergg-mark.svg"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0"
          priority
        />
        <div className="min-w-0">
          <p className="text-[1.25rem] font-bold text-[var(--color-foreground)]">
            {tHeader("logoTitle")}
          </p>
        </div>
      </IntentPrefetchLink>

      <nav aria-label={t("ariaMain")} className="mt-6 flex flex-1 flex-col gap-2">
        {navLinks.map(renderNavigationLink)}

        <section
          aria-labelledby="mobile-navigation-lab-title"
          className="mt-3 border-t border-[var(--color-border)] pt-4"
        >
          <h2
            id="mobile-navigation-lab-title"
            className="px-4 text-[11px] font-semibold tracking-wide text-[var(--color-muted-foreground)]"
          >
            {t("lab")}
          </h2>
          <div className="mt-2 flex flex-col gap-2">{labLinks.map(renderNavigationLink)}</div>
        </section>

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {currentPatch ? (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {t("patchPanel", { patch: currentPatch })}
                </p>
                <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
                  <span className="text-xs">⌄</span>
                  <span className="text-xs">⌃</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span>{t("updateStatus")}</span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              window.dispatchEvent(new Event("ergg:feedback-toggle"));
            }}
            aria-controls="feedback-panel"
            aria-expanded={isFeedbackOpen}
            aria-pressed={isFeedbackOpen}
            className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors",
              isFeedbackOpen
                ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded border transition-colors",
                isFeedbackOpen
                  ? "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
              )}
            >
              <MessageSquarePlus className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span>{t("feedback")}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
