"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { TraitIcon } from "./TraitIcon";
import type { TrioWeaponResult } from "./types";
import { useTapGuard } from "./useTapGuard";

const SMALL_SAMPLE_THRESHOLD = 20;

/** Level 1 (접힘): 캐릭터+무기 조합 (mainCore 집계) */
export interface GroupedCombo {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
  /** Level 2 (펼침): 특성별 브레이크다운 */
  traitVariants: TrioWeaponResult[];
}

interface OrderedMember {
  char: number;
  weapon: number;
}

function getOrderedMembers(group: GroupedCombo, selectedCharCodes: number[]): OrderedMember[] {
  const members: OrderedMember[] = [
    { char: group.character1, weapon: group.weaponType1 },
    { char: group.character2, weapon: group.weaponType2 },
    { char: group.character3, weapon: group.weaponType3 },
  ];
  const allies: OrderedMember[] = [];
  const rest: OrderedMember[] = [];
  for (const m of members) {
    if (selectedCharCodes.includes(m.char) && allies.length < selectedCharCodes.length) {
      allies.push(m);
    } else {
      rest.push(m);
    }
  }
  allies.sort((a, b) => selectedCharCodes.indexOf(a.char) - selectedCharCodes.indexOf(b.char));
  return [...allies, ...rest];
}

function getCoreForMember(m: OrderedMember, v: TrioWeaponResult): number | null {
  if (m.char === v.character1) return v.mainCore1;
  if (m.char === v.character2) return v.mainCore2;
  return v.mainCore3;
}

interface ComboWeaponCardProps {
  group: GroupedCombo;
  rank: number;
  getCharName: (code: number) => string;
  getWeaponName: (code: number) => string;
  getTraitName: (code: number) => string | null;
  selectedCharCodes: number[];
  /** 추천(gold ring) 캐릭터 Link 클릭 시 호출. 부모가 analytics 발화. 메모이제이션 유지를 위해 ref-stable하게 전달할 것. */
  onRecommendationClick?: (pickedCode: number, pickedRank: number) => void;
}

/**
 * 30개 이상의 카드가 렌더되므로 React.memo 필수.
 * selectedCharCodes는 SynergyDetailResults에서 useMemo로 identity를 안정화하여 전달.
 * 상위 re-render(필터/정렬) 시 group/rank/selectedCharCodes가 변하지 않은 카드는 skip.
 */
function ComboWeaponCardImpl({
  group,
  rank,
  getCharName,
  getWeaponName,
  getTraitName,
  selectedCharCodes,
  onRecommendationClick,
}: ComboWeaponCardProps) {
  const t = useTranslations("synergyComboCard");
  const [showTraits, setShowTraits] = React.useState(false);
  const [showAllVariants, setShowAllVariants] = React.useState(false);
  const ordered = React.useMemo(
    () => getOrderedMembers(group, selectedCharCodes),
    [group, selectedCharCodes]
  );
  const isSmallSample = group.totalGames < SMALL_SAMPLE_THRESHOLD;
  // 상위 10개까지 잘라두고, 초기 펼침에서는 상위 3개만 노출하여 첫 커밋 비용을 줄임.
  // 나머지는 "더보기" 로 유저 의도 있을 때만 mount (TraitIcon n×3 서브트리가 무거워서 INP 주요 기여자).
  const sortedVariants = React.useMemo(
    () => [...group.traitVariants].sort((a, b) => b.averageRP - a.averageRP).slice(0, 10),
    [group.traitVariants]
  );
  const INITIAL_VARIANTS = 3;
  const visibleVariants = showAllVariants
    ? sortedVariants
    : sortedVariants.slice(0, INITIAL_VARIANTS);
  const hasMoreVariants = sortedVariants.length > INITIAL_VARIANTS;

  // pointer 단계로 토글해 onClick frame 까지 밀리는 커밋을 앞당김
  // (.omc/touch-delay-jscontention-2026-04-15.md — 실측 병목은 Safari dispatch 가 아닌 커밋 비용).
  // ChevronRight rotate 는 urgent 유지하되 패널 mount(10 variant × TraitIcon) 는 startTransition 으로 양보.
  const toggleTraits = () =>
    React.startTransition(() => {
      setShowTraits((prev) => !prev);
      setShowAllVariants(false); // 접을 때 내부 더보기 상태도 초기화
    });

  // 스크롤 가드 (.omc/touch-delay-jscontention-2026-04-15.md): onPointerUp 은 onClick 과 달리
  // 스크롤 발생 시 브라우저가 차단해주지 않으므로 pointermove 단계에서 SLOP=10px 누적 가드.
  const tapGuard = useTapGuard(toggleTraits);

  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--color-surface)]/85 transition-all duration-200",
        rank <= 3
          ? "border-[var(--color-accent-gold)]/22 shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_8px_22px_-22px_rgba(251,191,36,0.45)]"
          : "border-[var(--color-border)]"
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 56px" }}
    >
      {/* 메인 행 — 포인터 단계로 특성 토글 (div+role로 Link 중첩 이슈 해소) */}
      <div
        role="button"
        tabIndex={0}
        {...tapGuard}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTraits();
          }
        }}
        style={{ touchAction: "manipulation" }}
        className="w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 text-left cursor-pointer rounded-xl hover:bg-[var(--color-surface-2)]/60 active:bg-[var(--color-surface-2)]/80 transition-colors"
      >
        {/* 순위 */}
        <span
          className={cn(
            "w-5 sm:w-6 shrink-0 text-center text-xs sm:text-sm font-black",
            rank === 1
              ? "text-[var(--color-accent-gold)]"
              : rank === 2
                ? "text-[#e5e7eb]"
                : rank === 3
                  ? "text-[#f0a44a]"
                  : "text-[var(--color-foreground)]/55"
          )}
        >
          {rank}
        </span>

        {/* 3캐릭터 + 무기 */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {ordered.map((m, i) => {
            const isRecommended = !selectedCharCodes.includes(m.char);
            return (
              <React.Fragment key={`${m.char}-${m.weapon}`}>
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      "relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-md bg-[var(--color-border)]",
                      isRecommended
                        ? "ring-2 ring-[var(--color-accent-gold)] shadow-[0_0_0_1px_rgba(251,191,36,0.22)]"
                        : "ring-1 ring-[rgba(255,255,255,0.08)]"
                    )}
                  >
                    <Image
                      src={getCharacterMiniWebpUrl(m.char)}
                      alt={getCharName(m.char)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 32px, 40px"
                    />
                  </div>
                  <span
                    className={cn(
                      "w-10 sm:w-14 truncate text-center text-[9.5px] sm:text-[11.5px] font-bold tracking-[-0.01em]",
                      isRecommended
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-foreground)]/82"
                    )}
                  >
                    {getCharName(m.char)}
                  </span>
                  <span
                    className={cn(
                      "text-[8.5px] sm:text-[10px] truncate w-10 sm:w-14 text-center font-medium",
                      isRecommended
                        ? "text-[var(--color-accent-gold)]/72"
                        : "text-[var(--color-foreground)]/55"
                    )}
                  >
                    {getWeaponName(m.weapon)}
                  </span>
                  <Link
                    href={`/character/${m.char}?weapon=${m.weapon}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRecommended) onRecommendationClick?.(m.char, rank);
                    }}
                    onTouchEnd={(e) => e.stopPropagation()}
                    // 외부 div[role=button]가 onPointerUp으로 토글하므로 pointer 단계에서도
                    // 차단해야 "캐릭터 상세 이동" 탭이 실수로 브레이크다운 토글을 함께 트리거하지 않음.
                    // pointerDown 도 차단해야 부모 div 의 pointerStartRef 가 Link 좌표로 오염되지 않음
                    // (Safari 는 pointercancel 비보장 — Link 탭 후 다음 카드 탭에서 stale start 로 토글되는 회귀 차단).
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    aria-label={`${getCharName(m.char)} 상세 보기`}
                    className="mt-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] active:bg-[var(--color-surface-2)] sm:h-5 sm:w-5"
                  >
                    <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Link>
                </div>
                {i < 2 && (
                  <span className="text-[8px] sm:text-[10px] text-[var(--color-border)] self-start mt-2 sm:mt-3">
                    +
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 소표본 배지 */}
        {isSmallSample && (
          <span className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-[var(--color-warning)] shrink-0">
            {t("smallSample")}
          </span>
        )}

        {/* 스탯 */}
        <div className="ml-auto flex items-center gap-2 sm:gap-6 text-right">
          <StatCol label={t("winRate")} value={`${group.winRate.toFixed(1)}%`} />
          <StatCol
            label={t("rp")}
            value={`${group.averageRP > 0 ? "+" : ""}${group.averageRP.toFixed(1)}`}
            highlight={group.averageRP >= 0 ? "gold" : "muted"}
          />
          <div className="hidden sm:flex">
            <StatCol label={t("games")} value={group.totalGames.toLocaleString()} />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-medium text-[var(--color-foreground)]/55">
              {t("averageRank")}
            </span>
            <span className="text-sm font-bold text-[var(--color-foreground)]">
              #{group.averageRank.toFixed(1)}
            </span>
          </div>

          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[var(--color-foreground)]/55 transition-transform duration-200",
              showTraits && "rotate-90 text-[var(--color-primary-hover)]"
            )}
            strokeWidth={2.4}
          />
        </div>
      </div>

      {/* 특성 브레이크다운 */}
      {showTraits && (
        <div className="px-2 sm:px-3 py-2.5 flex flex-col gap-1.5 bg-[linear-gradient(180deg,rgba(96,165,250,0.06),rgba(255,255,255,0.02))] border-t border-[var(--color-primary)]/22">
          {visibleVariants.map((v, vi) => (
            <div
              key={`${v.mainCore1}-${v.mainCore2}-${v.mainCore3}-${vi}`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[var(--color-surface)]/72 px-2 sm:px-3 py-1.5 sm:py-2 border border-[var(--color-border-light)]"
            >
              {/* 순위 열과 동일한 오프셋 */}
              <span className="w-1 sm:w-2 shrink-0" />
              {/* 특성 아이콘 — 캐릭터 열과 동일 gap/너비 */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {ordered.map((m, mi) => {
                  const core = getCoreForMember(m, v);
                  return (
                    <React.Fragment key={`${m.char}-trait-${vi}`}>
                      <div className="flex flex-col items-center w-10 sm:w-14">
                        {core && core > 0 ? (
                          <TraitIcon code={core} name={getTraitName(core)} size="sm" />
                        ) : (
                          <span className="text-[8px] sm:text-[9px] text-[var(--color-muted-foreground)]">
                            -
                          </span>
                        )}
                      </div>
                      {mi < 2 && (
                        <span className="text-[8px] sm:text-[10px] text-[var(--color-border)] self-start mt-2 sm:mt-3">
                          +
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 스탯 */}
              <div className="ml-auto flex items-center gap-2 sm:gap-5 text-right">
                <StatCol label={t("winRate")} value={`${v.winRate.toFixed(1)}%`} small />
                <StatCol
                  label={t("rp")}
                  value={`${v.averageRP > 0 ? "+" : ""}${v.averageRP.toFixed(1)}`}
                  highlight={v.averageRP >= 0 ? "gold" : "muted"}
                  small
                />
                <div className="hidden sm:flex">
                  <StatCol label={t("games")} value={v.totalGames.toLocaleString()} small />
                </div>
              </div>
            </div>
          ))}
          {hasMoreVariants && !showAllVariants && (
            <MoreButton
              label={t("moreTraits", { count: sortedVariants.length - INITIAL_VARIANTS })}
              onActivate={() => React.startTransition(() => setShowAllVariants(true))}
            />
          )}
        </div>
      )}
    </div>
  );
}

export const ComboWeaponCard = React.memo(ComboWeaponCardImpl, (prev, next) => {
  if (prev.rank !== next.rank) return false;
  if (prev.group !== next.group) return false;
  if (prev.getCharName !== next.getCharName) return false;
  if (prev.getWeaponName !== next.getWeaponName) return false;
  if (prev.getTraitName !== next.getTraitName) return false;
  // selectedCharCodes는 number[]이므로 shallow 비교
  const a = prev.selectedCharCodes;
  const b = next.selectedCharCodes;
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
});

function MoreButton({ label, onActivate }: { label: string; onActivate: () => void }) {
  const tapGuard = useTapGuard(
    React.useCallback(
      (e: React.PointerEvent) => {
        e.stopPropagation();
        onActivate();
      },
      [onActivate]
    )
  );
  return (
    <button
      type="button"
      {...tapGuard}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 text-[10px] sm:text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] py-1.5 px-2 rounded bg-[var(--color-surface)]/40 hover:bg-[var(--color-surface)]/70 transition-colors"
      style={{ touchAction: "manipulation" }}
    >
      {label}
    </button>
  );
}

function StatCol({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  color?: string;
  highlight?: "gold" | "muted";
  small?: boolean;
}) {
  const textColor =
    highlight === "gold"
      ? "text-[var(--color-accent-gold)]"
      : highlight === "muted"
        ? "text-[var(--color-foreground)]/55"
        : "text-[var(--color-foreground)]";

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "font-medium text-[var(--color-foreground)]/55",
          small ? "text-[8.5px] sm:text-[9.5px]" : "text-[8.5px] sm:text-[10px]"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-bold",
          textColor,
          small ? "text-[10.5px] sm:text-[12.5px]" : "text-[12px] sm:text-[14.5px]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
