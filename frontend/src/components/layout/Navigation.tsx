"use client";

import { BarChart3, MessageSquarePlus, Network, NotebookText, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPatch: string;
  onNavigate?: () => void;
}

export function Navigation({ currentPatch, onNavigate }: NavigationProps) {
  const pathname = usePathname();
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

  const navLinks = [
    {
      href: "/",
      label: t("metaAnalysis"),
      icon: BarChart3,
      isActive: pathname === "/",
    },
    {
      href: "/synergy-detail",
      label: t("synergyRecommendation"),
      icon: Network,
      isActive: pathname === "/synergy-detail",
    },
    {
      href: "/character/1",
      label: t("characterAnalysis"),
      icon: Search,
      isActive: pathname.startsWith("/character/"),
    },
    {
      href: "/patches",
      label: t("patchNotes"),
      icon: NotebookText,
      isActive: pathname.startsWith("/patches"),
    },
    {
      href: "/season10-recap",
      label: t("seasonRecap"),
      icon: Trophy,
      isActive: pathname.startsWith("/season10-recap"),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(7,13,29,0.96),rgba(8,12,26,0.96))] px-4 py-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5fa8ff,#3266d6)] text-sm font-black text-white shadow-[0_14px_30px_-16px_rgba(96,165,250,1)]">
          ER
        </div>
        <div className="min-w-0">
          <p className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
            {tHeader("logoTitle")}
          </p>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            {tHeader("logoSubtitle")}
          </p>
        </div>
      </Link>

      <nav aria-label={t("ariaMain")} className="mt-6 flex flex-1 flex-col gap-2">
        {navLinks.map(({ href, label, icon: Icon, isActive }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium transition-all",
              isActive
                ? "border-[rgba(96,165,250,0.38)] bg-[linear-gradient(180deg,rgba(28,48,88,0.88),rgba(17,30,58,0.88))] text-[var(--color-foreground)] shadow-[0_18px_32px_-20px_rgba(96,165,250,0.85)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[rgba(17,25,46,0.72)] hover:text-[var(--color-foreground)]"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                isActive
                  ? "border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.14)] text-[var(--color-primary)]"
                  : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span className="tracking-[-0.02em]">{label}</span>
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(16,24,44,0.84)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {currentPatch ? t("patchPanel", { patch: currentPatch }) : t("patchPanelFallback")}
              </p>
              <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
                <span className="text-xs">⌄</span>
                <span className="text-xs">⌃</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
              <span>{t("updateStatus")}</span>
            </div>
          </div>

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
                ? "border-[rgba(96,165,250,0.34)] bg-[linear-gradient(180deg,rgba(28,48,88,0.88),rgba(17,30,58,0.88))] text-[var(--color-foreground)] shadow-[0_18px_32px_-20px_rgba(96,165,250,0.7)]"
                : "border-[var(--color-border)] bg-[rgba(14,20,36,0.9)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[rgba(21,31,54,0.94)]"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                isFeedbackOpen
                  ? "border-[rgba(96,165,250,0.28)] bg-[rgba(96,165,250,0.14)] text-[var(--color-primary)]"
                  : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[var(--color-muted-foreground)]"
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
