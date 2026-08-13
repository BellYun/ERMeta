"use client";

import {
  BarChart3,
  Gauge,
  Layers,
  Layers3,
  Network,
  NotebookText,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { useL10n } from "@/components/L10nProvider";
import { buildFallbackMap, getCharacterImageUrl, resolveCharacterName } from "@/lib/characterMap";
import { withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";

const FALLBACK_MAP = buildFallbackMap();

interface SiteCommandPaletteProps {
  patchAnalysisPatch?: string;
  className?: string;
}

interface CommandItem {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  image?: string;
}

export function SiteCommandPalette({ patchAnalysisPatch, className }: SiteCommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { l10n } = useL10n();
  const tHeader = useTranslations("header");
  const tNav = useTranslations("navigation");
  const tCharacter = useTranslations("characterPicker");
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);

  const patchAnalysisPath = patchAnalysisPatch
    ? `/patch-analysis/${patchAnalysisPatch}`
    : "/patch-analysis";

  const navigationItems = React.useMemo<CommandItem[]>(
    () => [
      {
        key: "meta",
        label: tNav("metaAnalysis"),
        href: withCurrentRouteLocale(pathname, "/"),
        icon: BarChart3,
      },
      {
        key: "character",
        label: tNav("characterAnalysis"),
        href: withCurrentRouteLocale(pathname, "/character/1"),
        icon: Search,
      },
      {
        key: "synergy",
        label: tNav("synergyRecommendation"),
        href: withCurrentRouteLocale(pathname, "/synergy-detail"),
        icon: Network,
      },
      {
        key: "lab",
        label: tNav("characterLab"),
        href: withCurrentRouteLocale(pathname, "/character-lab"),
        icon: Layers,
      },
      {
        key: "composition-lab",
        label: tNav("characterCompositionLab"),
        href: withCurrentRouteLocale(pathname, "/composition-lab"),
        icon: Layers3,
      },
      {
        key: "character-lab-new",
        label: tNav("characterLabNew"),
        href: withCurrentRouteLocale(pathname, "/character-lab/new"),
        icon: Layers3,
      },
      {
        key: "patches",
        label: tNav("patchNotes"),
        href: withCurrentRouteLocale(pathname, "/patches"),
        icon: NotebookText,
      },
      {
        key: "patch-analysis",
        label: tNav("patchAnalysisNav"),
        href: withCurrentRouteLocale(pathname, patchAnalysisPath),
        icon: Gauge,
      },
      {
        key: "season",
        label: tNav("seasonRecap"),
        href: withCurrentRouteLocale(pathname, "/season11-recap"),
        icon: Trophy,
      },
    ],
    [patchAnalysisPath, pathname, tNav]
  );

  const characterItems = React.useMemo<CommandItem[]>(
    () =>
      CHARACTER_CODES.map((code) => ({
        key: `character-${code}`,
        label: resolveCharacterName(code, l10n, FALLBACK_MAP),
        href: withCurrentRouteLocale(pathname, `/character/${code}`),
        image: getCharacterImageUrl(code),
      })),
    [l10n, pathname]
  );

  const results = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return navigationItems;

    const matchingNavigation = navigationItems.filter((item) =>
      item.label.toLocaleLowerCase().includes(normalized)
    );
    const matchingCharacters = characterItems
      .filter((item) => item.label.toLocaleLowerCase().includes(normalized))
      .slice(0, 10);

    return [...matchingNavigation, ...matchingCharacters];
  }, [characterItems, navigationItems, query]);

  const openPalette = React.useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setIsOpen(true);
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closePalette = React.useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        if (dialogRef.current?.open) closePalette();
        else openPalette();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closePalette, openPalette]);

  const navigate = React.useCallback(
    (item: CommandItem) => {
      closePalette();
      router.push(item.href);
    },
    [closePalette, router]
  );

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={tHeader("openSearch")}
        className={cn("command-trigger", className)}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="command-trigger__label">{tCharacter("placeholder")}</span>
        <span className="command-trigger__keys" aria-hidden="true">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="command-dialog"
        aria-label={tHeader("openSearch")}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePalette();
        }}
      >
        <div className="command-dialog__panel">
          <div className="command-dialog__field">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    results.length === 0 ? 0 : (current + 1) % results.length
                  );
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    results.length === 0 ? 0 : (current - 1 + results.length) % results.length
                  );
                }
                if (event.key === "Enter" && results[activeIndex]) {
                  event.preventDefault();
                  navigate(results[activeIndex]);
                }
              }}
              placeholder={tCharacter("placeholder")}
              aria-label={tCharacter("searchAria")}
              aria-controls="site-command-results"
              aria-activedescendant={results[activeIndex]?.key}
            />
            <kbd className="command-dialog__escape">esc</kbd>
          </div>

          <div id="site-command-results" className="command-dialog__results" role="listbox">
            {results.length === 0 ? (
              <p className="command-dialog__empty" role="status">
                {tCharacter("noResults")}
              </p>
            ) : (
              results.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    id={item.key}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className="command-dialog__item"
                    data-active={index === activeIndex ? "true" : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigate(item)}
                  >
                    <span className="command-dialog__item-icon">
                      {item.image ? (
                        <Image src={item.image} alt="" width={32} height={32} unoptimized />
                      ) : Icon ? (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="command-dialog__footer" aria-hidden="true">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
            </span>
            <span>
              <kbd>↵</kbd>
            </span>
            <span>
              <kbd>esc</kbd>
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
