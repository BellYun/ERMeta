"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const pathname = usePathname();
  const t = useTranslations("mobileTab");
  const tabs = [
    {
      href: "/",
      label: t("meta"),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
      ),
    },
    {
      href: "/synergy-detail",
      label: t("synergy"),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      ),
    },
    {
      href: "/character/1",
      label: t("character"),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      ),
    },
    {
      href: "/patches",
      label: t("patches"),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-9 8.25h12a2.25 2.25 0 0 0 2.25-2.25V6.108c0-.884-.52-1.685-1.326-2.042l-6-2.667a2.25 2.25 0 0 0-1.848 0l-6 2.667A2.25 2.25 0 0 0 3.75 6.108v9.642A2.25 2.25 0 0 0 6 18Z"
          />
        </svg>
      ),
    },
    {
      href: "/season10-recap",
      label: t("recap"),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 18.75h-9a2.25 2.25 0 0 1-2.25-2.25V5.708c0-.844.474-1.616 1.226-1.997l4.5-2.286a2.25 2.25 0 0 1 2.048 0l4.5 2.286A2.25 2.25 0 0 1 19.25 5.708V16.5a2.25 2.25 0 0 1-2.25 2.25Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.75h6M9 12.75h6M10.5 6.75h3" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 lg:hidden">
      <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(8,13,27,0.92)] px-2 py-2 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        <div className="flex items-stretch gap-1.5">
          {tabs.map(({ href, label, icon }) => {
            const isActive = href.startsWith("/character/")
              ? pathname.startsWith("/character/")
              : href === "/patches"
                ? pathname.startsWith("/patches")
                : href === "/season10-recap"
                  ? pathname.startsWith("/season10-recap")
                  : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2.5 touch-manipulation transition-all",
                  isActive
                    ? "border border-[rgba(96,165,250,0.28)] bg-[linear-gradient(180deg,rgba(26,43,81,0.96),rgba(15,26,52,0.96))] text-[var(--color-primary)] shadow-[0_18px_30px_-24px_rgba(96,165,250,0.92)]"
                    : "border border-transparent text-[var(--color-muted-foreground)] active:border-[var(--color-border)] active:bg-[rgba(255,255,255,0.04)] active:text-[var(--color-foreground)]"
                )}
              >
                {icon}
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-[-0.02em]",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
