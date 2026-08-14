"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { X, Search } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import characterBestWeapons from "@/../const/characterBestWeapons.json";
import { useL10n } from "@/components/L10nProvider";
import { resolveCharacterName, getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { getWeaponGroupImageUrl, resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap, EXCLUDED_CHARACTER_CODES } from "../synergy/constants";
import { SlotEmpty } from "../synergy/SlotEmpty";
import { matchesChosungSearch } from "../synergy/utils";
import {
  type AllySelection,
  type AllySelectionPair,
  useSynergyDetailSelection,
  useSynergyDetailSelectionStoreApi,
} from "./SynergyDetailSelectionStore";
import { useTapGuard } from "./useTapGuard";

export { parseAllyFromParams } from "./SynergyDetailSelectionStore";
export type { AllySelection } from "./SynergyDetailSelectionStore";

// ─── 데이터 ──────────────────────────────────────────────────────────────────

const weaponData = characterBestWeapons as Record<
  string,
  { weaponCode: number; label: string; isDefault: boolean }[]
>;

export interface CharWeaponItem {
  charCode: number;
  weaponCode: number;
  weaponLabel: string;
}

/** 무기 분류하지 않는 실험체 (알렉스 등) */
const SINGLE_ENTRY_CHARS = new Set([27]);

/**
 * 실험체+무기 플랫 리스트 (가나다순, 기본무기 우선)
 * Iter6: eager 모듈-로드 시 계산으로 전환 — 첫 렌더에서 localeCompare가 블로킹하던 문제 제거.
 * dynamic import의 fallback(skeleton)이 이미 노출된 구간에 정렬을 끝내두므로
 * React 첫 렌더가 빨라져 탭 interactive-ready 시점이 앞당겨진다.
 */
function buildAllCharWeaponItems(): CharWeaponItem[] {
  const items: CharWeaponItem[] = [];
  const sortedCodes = Array.from(getFallbackMap().keys())
    .filter((code) => !EXCLUDED_CHARACTER_CODES.has(code))
    .sort((a, b) =>
      (getFallbackMap().get(a) ?? "").localeCompare(getFallbackMap().get(b) ?? "", "ko")
    );

  for (const charCode of sortedCodes) {
    const weapons = weaponData[String(charCode)];
    if (SINGLE_ENTRY_CHARS.has(charCode) || !weapons || weapons.length === 0) {
      items.push({ charCode, weaponCode: 0, weaponLabel: "" });
      continue;
    }
    const sorted = [...weapons].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    for (const w of sorted) {
      items.push({ charCode, weaponCode: w.weaponCode, weaponLabel: w.label });
    }
  }
  return items;
}

const ALL_CHAR_WEAPON_ITEMS: CharWeaponItem[] = buildAllCharWeaponItems();

export function getAllCharWeaponItems(): CharWeaponItem[] {
  return ALL_CHAR_WEAPON_ITEMS;
}

// ─── 타입 ──────────────────────────────────────────────────────────────────

/**
 * 선택 토글 로직 — 컴포넌트 외부에서 테스트 가능한 순수 함수.
 * 입력: 현재 ally1/ally2 + 탭된 item
 * 출력: 다음 [ally1, ally2] 또는 null(변경 없음)
 */
export function computeNextAllies(
  ally1: AllySelection | null,
  ally2: AllySelection | null,
  item: CharWeaponItem
): [AllySelection | null, AllySelection | null] | null {
  const targetCode = item.weaponCode;
  const alreadySelected =
    (ally1?.charCode === item.charCode && (ally1.weaponCode ?? 0) === targetCode) ||
    (ally2?.charCode === item.charCode && (ally2.weaponCode ?? 0) === targetCode);

  // 이미 선택된 것이면 제거
  if (alreadySelected) {
    if (ally1 && ally1.charCode === item.charCode) return [ally2, null];
    if (ally2 && ally2.charCode === item.charCode) return [ally1, null];
    return null;
  }

  const count = (ally1 ? 1 : 0) + (ally2 ? 1 : 0);
  if (count >= 2) return null;

  const sel: AllySelection = { charCode: item.charCode, weaponCode: item.weaponCode || null };
  if (!ally1) return [sel, null];
  return [ally1, sel];
}

// ─── 셀 ──────────────────────────────────────────────────────────────────

const CELL_MIN_WIDTH = 72;
const ROW_HEIGHT = 72;

const CharWeaponCell = React.memo(function CharWeaponCell({
  item,
  charName,
  selected,
  disabled,
  onSelect,
}: {
  item: CharWeaponItem;
  charName: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (item: CharWeaponItem) => void;
}) {
  // pointer 단계 처리로 onClick frame 에 묶여 있던 React 커밋을 앞당김.
  // 실측 원인은 Safari 고유 dispatch 지연(≤16ms)이 아니라 onClick 프레임으로 밀린 커밋 비용이며
  // 격리 실험은 .omc/touch-delay-jscontention-2026-04-15.md 참조.
  // useTapGuard: pointermove 누적 SLOP 가드 (가상화 스크롤 도중 우연 트리거 차단).
  const activate = React.useCallback(() => {
    if (disabled) return;
    onSelect(item);
  }, [disabled, item, onSelect]);
  const tapGuard = useTapGuard(activate);
  const { l10n } = useL10n();
  const localizedWeaponLabel = item.weaponCode > 0 ? resolveWeaponName(item.weaponCode, l10n) : "";
  const weaponIconUrl = getWeaponGroupImageUrl(item.weaponCode);
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
      disabled={disabled}
      title={localizedWeaponLabel ? `${charName} (${localizedWeaponLabel})` : charName}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md px-1 py-2 touch-manipulation",
        selected
          ? "bg-[var(--color-surface)] outline outline-1 outline-[var(--color-border-light)]"
          : disabled
            ? "opacity-25 cursor-not-allowed"
            : "hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80"
      )}
    >
      <div className="relative h-10 w-10">
        <span
          className={cn(
            "relative block h-full w-full overflow-hidden rounded-md bg-[var(--color-border)]",
            selected && "outline outline-1 outline-[var(--color-border-light)]"
          )}
        >
          <Image
            src={getCharacterMiniWebpUrl(item.charCode)}
            alt={charName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </span>
        {weaponIconUrl ? (
          <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-5 w-5 place-items-center rounded-full border shadow-sm">
            <Image
              src={weaponIconUrl}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "w-full truncate text-center text-[11.5px] font-semibold",
          selected ? "text-[var(--color-primary-hover)]" : "text-[var(--color-foreground)]/92"
        )}
      >
        {charName}
      </span>
      {localizedWeaponLabel && (
        <span
          className={cn(
            "w-full truncate text-center text-[10px] font-medium",
            selected ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
          )}
        >
          {localizedWeaponLabel}
        </span>
      )}
    </button>
  );
});

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export function WeaponAllySelector() {
  const { l10n } = useL10n();
  const t = useTranslations("weaponAllySelector");
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState(4);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );

  const selectionStore = useSynergyDetailSelectionStoreApi();
  const [ally1, ally2] = useSynergyDetailSelection((state) => state.allies);
  const pendingUrlSelectionRef = React.useRef<AllySelectionPair | null>(null);
  const urlSyncFrameRef = React.useRef<number | null>(null);
  const urlSyncTimerRef = React.useRef<number | null>(null);

  const selectedAllies = React.useMemo(
    () => [ally1, ally2].filter(Boolean) as AllySelection[],
    [ally1, ally2]
  );
  const deferredDisabledAllies = React.useDeferredValue(selectedAllies);

  const updateUrl = React.useCallback(
    (a1: AllySelection | null, a2: AllySelection | null) => {
      const params = new URLSearchParams(window.location.search);
      ["ally1", "w1", "ally2", "w2", "a", "b"].forEach((key) => params.delete(key));
      if (a1) {
        params.set("ally1", String(a1.charCode));
        if (a1.weaponCode) params.set("w1", String(a1.weaponCode));
      }
      if (a2) {
        params.set("ally2", String(a2.charCode));
        if (a2.weaponCode) params.set("w2", String(a2.weaponCode));
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname]
  );

  const scheduleUrlUpdate = React.useCallback(
    (next: AllySelectionPair) => {
      pendingUrlSelectionRef.current = next;
      if (urlSyncFrameRef.current !== null || urlSyncTimerRef.current !== null) return;

      // Next.js가 history.replaceState를 감싸 searchParams 갱신을 예약하므로,
      // pointerup 안에서 호출하면 선택 feedback의 paint까지 같은 interaction에 묶인다.
      // 첫 선택 paint가 끝난 뒤 별도 task에서 최신 pair 한 건만 URL에 반영한다.
      urlSyncFrameRef.current = window.requestAnimationFrame(() => {
        urlSyncFrameRef.current = null;
        urlSyncTimerRef.current = window.setTimeout(() => {
          urlSyncTimerRef.current = null;
          const pending = pendingUrlSelectionRef.current;
          pendingUrlSelectionRef.current = null;
          if (pending) updateUrl(pending[0], pending[1]);
        }, 0);
      });
    },
    [updateUrl]
  );

  React.useEffect(
    () => () => {
      if (urlSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(urlSyncFrameRef.current);
      }
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current);
      }
    },
    []
  );

  const isSelected = React.useCallback(
    (item: CharWeaponItem) =>
      selectedAllies.some(
        (a) => a.charCode === item.charCode && (a.weaponCode ?? 0) === item.weaponCode
      ),
    [selectedAllies]
  );

  const isDisabled = React.useCallback(
    (item: CharWeaponItem) => {
      if (isSelected(item)) return false;
      // 같은 실험체의 다른 무기가 이미 선택되어 있으면 disabled
      if (deferredDisabledAllies.some((a) => a.charCode === item.charCode)) return true;
      return deferredDisabledAllies.length >= 2;
    },
    [deferredDisabledAllies, isSelected]
  );

  const commitSelection = React.useCallback(
    (next: AllySelectionPair) => {
      // store action은 두 슬롯을 원자적으로 갱신하고, 다음 연속 탭은 getState()로 최신값을 읽는다.
      selectionStore.getState().setAllies(next);
      // URL은 공유와 복원을 위한 외부 표현이며 선택 UI의 선행 조건이 아니다.
      scheduleUrlUpdate(next);
    },
    [scheduleUrlUpdate, selectionStore]
  );

  const handleSelect = React.useCallback(
    (item: CharWeaponItem) => {
      const [a1, a2] = selectionStore.getState().allies;
      const next = computeNextAllies(a1, a2, item);
      if (!next) return;
      commitSelection(next);
    },
    [commitSelection, selectionStore]
  );

  const removeAlly = React.useCallback(
    (charCode: number) => {
      const [a1, a2] = selectionStore.getState().allies;
      if (a1?.charCode === charCode) commitSelection([a2, null]);
      else if (a2?.charCode === charCode) commitSelection([a1, null]);
    },
    [commitSelection, selectionStore]
  );

  // 검색 필터
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

  // 그리드 컬럼 계산
  React.useEffect(() => {
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
  }, []);

  const rowCount = Math.ceil(filteredItems.length / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const resolveWeaponLabel = (a: AllySelection) => {
    if (a.weaponCode == null || a.weaponCode === 0) return t("allWeapons");
    return resolveWeaponName(a.weaponCode, l10n);
  };

  return (
    <>
      {/* 슬롯 표시 — 두 아군은 항상 수직 정렬 */}
      <div className="mb-3 flex flex-col gap-2.5 sm:gap-3">
        {ally1 ? (
          <SlotWeaponFilled
            code={ally1.charCode}
            weaponCode={ally1.weaponCode}
            name={getCharName(ally1.charCode)}
            weaponName={resolveWeaponLabel(ally1)}
            onRemove={() => removeAlly(ally1.charCode)}
          />
        ) : (
          <SlotEmpty index={0} />
        )}
        {ally2 ? (
          <SlotWeaponFilled
            code={ally2.charCode}
            weaponCode={ally2.weaponCode}
            name={getCharName(ally2.charCode)}
            weaponName={resolveWeaponLabel(ally2)}
            onRemove={() => removeAlly(ally2.charCode)}
          />
        ) : (
          <SlotEmpty index={1} />
        )}
      </div>

      {/* 검색 + 가상화 그리드 */}
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <p className="mb-3 px-1 text-[12px] font-medium text-[var(--color-foreground)]/72">
          {t("heading")}
        </p>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-border-light)] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)]"
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
                      <CharWeaponCell
                        key={`${item.charCode}-${item.weaponCode}`}
                        item={item}
                        charName={getCharName(item.charCode)}
                        selected={isSelected(item)}
                        disabled={isDisabled(item)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── 슬롯 (무기 포함) ─────────────────────────────────────────────────────────

function SlotWeaponFilled({
  code,
  weaponCode,
  name,
  weaponName,
  onRemove,
}: {
  code: number;
  weaponCode: number | null;
  name: string;
  weaponName: string;
  onRemove: () => void;
}) {
  const weaponIconUrl = getWeaponGroupImageUrl(weaponCode);
  return (
    <div
      data-ally-character={code}
      data-ally-weapon={weaponCode ?? 0}
      className="flex w-full items-center gap-3 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-3"
    >
      <div className="relative h-11 w-11 shrink-0">
        <span className="relative block h-full w-full overflow-hidden rounded bg-[var(--color-border)] outline outline-1 outline-[var(--color-border)]">
          <Image
            src={getCharacterMiniWebpUrl(code)}
            alt={name}
            fill
            className="object-cover"
            sizes="44px"
          />
        </span>
        {weaponIconUrl ? (
          <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-5 w-5 place-items-center rounded-full border shadow-sm">
            <Image
              src={weaponIconUrl}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate text-[15px] font-bold text-[var(--color-foreground)]">
          {name}
        </span>
        <span className="truncate text-[11.5px] font-semibold text-[var(--color-primary-hover)]">
          {weaponName}
        </span>
      </div>
      <button
        onClick={onRemove}
        aria-label={`${name} 제거`}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:bg-[var(--color-surface-3)] active:text-[var(--color-foreground)]"
      >
        <X className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}
