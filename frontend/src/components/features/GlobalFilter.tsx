"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useFilter } from "./FilterContext";

export function GlobalFilter() {
  const { patch, tier, patches, setPatch, setTier } = useFilter();
  const [selectedTier, setSelectedTier] = React.useState(tier);
  const mobileTierRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const desktopTierRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const t = useTranslations("globalFilter");
  const tierOptions = React.useMemo(
    () => [
      { value: "DIAMOND", label: t("tiers.DIAMOND") },
      { value: "DIAMOND_PLUS", label: `${t("tiers.DIAMOND")}+` },
      { value: "METEORITE", label: t("tiers.METEORITE") },
      { value: "METEORITE_PLUS", label: `${t("tiers.METEORITE")}+` },
      { value: "MITHRIL_PLUS", label: `${t("tiers.MITHRIL")}+` },
    ],
    [t]
  );

  React.useEffect(() => {
    setSelectedTier(tier);
  }, [tier]);

  const selectTier = React.useCallback(
    (value: string) => {
      setSelectedTier(value);
      React.startTransition(() => setTier(value));
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
      <div className="grid grid-cols-4 gap-1.5 sm:hidden">
        <div className="relative min-w-0">
          <select
            aria-label={t("patchAria")}
            value={patch || patches[0] || ""}
            onChange={(e) => {
              setPatch(e.target.value);
              analytics.patchSelected(e.target.value);
            }}
            className={cn(
              "h-12 w-full appearance-none rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 pr-6 font-mono text-[12px] font-bold text-[var(--color-foreground)]",
              "focus:outline-none focus:border-[var(--color-accent)]"
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
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
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
          className="col-span-3 grid grid-cols-3 gap-1.5"
        >
          {tierOptions.map(({ value, label }, index) => {
            const isSelected = selectedTier === value;
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
                className="dashboard-tab h-12 min-w-0 px-2 text-center text-[12px] leading-4"
                data-active={isSelected ? "true" : undefined}
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
              "px-3 py-1.5 pr-8",
              "rounded-[5px]",
              "bg-[var(--color-surface-2)] border border-[var(--color-border)]",
              "font-mono text-sm font-bold text-[var(--color-foreground)]",
              "hover:border-[var(--color-border-light)]",
              "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
              "transition-colors cursor-pointer"
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
          className="flex rounded-[5px] bg-[var(--color-surface-2)] border border-[var(--color-border)] p-0.5"
        >
          {tierOptions.map(({ value, label }, index) => {
            const isSelected = selectedTier === value;
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
                className="dashboard-tab min-h-[32px] whitespace-nowrap px-3 py-1.5 text-xs sm:text-[13px]"
                data-active={isSelected ? "true" : undefined}
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
