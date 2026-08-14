"use client";

import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { TierBadge } from "@/components/features/TierBadge";
import { Link } from "@/i18n/navigation";
import type { CompositionAffinityEvidence } from "@/lib/characterAffinityComposition";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import {
  buildTrioCompositionInsight,
  type CompositionMemberDuty,
  type TrioCompositionInsight,
} from "@/lib/synergyComposition";
import { assignComboTier, COMBO_TIER_WEIGHTS, PERFORMANCE_TIER_MIN_GAMES } from "@/lib/tierScoring";
import { cn } from "@/lib/utils";
import { getWeaponGroupImageUrl } from "@/lib/weaponMap";
import { TraitIcon } from "./TraitIcon";
import type { TrioWeaponResult } from "./types";
import { useTapGuard } from "./useTapGuard";

/*
 * Composition analysis is supplemental to the recommendation statistics.
 * Keep it out of the result commit so a newly arrived result cannot monopolize
 * the main thread before the user's next selection is handled.
 */
const COMPOSITION_INSIGHT_DELAY_MS = 100;

function useDeferredCompositionInsight(
  group: GroupedCombo,
  affinityEvidence?: CompositionAffinityEvidence
) {
  const insightKey = `${group.character1}:${group.weaponType1}|${group.character2}:${group.weaponType2}|${group.character3}:${group.weaponType3}|${affinityEvidence?.key ?? "legacy"}:${affinityEvidence?.matchedMembers ?? 0}:${affinityEvidence?.prototype?.key ?? "no-prototype"}`;
  const suppliedInsight = affinityEvidence ? null : (group.compositionInsight ?? null);
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
      const insight = buildTrioCompositionInsight(
        [
          { character: group.character1, weapon: group.weaponType1 },
          { character: group.character2, weapon: group.weaponType2 },
          { character: group.character3, weapon: group.weaponType3 },
        ],
        affinityEvidence
      );
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
    affinityEvidence,
    insightKey,
    suppliedInsight,
  ]);

  if (suppliedInsight) return suppliedInsight;
  return computed?.key === insightKey ? computed.insight : null;
}

/** Level 1 (접힘): 실험체+무기 조합 (mainCore 집계) */
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

interface ComboWeaponCardProps {
  group: GroupedCombo;
  rank: number;
  getCharName: (code: number) => string;
  getWeaponName: (code: number) => string;
  getTraitName: (code: number) => string | null;
  selectedCharCodes: number[];
  isFocusPoolCombo?: boolean;
  loadTraitVariants?: (group: GroupedCombo, signal?: AbortSignal) => Promise<TrioWeaponResult[]>;
  /** 추천(gold ring) 실험체 Link 클릭 시 호출. 부모가 analytics 발화. 메모이제이션 유지를 위해 ref-stable하게 전달할 것. */
  onRecommendationClick?: (pickedCode: number, pickedRank: number) => void;
  affinityEvidence?: CompositionAffinityEvidence;
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
  affinityEvidence,
}: ComboWeaponCardProps) {
  const t = useTranslations("synergyComboCard");
  const compositionInsight = useDeferredCompositionInsight(group, affinityEvidence);
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
  const successfulPrototype = affinityEvidence?.prototype;
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
  const affinityMemberByKey = React.useMemo(
    () =>
      new Map(
        (affinityEvidence?.members ?? []).map((member) => [
          `${member.characterCode}_${member.weapon}`,
          member,
        ])
      ),
    [affinityEvidence?.members]
  );
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
        className="w-full flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:py-2 text-left cursor-pointer rounded-md hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)]"
      >
        {/* 순위 */}
        <span
          className={cn(
            "w-4 sm:w-5 shrink-0 text-center text-xs sm:text-sm font-bold",
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
            <TierBadge tier={tier} className="h-5 min-w-5 text-[9px] sm:h-6 sm:min-w-6" />
          </span>
        ) : null}

        {/* 3실험체 + 무기 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {ordered.map((m, i) => {
              const isRecommended = !selectedCharCodes.includes(m.char);
              const weaponIconUrl = getWeaponGroupImageUrl(m.weapon);
              return (
                <React.Fragment key={`${m.char}-${m.weapon}`}>
                  <Link
                    href={`/character/${m.char}?weapon=${m.weapon}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRecommended) onRecommendationClick?.(m.char, rank);
                    }}
                    onTouchEnd={(e) => e.stopPropagation()}
                    // 외부 div[role=button]가 특성 토글을 처리하므로 링크의 포인터 이벤트를 분리한다.
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    aria-label={`${getCharName(m.char)} ${getWeaponName(m.weapon)} 상세 보기`}
                    className="group/member flex flex-col items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    <div
                      className={cn(
                        "relative h-7 w-7 sm:h-9 sm:w-9",
                        isRecommended
                          ? "text-[var(--color-accent-gold)]"
                          : "text-[var(--color-foreground)]"
                      )}
                    >
                      <span
                        className={cn(
                          "relative block h-full w-full overflow-hidden rounded-md bg-[var(--color-border)] transition-colors group-hover/member:outline group-hover/member:outline-1 group-hover/member:outline-[var(--color-accent)]",
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
                          sizes="(max-width: 640px) 28px, 36px"
                        />
                      </span>
                      {weaponIconUrl ? (
                        <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-4 w-4 place-items-center rounded-full border shadow-sm sm:h-5 sm:w-5">
                          <Image
                            src={weaponIconUrl}
                            alt=""
                            width={16}
                            height={16}
                            className="h-3.5 w-3.5 object-contain sm:h-4 sm:w-4"
                            aria-hidden="true"
                          />
                        </span>
                      ) : null}
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
                  </Link>
                  {i < 2 && (
                    <span className="text-[8px] sm:text-[10px] text-[var(--color-border)] self-start mt-2 sm:mt-3">
                      +
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 소표본 배지 */}
        {isSmallSample && (
          <span className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-[var(--color-warning)] shrink-0">
            {t("smallSample")}
          </span>
        )}

        {/* 스탯 */}
        <div
          data-combo-toggle-hit-area
          className="ml-auto flex items-center gap-1.5 sm:gap-4 text-right"
        >
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

      {compositionInsight && showTraits ? (
        <div className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_72%,transparent)] px-2 py-1.5">
          <div
            data-composition-explanation
            data-composition-pattern={compositionInsight.pattern}
            className="text-xs leading-5 sm:text-[13px]"
          >
            <div className="border-b border-[var(--color-border)] pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent-foreground)]" />
                <p className="text-sm font-bold text-[var(--color-foreground)]">
                  {compositionAnalysisTitle}
                </p>
              </div>
              <p
                data-composition-pattern-summary
                className="mt-1.5 leading-5 text-[var(--color-muted-foreground)]"
              >
                <span className="font-bold text-[var(--color-foreground)]">
                  {t(`composition.patterns.${compositionInsight.pattern}`)}
                  {": "}
                </span>
                {t(`composition.patternDescriptions.${compositionInsight.pattern}`)}
              </p>
            </div>
            {/* Hallmark · component: composition role summary · genre: modern-minimal
             * theme: Mineral Signal · critique: P5 H5 E4 S5 R5 V4
             */}
            {successfulPrototype ? (
              <div
                data-successful-composition-prototype={successfulPrototype.match}
                className="mt-1.5 border-y border-[var(--color-border)] py-1.5"
              >
                <p className="text-sm font-bold text-[var(--color-foreground)]">
                  {t("composition.prototype.title")}
                </p>
                <div className="mt-1 grid lg:grid-cols-3">
                  {orderedMemberDuties.map((duty, dutyIndex) => {
                    const classification = affinityMemberByKey.get(
                      `${duty.character}_${duty.weapon}`
                    )?.classification;
                    const newType = classification
                      ? [classification.role, classification.groupName, classification.subtype]
                          .filter(
                            (value, index, values) =>
                              Boolean(value) && values.indexOf(value) === index
                          )
                          .join(" · ")
                      : null;

                    return (
                      <div
                        key={`${duty.character}_${duty.weapon}`}
                        data-prototype-member-duty={`${duty.character}_${duty.weapon}`}
                        className={cn(
                          "min-w-0 py-1.5 first:pt-0 last:pb-0 lg:px-1.5 lg:py-0 lg:first:pl-0 lg:last:pr-0",
                          dutyIndex > 0 &&
                            "border-t border-[var(--color-border)] lg:border-l lg:border-t-0"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[var(--color-foreground)]">
                            {getCharName(duty.character)}
                          </span>
                          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-foreground)]">
                            {t(`composition.combatTasks.${duty.task}`)}
                          </span>
                          {duty.secondaryTask ? (
                            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                              {t("composition.combatDoctrine.labels.dutySecondary")}
                              {" · "}
                              {t(`composition.combatTasks.${duty.secondaryTask}`)}
                            </span>
                          ) : null}
                        </div>
                        {newType ? (
                          <p
                            data-character-type={`${duty.character}_${duty.weapon}`}
                            className="mt-1 min-w-0 break-words text-[10px] font-semibold text-[var(--color-accent-foreground)] sm:text-[11px]"
                          >
                            {newType}
                          </p>
                        ) : null}
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
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-1.5 space-y-1">
              <div
                data-combat-doctrine
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/55 p-1.5"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="mr-1 text-sm font-bold text-[var(--color-foreground)]">
                    {t("composition.combatDoctrine.title")}
                  </p>
                  {doctrineFeatureLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]"
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
                {!successfulPrototype ? (
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
                            <span className="rounded-full bg-[var(--color-accent)]/12 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent-foreground)]">
                              {t(`composition.combatTasks.${duty.task}`)}
                            </span>
                            {duty.secondaryTask ? (
                              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                                {t("composition.combatDoctrine.labels.dutySecondary")}
                                {" · "}
                                {t(`composition.combatTasks.${duty.secondaryTask}`)}
                              </span>
                            ) : null}
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 특성 브레이크다운 */}
      {showTraits && (
        <div
          data-trait-breakdown
          className="px-2 py-2 flex flex-col gap-1.5 bg-[var(--color-surface-2)] border-t border-[var(--color-border)]"
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
              {/* 특성 아이콘 — 실험체 열과 동일 gap/너비 */}
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
  if (prev.affinityEvidence !== next.affinityEvidence) return false;
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
