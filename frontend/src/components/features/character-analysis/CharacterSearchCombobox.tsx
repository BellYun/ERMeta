"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { analytics } from "@/lib/analytics";
import {
  buildFallbackMap,
  getCharacterImageUrl,
  getCharacterName,
  resolveCharacterName,
} from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { CHARACTER_CODES } from "./constants";

const FALLBACK_MAP = buildFallbackMap();

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const CHOSUNG_SET = new Set(CHOSUNG);

function getChosung(str: string): string {
  return [...str]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return ch;
      return CHOSUNG[Math.floor(code / 588)];
    })
    .join("");
}

function isChosungOnly(str: string): boolean {
  return [...str].every((ch) => CHOSUNG_SET.has(ch));
}

function matchesQuery(name: string, query: string): boolean {
  if (isChosungOnly(query)) {
    return getChosung(name).includes(query);
  }
  return name.includes(query);
}

interface CharacterSearchComboboxProps {
  currentCode?: number | null;
  scroll?: boolean;
  className?: string;
}

export function CharacterSearchCombobox({
  currentCode,
  scroll = true,
  className,
}: CharacterSearchComboboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { l10n } = useL10n();
  const t = useTranslations("characterPicker");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const routeCharacterCode = React.useMemo(() => {
    const match = pathname.match(/^\/character\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [pathname]);

  const activeCode = currentCode ?? routeCharacterCode;

  const getDisplayName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  );

  const sortedCodes = React.useMemo(
    () => [...CHARACTER_CODES].sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [getDisplayName]
  );

  const filtered = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return sortedCodes;
    return sortedCodes.filter((code) => matchesQuery(getDisplayName(code), trimmed));
  }, [getDisplayName, query, sortedCodes]);

  const select = React.useCallback(
    (code: number) => {
      setQuery("");
      setOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
      router.push(`/character/${code}`, { scroll });
      analytics.characterViewed(code, getCharacterName(code));
    },
    [router, scroll]
  );

  React.useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  React.useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const element = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    element?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open && event.key !== "Escape") {
      setOpen(true);
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (filtered.length > 0) {
          setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (filtered.length > 0) {
          setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        }
        break;
      case "Enter":
        event.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          select(filtered[highlightIndex]);
        } else if (filtered.length === 1) {
          select(filtered[0]);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-[420px]", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && highlightIndex >= 0 && filtered[highlightIndex] !== undefined
              ? `${listboxId}-option-${filtered[highlightIndex]}`
              : undefined
          }
          aria-autocomplete="list"
          aria-label={t("searchAria")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className={cn(
            "w-full rounded-[18px] border bg-[rgba(17,25,46,0.72)] py-3 pl-10 pr-4 text-sm text-[var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            "placeholder:text-[var(--color-muted-foreground)]",
            "outline-none transition-all",
            open
              ? "rounded-b-[0px] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
          )}
        />
      </div>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("listAria")}
          className="absolute top-full right-0 z-50 max-h-[320px] w-full overflow-y-auto rounded-b-[18px] border border-t-0 border-[var(--color-primary)] bg-[rgba(15,23,42,0.98)] shadow-[0_28px_60px_-36px_rgba(0,0,0,0.9)]"
        >
          {filtered.length === 0 ? (
            <div
              className="px-4 py-6 text-center text-xs text-[var(--color-muted-foreground)]"
              role="status"
            >
              {t("noResults")}
            </div>
          ) : (
            filtered.map((code, index) => (
              <button
                key={code}
                id={`${listboxId}-option-${code}`}
                role="option"
                aria-selected={code === activeCode}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(code);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                  code === activeCode && "bg-[var(--color-primary)]/5",
                  highlightIndex === index
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                )}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                  <Image
                    src={getCharacterImageUrl(code)}
                    alt={getDisplayName(code)}
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized
                  />
                </div>
                <span
                  className={cn(
                    "font-medium",
                    code === activeCode && "text-[var(--color-primary)]"
                  )}
                >
                  {getDisplayName(code)}
                </span>
                {code === activeCode && (
                  <span className="ml-auto text-[10px] font-medium text-[var(--color-primary)]">
                    {t("current")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
