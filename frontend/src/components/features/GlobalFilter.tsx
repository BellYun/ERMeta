"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useFilter } from "./FilterContext";

export function GlobalFilter() {
  const { patch, tier, patches, setPatch, setTier } = useFilter();
  const mobileTierRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const desktopTierRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const t = useTranslations("globalFilter");
  const tierOptions = React.useMemo(
    () => [
      { value: "DIAMOND", label: t("tiers.DIAMOND") },
      { value: "METEORITE", label: t("tiers.METEORITE") },
      { value: "MITHRIL", label: t("tiers.MITHRIL") },
    ],
    [t]
  );

  const selectTier = React.useCallback(
    (value: string) => {
      setTier(value);
      analytics.tierGroupSelected(value);
    },
    [setTier]
  );

  const focusTierAt = React.useCallback(
    (index: number) => {
      const normalized = (index + tierOptions.length) % tierOptions.length;
      const next = tierOptions[normalized];
      if (!next) return;
      const refs = window.innerWidth < 640 ? mobileTierRefs.current : desktopTierRefs.current;
      refs[normalized]?.focus();
      selectTier(next.value);
    },
    [selectTier, tierOptions]
  );

  const handleTierKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusTierAt(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusTierAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusTierAt(0);
        break;
      case "End":
        e.preventDefault();
        focusTierAt(tierOptions.length - 1);
        break;
    }
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 sm:hidden">
        <div className="relative min-w-0">
          <select
            aria-label={t("patchAria")}
            value={patch || patches[0] || ""}
            onChange={(e) => {
              setPatch(e.target.value);
              analytics.patchSelected(e.target.value);
            }}
            className={cn(
              "h-14 w-full appearance-none rounded-[18px] border border-[var(--color-border)] bg-[rgba(17,25,46,0.82)] px-3 pr-8 text-[13px] font-medium text-[var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
              "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30"
            )}
          >
            {patches.map((p) => (
              <option key={p} value={p}>
                {t("patchOption", { patch: p })}
              </option>
            ))}
            {patches.length === 0 && (
              <option value="" disabled>
                {t("noPatch")}
              </option>
            )}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label={t("tierAria")}
          aria-orientation="horizontal"
          className="col-span-3 grid grid-cols-3 gap-2"
        >
          {tierOptions.map(({ value, label }, index) => {
            const isSelected = tier === value;
            return (
              <button
                key={value}
                ref={(el) => {
                  mobileTierRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectTier(value)}
                onKeyDown={(e) => handleTierKeyDown(e, index)}
                className={cn(
                  "flex h-14 min-w-0 items-center justify-center rounded-[18px] border px-2 text-center text-[12px] font-medium leading-4 tracking-[-0.02em] transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50",
                  isSelected
                    ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[0_18px_30px_-24px_rgba(96,165,250,0.9)]"
                    : "border-[var(--color-border)] bg-[rgba(17,25,46,0.82)] text-[var(--color-muted-foreground)]"
                )}
              >
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden flex-col gap-2.5 sm:flex sm:flex-row sm:items-center sm:gap-3">
        <div className="relative">
          <select
            aria-label={t("patchAria")}
            value={patch || patches[0] || ""}
            onChange={(e) => {
              setPatch(e.target.value);
              analytics.patchSelected(e.target.value);
            }}
            className={cn(
              "appearance-none w-full sm:w-auto",
              "px-3 py-2 pr-8",
              "rounded-lg",
              "bg-[var(--color-surface-2)] border border-[var(--color-border)]",
              "text-sm font-medium text-[var(--color-foreground)]",
              "hover:border-[var(--color-border-light)]",
              "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30",
              "transition-all cursor-pointer"
            )}
          >
            {patches.map((p) => (
              <option key={p} value={p}>
                {t("patchOption", { patch: p })}
              </option>
            ))}
            {patches.length === 0 && (
              <option value="" disabled>
                {t("noPatch")}
              </option>
            )}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg
              className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label={t("tierAria")}
          aria-orientation="horizontal"
          className="flex rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] p-0.5"
        >
          {tierOptions.map(({ value, label }, index) => {
            const isSelected = tier === value;
            return (
              <button
                key={value}
                ref={(el) => {
                  desktopTierRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectTier(value)}
                onKeyDown={(e) => handleTierKeyDown(e, index)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap",
                  "min-h-[32px] touch-manipulation",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50",
                  isSelected
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
