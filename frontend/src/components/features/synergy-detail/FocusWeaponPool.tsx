"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap } from "../synergy/constants";
import { matchesChosungSearch } from "../synergy/utils";
import { useTapGuard } from "./useTapGuard";
import { getAllCharWeaponItems, type CharWeaponItem } from "./WeaponAllySelector";

const CELL_MIN_WIDTH = 72;
const ROW_HEIGHT = 72;

const FocusCell = React.memo(function FocusCell({
  item,
  charName,
  selected,
  onSelect,
}: {
  item: CharWeaponItem;
  charName: string;
  selected: boolean;
  onSelect: (charCode: number, weaponCode: number) => void;
}) {
  const { l10n } = useL10n();
  const localizedWeaponLabel = item.weaponCode > 0 ? resolveWeaponName(item.weaponCode, l10n) : "";
  // 가상화 그리드 안의 셀 — onPointerUp 만 두면 스크롤 도중 우연 트리거됨.
  const activate = React.useCallback(
    () => onSelect(item.charCode, item.weaponCode),
    [item.charCode, item.weaponCode, onSelect]
  );
  const tapGuard = useTapGuard(activate);
  return (
    <button
      type="button"
      {...tapGuard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      title={localizedWeaponLabel ? `${charName} (${localizedWeaponLabel})` : charName}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors touch-manipulation",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : "hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80"
      )}
    >
      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(item.charCode)}
          alt={charName}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
        {charName}
      </span>
      {localizedWeaponLabel && (
        <span className="w-full truncate text-center text-[10px] text-[var(--color-muted-foreground)]">
          {localizedWeaponLabel}
        </span>
      )}
    </button>
  );
});

export function FocusWeaponPool() {
  const { l10n } = useL10n();
  const t = useTranslations("focusWeaponPool");
  const { focusCharWeapons, setFocusCharWeapons, toggleFocus } = useFocusCharWeapons();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState(4);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );

  const deferredSearch = React.useDeferredValue(search);
  const filteredItems = React.useMemo(() => {
    if (!deferredSearch.trim()) return getAllCharWeaponItems();
    const q = deferredSearch.trim().toLowerCase();
    return getAllCharWeaponItems().filter((item) => {
      const name = getCharName(item.charCode) ?? "";
      const localizedWeapon =
        item.weaponCode > 0 ? resolveWeaponName(item.weaponCode, l10n).toLowerCase() : "";
      return (
        matchesChosungSearch(name, q) ||
        (item.weaponLabel ?? "").toLowerCase().includes(q) ||
        localizedWeapon.includes(q)
      );
    });
  }, [deferredSearch, getCharName, l10n]);

  const isSelected = React.useCallback(
    (item: CharWeaponItem) =>
      focusCharWeapons.some(
        (f) => f.charCode === item.charCode && f.weaponCode === item.weaponCode
      ),
    [focusCharWeapons]
  );

  React.useEffect(() => {
    if (!isExpanded) return;
    const el = parentRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setColumns(Math.max(1, Math.floor(width / CELL_MIN_WIDTH)));
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, [isExpanded]);

  const rowCount = Math.ceil(filteredItems.length / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const resolveLabel = (f: { charCode: number; weaponCode: number }) => {
    const name = getCharName(f.charCode);
    if (f.weaponCode > 0) {
      const weapon = resolveWeaponName(f.weaponCode, l10n);
      return `${name} (${weapon})`;
    }
    return `${name} (${t("allWeapons")})`;
  };

  // div[role=button] 헤더에 페이지 스크롤 도중 우연 트리거가 일어나지 않도록 가드 적용.
  // (.omc/touch-delay-jscontention-2026-04-15.md — 페이지 전체 스크롤에서도 동일 패턴 발생)
  const toggleExpanded = React.useCallback(() => setIsExpanded((prev) => !prev), []);
  const headerTapGuard = useTapGuard(toggleExpanded);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      {/* 접이식 헤더 — button 중첩 방지를 위해 div+role 사용 */}
      <div
        role="button"
        tabIndex={0}
        {...headerTapGuard}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        aria-expanded={isExpanded}
        style={{ touchAction: "manipulation" }}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-foreground)]">{t("title")}</span>
          {focusCharWeapons.length > 0 && (
            <span className="rounded-full bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              {t("count", { count: focusCharWeapons.length })}
            </span>
          )}
          {focusCharWeapons.length === 0 && (
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{t("hint")}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {focusCharWeapons.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFocusCharWeapons([]);
              }}
              onTouchEnd={(e) => e.stopPropagation()}
              // 헤더 div 가 useTapGuard 로 pointer 단계에서 토글하므로 pointer 단계도 막아야
              // "초기화" 탭이 동시에 헤더 접기/펴기를 트리거하지 않음.
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-[var(--color-surface-2)]"
            >
              {t("reset")}
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
        </div>
      </div>

      {/* 접힌 상태: 선택된 칩 표시 */}
      {!isExpanded && focusCharWeapons.length > 0 && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {focusCharWeapons.map((f) => (
            <button
              key={`${f.charCode}-${f.weaponCode}`}
              onClick={() => toggleFocus(f.charCode, f.weaponCode)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-1.5 min-h-[44px] text-[10px] text-[var(--color-foreground)] hover:bg-[var(--color-primary)]/20 active:bg-[var(--color-primary)]/30 transition-colors"
            >
              <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
                <Image
                  src={getCharacterMiniWebpUrl(f.charCode)}
                  alt={getCharName(f.charCode)}
                  fill
                  className="object-cover"
                  sizes="16px"
                />
              </span>
              <span className="max-w-20 truncate">{resolveLabel(f)}</span>
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      {/* 펼친 상태: 검색 + 가상화 그리드 */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-7 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              {t("noResults")}
            </p>
          ) : (
            <div
              ref={parentRef}
              className="overflow-y-auto pr-0.5"
              style={{ maxHeight: "340px", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const startIndex = virtualRow.index * columns;
                  const rowItems = filteredItems.slice(startIndex, startIndex + columns);
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        transform: `translateY(${virtualRow.start}px)`,
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: "4px",
                      }}
                    >
                      {rowItems.map((item) => (
                        <FocusCell
                          key={`${item.charCode}-${item.weaponCode}`}
                          item={item}
                          charName={getCharName(item.charCode)}
                          selected={isSelected(item)}
                          onSelect={toggleFocus}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
