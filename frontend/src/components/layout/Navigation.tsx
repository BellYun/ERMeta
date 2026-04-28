"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const navLinks = [
    { href: "/", label: t("metaAnalysis") },
    { href: "/synergy-detail", label: t("synergyRecommendation") },
    { href: "/character/1", label: t("characterAnalysis") },
  ];

  return (
    <nav aria-label={t("ariaMain")} className="flex items-center gap-1">
      {navLinks.map(({ href, label }) => {
        const isActive = href.startsWith("/character/")
          ? pathname.startsWith("/character/")
          : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
