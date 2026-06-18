"use client";

import {
  BarChart3,
  FlaskConical,
  Gauge,
  Layers,
  MessageSquarePlus,
  Network,
  NotebookText,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
      href: withCurrentRouteLocale(pathname, "/trio-lab"),
      label: t("trioLab"),
      icon: FlaskConical,
      isActive: normalizedPathname.startsWith("/trio-lab"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/character-lab"),
      label: t("characterLab"),
      icon: Layers,
      isActive:
        normalizedPathname.startsWith("/character-lab") ||
        normalizedPathname === "/lab" ||
        normalizedPathname.startsWith("/lab/"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/patches"),
      label: t("patchNotes"),
      icon: NotebookText,
      isActive: normalizedPathname.startsWith("/patches"),
    },
    {
      href: withCurrentRouteLocale(pathname, patchAnalysisPath),
      label: t("patchAnalysisNav"),
      icon: Gauge,
      isActive: normalizedPathname.startsWith("/patch-analysis"),
    },
    {
      href: withCurrentRouteLocale(pathname, "/season10-recap"),
      label: t("seasonRecap"),
      icon: Trophy,
      isActive: normalizedPathname.startsWith("/season10-recap"),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white px-4 py-5">
      <Link
        href={withCurrentRouteLocale(pathname, "/")}
        onClick={onNavigate}
        className="flex items-center gap-3 px-2"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-sm font-bold text-[var(--color-primary)]">
          ER
        </div>
        <div className="min-w-0">
          <p className="text-[1.25rem] font-bold text-[var(--color-foreground)]">
            {tHeader("logoTitle")}
          </p>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            {tHeader("logoSubtitle")}
          </p>
        </div>
      </Link>

      <nav aria-label={t("ariaMain")} className="mt-6 flex flex-1 flex-col gap-2">
        {navLinks.map((link) => {
          const { href, label, icon: Icon, isActive } = link;
          const badge = "badge" in link ? link.badge : undefined;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-[rgba(37,99,235,0.24)] bg-[rgba(37,99,235,0.08)] text-[var(--color-foreground)]"
                  : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                  isActive
                    ? "border-[rgba(37,99,235,0.22)] bg-white text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <span className="">{label}</span>
              {badge && (
                <span className="ml-auto text-[9px] font-semibold text-[var(--color-muted-foreground)]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {currentPatch ? (
            <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
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
              "flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium transition-colors",
              isFeedbackOpen
                ? "border-[rgba(37,99,235,0.24)] bg-[rgba(37,99,235,0.08)] text-[var(--color-foreground)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                isFeedbackOpen
                  ? "border-[rgba(37,99,235,0.22)] bg-white text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
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
