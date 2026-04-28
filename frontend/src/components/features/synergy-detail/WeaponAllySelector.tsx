"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { X, Search } from "lucide-react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import characterBestWeapons from "@/../const/characterBestWeapons.json";
import { useL10n } from "@/components/L10nProvider";
import { resolveCharacterName, getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap, EXCLUDED_CHARACTER_CODES } from "../synergy/constants";
import { SlotEmpty } from "../synergy/SlotEmpty";
import { matchesChosungSearch } from "../synergy/utils";
import { useTapGuard } from "./useTapGuard";

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

/** 무기 분류하지 않는 캐릭터 (알렉스 등) */
const SINGLE_ENTRY_CHARS = new Set([27]);

/**
 * 캐릭터+무기 플랫 리스트 (가나다순, 기본무기 우선)
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

export interface AllySelection {
  charCode: number;
  weaponCode: number | null;
}

export function parseAllyFromParams(
  params: URLSearchParams,
  allyKey: string,
  weaponKey: string,
  legacyAllyKey?: string,
  legacyWeaponKey?: string
): AllySelection | null {
  const charStr = params.get(allyKey) ?? (legacyAllyKey ? params.get(legacyAllyKey) : null);
  if (!charStr) return null;
  const charCode = parseInt(charStr, 10);
  if (isNaN(charCode)) return null;
  const wStr = params.get(weaponKey) ?? (legacyWeaponKey ? params.get(legacyWeaponKey) : null);
  const weaponCode = wStr ? parseInt(wStr, 10) : null;
  return { charCode, weaponCode: weaponCode && !isNaN(weaponCode) ? weaponCode : null };
}

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
        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors touch-manipulation",
        selected
          ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
          : disabled
            ? "opacity-30 cursor-not-allowed"
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

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export function WeaponAllySelector() {
  const { l10n } = useL10n();
  const t = useTranslations("weaponAllySelector");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState(4);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, getFallbackMap()),
    [l10n]
  );

  const urlAlly1 = React.useMemo(
    () => parseAllyFromParams(searchParams, "ally1", "w1", "a"),
    [searchParams]
  );
  const urlAlly2 = React.useMemo(
    () => parseAllyFromParams(searchParams, "ally2", "w2", "b"),
    [searchParams]
  );

  /**
   * 1번 탭 즉시 반응 핵심:
   * - URL을 source of truth로만 두면 탭 → router.replace → 라우트 전환 → searchParams 재방출 →
   *   ally 재계산 → 슬롯 렌더까지 수백 ms 체감됨.
   * - 로컬 optimistic state로 탭 즉시 슬롯 채움, URL 동기화는 백그라운드에서 처리.
   * - 외부(뒤로가기/공유링크)로 URL이 바뀌면 skipNextSyncRef가 false라서 local로 역동기화됨.
   */
  const [localAlly1, setLocalAlly1] = React.useState<AllySelection | null>(urlAlly1);
  const [localAlly2, setLocalAlly2] = React.useState<AllySelection | null>(urlAlly2);
  const skipNextSyncRef = React.useRef(false);

  React.useEffect(() => {
    if (skipNextSyncRef.current) {
      // 방금 우리가 푸시한 URL 반영 — local은 이미 최신
      skipNextSyncRef.current = false;
      return;
    }
    setLocalAlly1(urlAlly1);
    setLocalAlly2(urlAlly2);
  }, [urlAlly1, urlAlly2]);

  const ally1 = localAlly1;
  const ally2 = localAlly2;

  const selectedAllies = React.useMemo(
    () => [ally1, ally2].filter(Boolean) as AllySelection[],
    [ally1, ally2]
  );

  /**
   * handleSelect/removeAlly가 매 렌더마다 재생성되면 CharWeaponCell(React.memo)의
   * onSelect prop이 바뀌어 90+ 셀이 전부 리렌더됨.
   * 최신 ally 값을 ref로 동기화하고 콜백은 updateUrl에만 의존시켜 identity를 고정.
   */
  const allyRef = React.useRef<{ ally1: AllySelection | null; ally2: AllySelection | null }>({
    ally1,
    ally2,
  });
  React.useEffect(() => {
    allyRef.current = { ally1, ally2 };
  }, [ally1, ally2]);

  const updateUrl = React.useCallback(
    (a1: AllySelection | null, a2: AllySelection | null) => {
      const params = new URLSearchParams();
      if (a1) {
        params.set("ally1", String(a1.charCode));
        if (a1.weaponCode) params.set("w1", String(a1.weaponCode));
      }
      if (a2) {
        params.set("ally2", String(a2.charCode));
        if (a2.weaponCode) params.set("w2", String(a2.weaponCode));
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      // startTransition: URL 업데이트를 비긴급 작업으로 마킹 → 탭 응답성이 블로킹되지 않음
      React.startTransition(() => {
        router.replace(newUrl, { scroll: false });
      });
    },
    [pathname, router]
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
      // 같은 캐릭터의 다른 무기가 이미 선택되어 있으면 disabled
      if (selectedAllies.some((a) => a.charCode === item.charCode)) return true;
      return selectedAllies.length >= 2;
    },
    [selectedAllies, isSelected]
  );

  const commitSelection = React.useCallback(
    (next: [AllySelection | null, AllySelection | null]) => {
      // 0) ref를 즉시 갱신 → 빠른 연속 탭에서도 allyRef.current가 최신값을 가짐
      //    (useEffect 기반 sync는 렌더 커밋 이후에 발생하므로 tight loop에서는 stale 가능)
      allyRef.current = { ally1: next[0], ally2: next[1] };
      // 1) 로컬 상태 업데이트 → 슬롯/셀 즉각 시각 반응
      setLocalAlly1(next[0]);
      setLocalAlly2(next[1]);
      // 2) useEffect가 이 URL 변화를 local로 되돌리지 않도록 스킵 플래그 설정
      skipNextSyncRef.current = true;
      // 3) URL 동기화는 startTransition 안에서 비동기로
      updateUrl(next[0], next[1]);
    },
    [updateUrl]
  );

  const handleSelect = React.useCallback(
    (item: CharWeaponItem) => {
      const { ally1: a1, ally2: a2 } = allyRef.current;
      const next = computeNextAllies(a1, a2, item);
      if (!next) return;
      commitSelection(next);
    },
    [commitSelection]
  );

  const removeAlly = React.useCallback(
    (charCode: number) => {
      const { ally1: a1, ally2: a2 } = allyRef.current;
      if (a1?.charCode === charCode) commitSelection([a2, null]);
      else if (a2?.charCode === charCode) commitSelection([a1, null]);
    },
    [commitSelection]
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
      {/* 슬롯 표시 */}
      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {ally1 ? (
          <SlotWeaponFilled
            code={ally1.charCode}
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
            name={getCharName(ally2.charCode)}
            weaponName={resolveWeaponLabel(ally2)}
            onRemove={() => removeAlly(ally2.charCode)}
          />
        ) : (
          <SlotEmpty index={1} />
        )}
      </div>

      {/* 검색 + 가상화 그리드 */}
      <div className="rounded-[22px] border border-[var(--color-border)] bg-[rgba(17,25,46,0.72)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="mb-3 px-1 text-xs text-[var(--color-muted-foreground)]">{t("heading")}</p>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[rgba(10,16,31,0.72)] py-2 pl-8 pr-8 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
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
  name,
  weaponName,
  onRemove,
}: {
  code: number;
  name: string;
  weaponName: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-[18px] border border-[var(--color-primary)]/30 bg-[rgba(37,99,235,0.12)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(code)}
          alt={name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate text-sm font-semibold text-[var(--color-foreground)]">
          {name}
        </span>
        <span className="text-[11px] text-[var(--color-primary-hover)]">{weaponName}</span>
      </div>
      <button
        onClick={onRemove}
        className="rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]/80 hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
