"use client";

import { ArrowUpRight, ChevronRight, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { TierBadge } from "@/components/features/TierBadge";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import {
  buildTrioCompositionInsight,
  type CompositionMemberDuty,
  type CompositionPatternKey,
  type TrioCompositionInsight,
} from "@/lib/synergyComposition";
import { assignComboTier, COMBO_TIER_WEIGHTS, PERFORMANCE_TIER_MIN_GAMES } from "@/lib/tierScoring";
import { cn } from "@/lib/utils";
import { TraitIcon } from "./TraitIcon";
import type { TrioWeaponResult } from "./types";
import { useTapGuard } from "./useTapGuard";

/*
 * Composition analysis is supplemental to the recommendation statistics.
 * Keep it out of the result commit so a newly arrived result cannot monopolize
 * the main thread before the user's next selection is handled.
 */
const COMPOSITION_INSIGHT_DELAY_MS = 100;

function useDeferredCompositionInsight(group: GroupedCombo) {
  const insightKey = `${group.character1}:${group.weaponType1}|${group.character2}:${group.weaponType2}|${group.character3}:${group.weaponType3}`;
  const suppliedInsight = group.compositionInsight ?? null;
  const [computed, setComputed] = React.useState<{
    key: string;
    insight: TrioCompositionInsight;
  } | null>(() => (suppliedInsight ? { key: insightKey, insight: suppliedInsight } : null));

  React.useEffect(() => {
    if (suppliedInsight) {
      setComputed({ key: insightKey, insight: suppliedInsight });
      return;
    }

    let cancelled = false;
    let idleCallbackId: number | null = null;
    let fallbackTimerId: number | null = null;
    const computeInsight = () => {
      const insight = buildTrioCompositionInsight([
        { character: group.character1, weapon: group.weaponType1 },
        { character: group.character2, weapon: group.weaponType2 },
        { character: group.character3, weapon: group.weaponType3 },
      ]);
      if (cancelled) return;
      React.startTransition(() => setComputed({ key: insightKey, insight }));
    };
    const timerId = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleCallbackId = window.requestIdleCallback(computeInsight, { timeout: 1_500 });
      } else {
        fallbackTimerId = window.setTimeout(computeInsight, 0);
      }
    }, COMPOSITION_INSIGHT_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      if (idleCallbackId != null) window.cancelIdleCallback(idleCallbackId);
      if (fallbackTimerId != null) window.clearTimeout(fallbackTimerId);
    };
  }, [
    group.character1,
    group.weaponType1,
    group.character2,
    group.weaponType2,
    group.character3,
    group.weaponType3,
    insightKey,
    suppliedInsight,
  ]);

  if (suppliedInsight) return suppliedInsight;
  return computed?.key === insightKey ? computed.insight : null;
}

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
  compositionInsight?: TrioCompositionInsight | null;
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

function hasCoreData(v: TrioWeaponResult): boolean {
  return Boolean(
    (v.mainCore1 && v.mainCore1 > 0) ||
    (v.mainCore2 && v.mainCore2 > 0) ||
    (v.mainCore3 && v.mainCore3 > 0)
  );
}

const COMPOSITION_PATTERN_BADGE_TONES: Record<CompositionPatternKey, string> = {
  threeLayer: "border-violet-400/45 bg-violet-400/10 text-violet-700 dark:text-violet-300",
  diveFollow: "border-rose-400/45 bg-rose-400/10 text-rose-700 dark:text-rose-300",
  doubleFront: "border-orange-400/45 bg-orange-400/10 text-orange-700 dark:text-orange-300",
  frontToBack: "border-emerald-400/45 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  protectCarry: "border-sky-400/45 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  pickBurst: "border-fuchsia-400/45 bg-fuchsia-400/10 text-fuchsia-700 dark:text-fuchsia-300",
  pokeKite: "border-cyan-400/45 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300",
  brawl: "border-amber-400/45 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  flexible: "border-slate-400/45 bg-slate-400/10 text-slate-700 dark:text-slate-300",
};

interface ComboWeaponCardProps {
  group: GroupedCombo;
  rank: number;
  getCharName: (code: number) => string;
  getWeaponName: (code: number) => string;
  getTraitName: (code: number) => string | null;
  selectedCharCodes: number[];
  isFocusPoolCombo?: boolean;
  loadTraitVariants?: (group: GroupedCombo, signal?: AbortSignal) => Promise<TrioWeaponResult[]>;
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
  isFocusPoolCombo = false,
  loadTraitVariants,
  onRecommendationClick,
}: ComboWeaponCardProps) {
  const t = useTranslations("synergyComboCard");
  const compositionInsight = useDeferredCompositionInsight(group);
  const compositionAnalysisTitle = t.has("composition.title")
    ? t("composition.title")
    : `${t("composition.rolesLabel")} · ${t("composition.powerSpikeLabel")}`;
  const [showTraits, setShowTraits] = React.useState(false);
  const [showAllVariants, setShowAllVariants] = React.useState(false);
  const [loadedTraitVariants, setLoadedTraitVariants] = React.useState<TrioWeaponResult[] | null>(
    null
  );
  const [isTraitsLoading, setIsTraitsLoading] = React.useState(false);
  const ordered = React.useMemo(
    () => getOrderedMembers(group, selectedCharCodes),
    [group, selectedCharCodes]
  );
  const combatDoctrine = compositionInsight?.combatDoctrine;
  const doctrineFeatureLabels = combatDoctrine
    ? [
        t(
          `composition.combatDoctrine.features.damageDelivery.${combatDoctrine.features.damageDelivery}`
        ),
        t(
          `composition.combatDoctrine.features.accessMethod.${combatDoctrine.features.accessMethod}`
        ),
        t(
          `composition.combatDoctrine.features.frontlineStructure.${combatDoctrine.features.frontlineStructure}`
        ),
      ]
    : [];
  const doctrineRows = combatDoctrine
    ? [
        {
          label: t("composition.combatDoctrine.labels.winCondition"),
          text: t(`composition.combatDoctrine.statements.${combatDoctrine.winCondition}`),
        },
        {
          label: t("composition.combatDoctrine.labels.opening"),
          text: t(`composition.combatDoctrine.statements.${combatDoctrine.opening}`),
        },
        {
          label: t("composition.combatDoctrine.labels.failure"),
          text: t(`composition.combatDoctrine.statements.${combatDoctrine.failure}`),
        },
      ]
    : [];
  const orderedMemberDuties = combatDoctrine
    ? ordered
        .map(({ char, weapon }) =>
          combatDoctrine.memberDuties.find(
            (duty) => duty.character === char && duty.weapon === weapon
          )
        )
        .filter((duty): duty is CompositionMemberDuty => Boolean(duty))
    : [];
  const isSmallSample = group.totalGames < PERFORMANCE_TIER_MIN_GAMES;
  const tier = isSmallSample
    ? null
    : assignComboTier({
        winRate: group.winRate,
        averageRank: group.averageRank,
        averageRP: group.averageRP,
      });
  const tierWeightDescription = `${t("rp")} ${COMBO_TIER_WEIGHTS.averageRP * 100}% · ${t("averageRank")} ${COMBO_TIER_WEIGHTS.survival * 100}% · ${t("winRate")} ${COMBO_TIER_WEIGHTS.winRate * 100}%`;
  const groupHasCoreData = React.useMemo(
    () => group.traitVariants.some(hasCoreData),
    [group.traitVariants]
  );

  React.useEffect(() => {
    if (!showTraits || !loadTraitVariants || loadedTraitVariants !== null || groupHasCoreData) {
      return;
    }

    const controller = new AbortController();
    setIsTraitsLoading(true);
    loadTraitVariants(group, controller.signal)
      .then((rows) => {
        setLoadedTraitVariants(rows);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadedTraitVariants(group.traitVariants);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsTraitsLoading(false);
      });

    return () => controller.abort();
  }, [group, groupHasCoreData, loadTraitVariants, loadedTraitVariants, showTraits]);

  const traitVariants = loadedTraitVariants ?? group.traitVariants;
  // 상위 10개까지 잘라두고, 초기 펼침에서는 상위 3개만 노출하여 첫 커밋 비용을 줄임.
  // 나머지는 "더보기" 로 유저 의도 있을 때만 mount (TraitIcon n×3 서브트리가 무거워서 INP 주요 기여자).
  const sortedVariants = React.useMemo(
    () => [...traitVariants].sort((a, b) => b.averageRP - a.averageRP).slice(0, 10),
    [traitVariants]
  );
  const INITIAL_VARIANTS = 3;
  const isInitialTraitFetch = isTraitsLoading && loadedTraitVariants === null && !groupHasCoreData;
  const visibleVariants = isInitialTraitFetch
    ? []
    : showAllVariants
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

  // 부모 가상 스크롤이 이 카드의 실제 높이를 ResizeObserver로 측정한다.
  // content-visibility/contain-intrinsic-size를 함께 쓰면 비동기 펼침 높이가 누락되어 카드가 겹칠 수 있다.
  return (
    <div
      className={cn(
        "rounded-md border bg-[var(--color-surface)] transition-colors",
        isFocusPoolCombo
          ? "border-[color-mix(in_srgb,var(--color-accent)_46%,var(--color-border-light))] bg-[color-mix(in_srgb,var(--color-accent-muted)_62%,var(--color-surface))] shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-accent)_72%,transparent)]"
          : rank <= 3
            ? "border-[var(--color-border-light)]"
            : "border-[var(--color-border)]"
      )}
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
        className="w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 text-left cursor-pointer rounded-md hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]"
      >
        {/* 순위 */}
        <span
          className={cn(
            "w-5 sm:w-6 shrink-0 text-center text-xs sm:text-sm font-bold",
            rank === 1
              ? "text-[var(--color-accent-gold)]"
              : rank === 2
                ? "text-[var(--color-foreground)]"
                : rank === 3
                  ? "text-[var(--color-muted-foreground)]"
                  : "text-[var(--color-foreground)]/55"
          )}
        >
          {rank}
        </span>

        {tier ? (
          <span
            className="inline-flex shrink-0"
            aria-label={`Tier ${tier}: ${tierWeightDescription}`}
            title={tierWeightDescription}
          >
            <TierBadge tier={tier} className="h-6 min-w-6 text-[10px] sm:h-7 sm:min-w-7" />
          </span>
        ) : null}

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
                        ? "outline outline-1 outline-[var(--color-border-light)]"
                        : "ring-1 ring-[var(--color-border)]"
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
                      "w-10 sm:w-14 truncate text-center text-[9.5px] sm:text-[11.5px] font-bold ",
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
                    className="mt-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)] active:bg-[var(--color-surface-2)] sm:h-5 sm:w-5"
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
              "h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[var(--color-foreground)]/55",
              showTraits && "rotate-90 text-[var(--color-primary-hover)]"
            )}
            strokeWidth={2.4}
          />
        </div>
      </div>

      {compositionInsight ? (
        <div className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_72%,transparent)] px-2 py-2 sm:px-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              data-composition-pattern-badge={compositionInsight.pattern}
              title={t(`composition.patternDescriptions.${compositionInsight.pattern}`)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold sm:text-[11px]",
                COMPOSITION_PATTERN_BADGE_TONES[compositionInsight.pattern]
              )}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              {t(`composition.patterns.${compositionInsight.pattern}`)}
            </span>
          </div>
          {showTraits ? (
            <div
              data-composition-explanation
              data-composition-pattern={compositionInsight.pattern}
              className="mt-2 text-[10.5px] leading-relaxed sm:text-[11px]"
            >
              <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-foreground)]" />
                <p className="font-bold text-[var(--color-foreground)]">
                  {compositionAnalysisTitle}
                </p>
              </div>
              <div className="mt-2 space-y-1.5">
                <div
                  data-combat-doctrine
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/55 p-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="mr-1 font-bold text-[var(--color-foreground)]">
                      {t("composition.combatDoctrine.title")}
                    </p>
                    {doctrineFeatureLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-muted-foreground)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <dl className="mt-2 space-y-1.5">
                    {doctrineRows.map((row, index) => (
                      <div
                        key={row.label}
                        data-combat-doctrine-rule={index + 1}
                        className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-1.5"
                      >
                        <dt className="font-bold text-[var(--color-foreground)]">{row.label}</dt>
                        <dd className="text-[var(--color-muted-foreground)]">{row.text}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-2.5 border-t border-[var(--color-border)] pt-2">
                    <p className="font-bold text-[var(--color-foreground)]">
                      {t("composition.combatDoctrine.memberDutyTitle")}
                    </p>
                    <div className="mt-1.5 grid gap-1.5 lg:grid-cols-3">
                      {orderedMemberDuties.map((duty) => (
                        <div
                          key={`${duty.character}_${duty.weapon}`}
                          data-combat-member-duty={`${duty.character}_${duty.weapon}`}
                          className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)]/65 p-2"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[var(--color-foreground)]">
                              {getCharName(duty.character)}
                            </span>
                            <span className="rounded-full bg-[var(--color-accent)]/12 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent-foreground)]">
                              {t(`composition.combatTasks.${duty.task}`)}
                            </span>
                            {duty.secondaryTask && (
                              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-muted-foreground)]">
                                {t("composition.combatDoctrine.labels.dutySecondary")}
                                {" · "}
                                {t(`composition.combatTasks.${duty.secondaryTask}`)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[var(--color-muted-foreground)]">
                            <span className="font-bold text-[var(--color-foreground)]">
                              {t("composition.combatDoctrine.labels.dutyAction")}
                              {": "}
                            </span>
                            {t(`composition.combatDoctrine.memberActions.${duty.action}`)}
                          </p>
                          <p className="mt-0.5 text-[var(--color-muted-foreground)]">
                            <span className="font-bold text-rose-600 dark:text-rose-300">
                              {t("composition.combatDoctrine.labels.dutyAvoid")}
                              {": "}
                            </span>
                            {t(`composition.combatDoctrine.memberAvoids.${duty.avoid}`)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          data-composition-insight-pending
          aria-hidden="true"
          className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_72%,transparent)] px-2 py-2 sm:px-3"
        >
          <div className="h-[26px] w-24 animate-pulse rounded-md bg-[var(--color-surface-3)]" />
        </div>
      )}

      {/* 특성 브레이크다운 */}
      {showTraits && (
        <div
          data-trait-breakdown
          className="px-2 sm:px-3 py-2.5 flex flex-col gap-1.5 bg-[var(--color-surface-2)] border-t border-[var(--color-border)]"
        >
          {isInitialTraitFetch && (
            <div className="flex items-center justify-center rounded-md bg-[var(--color-surface)] px-3 py-3 border border-[var(--color-border-light)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-hover)]" />
            </div>
          )}
          {visibleVariants.map((v, vi) => (
            <div
              key={`${v.mainCore1}-${v.mainCore2}-${v.mainCore3}-${vi}`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-md bg-[var(--color-surface)] px-2 sm:px-3 py-1.5 sm:py-2 border border-[var(--color-border-light)]"
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
  if (prev.isFocusPoolCombo !== next.isFocusPoolCombo) return false;
  if (prev.loadTraitVariants !== next.loadTraitVariants) return false;
  // selectedCharCodes는 number[]이므로 shallow 비교
  const a = prev.selectedCharCodes;
  const b = next.selectedCharCodes;
  if (a !== b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  }

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
      className="mt-1 rounded bg-[color-mix(in_srgb,var(--color-surface)_40%,transparent)] px-2 py-1.5 text-[10px] text-[var(--color-muted-foreground)] hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] sm:text-xs"
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
