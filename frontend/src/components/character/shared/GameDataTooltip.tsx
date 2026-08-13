"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import itemImageMap from "@/../const/itemImageMap.json";
import itemStatMap from "@/../const/itemStatMap.json";
import { useL10n, useL10nNamespace } from "@/components/L10nProvider";

type DescriptionKind = "item" | "trait";

interface DescriptionContextValue {
  descriptions: Map<string, string>;
  itemStatsByImage: Map<string, ItemStats>;
  language: GameLanguage;
  missingDescription: string;
}

type GameLanguage = "Korean" | "English" | "Japanese";
type ItemStats = Record<string, number>;

const EMPTY_CONTEXT: DescriptionContextValue = {
  descriptions: new Map(),
  itemStatsByImage: new Map(),
  language: "Korean",
  missingDescription: "설명 정보가 아직 없습니다.",
};

const DescriptionContext = React.createContext<DescriptionContextValue>(EMPTY_CONTEXT);

const MISSING_DESCRIPTION_COPY = {
  Korean: "설명 정보가 아직 없습니다.",
  English: "No description is available yet.",
  Japanese: "説明情報はまだありません。",
} as const;

const ITEM_STAT_LABELS: Record<GameLanguage, Record<string, string>> = {
  Korean: {
    adaptiveForce: "적응형 능력치",
    attackPower: "공격력",
    attackPowerByLv: "레벨당 공격력",
    attackSpeedRatio: "공격 속도",
    cooldownReduction: "쿨다운 감소",
    criticalStrikeChance: "치명타 확률",
    criticalStrikeDamage: "치명타 피해량",
    defense: "방어력",
    healerGiveHpHealRatio: "회복 효과",
    hpRegenRatio: "체력 재생",
    increaseBasicAttackDamageRatioByLv: "레벨당 기본 공격 증폭",
    lifeSteal: "모든 피해 흡혈",
    maxHp: "최대 체력",
    maxHpByLv: "레벨당 최대 체력",
    moveSpeed: "이동 속도",
    moveSpeedRatio: "이동 속도",
    normalLifeSteal: "기본 공격 흡혈",
    penetrationDefense: "방어 관통",
    penetrationDefenseRatio: "방어 관통",
    sightRange: "시야",
    skillAmp: "스킬 증폭",
    skillAmpByLevel: "레벨당 스킬 증폭",
    skillAmpRatio: "스킬 증폭",
    tacticalCooldownReduction: "전술 스킬 쿨다운 감소",
    ultCooldownReduction: "궁극기 쿨다운 감소",
    uniqueAttackRange: "공격 사거리",
    uniqueSkillAmpRatio: "스킬 증폭",
    uniqueTenacity: "강인함",
  },
  English: {
    adaptiveForce: "Adaptive Force",
    attackPower: "Attack Power",
    attackPowerByLv: "Attack Power per Level",
    attackSpeedRatio: "Attack Speed",
    cooldownReduction: "Cooldown Reduction",
    criticalStrikeChance: "Critical Strike Chance",
    criticalStrikeDamage: "Critical Strike Damage",
    defense: "Defense",
    healerGiveHpHealRatio: "Healing Power",
    hpRegenRatio: "HP Regen",
    increaseBasicAttackDamageRatioByLv: "Basic Attack Amp per Level",
    lifeSteal: "Omnisyphon",
    maxHp: "Max HP",
    maxHpByLv: "Max HP per Level",
    moveSpeed: "Movement Speed",
    moveSpeedRatio: "Movement Speed",
    normalLifeSteal: "Life Steal",
    penetrationDefense: "Defense Penetration",
    penetrationDefenseRatio: "Defense Penetration",
    sightRange: "Vision Range",
    skillAmp: "Skill Amplification",
    skillAmpByLevel: "Skill Amp per Level",
    skillAmpRatio: "Skill Amplification",
    tacticalCooldownReduction: "Tactical Skill Cooldown Reduction",
    ultCooldownReduction: "Ultimate Cooldown Reduction",
    uniqueAttackRange: "Attack Range",
    uniqueSkillAmpRatio: "Skill Amplification",
    uniqueTenacity: "Tenacity",
  },
  Japanese: {
    adaptiveForce: "適応型能力値",
    attackPower: "攻撃力",
    attackPowerByLv: "レベルごとの攻撃力",
    attackSpeedRatio: "攻撃速度",
    cooldownReduction: "クールダウン短縮",
    criticalStrikeChance: "致命打確率",
    criticalStrikeDamage: "致命打ダメージ",
    defense: "防御力",
    healerGiveHpHealRatio: "回復効果",
    hpRegenRatio: "体力再生",
    increaseBasicAttackDamageRatioByLv: "レベルごとの基本攻撃増幅",
    lifeSteal: "全ダメージ吸血",
    maxHp: "最大体力",
    maxHpByLv: "レベルごとの最大体力",
    moveSpeed: "移動速度",
    moveSpeedRatio: "移動速度",
    normalLifeSteal: "基本攻撃吸血",
    penetrationDefense: "防御貫通",
    penetrationDefenseRatio: "防御貫通",
    sightRange: "視界",
    skillAmp: "スキル増幅",
    skillAmpByLevel: "レベルごとのスキル増幅",
    skillAmpRatio: "スキル増幅",
    tacticalCooldownReduction: "戦術スキルクールダウン短縮",
    ultCooldownReduction: "究極技クールダウン短縮",
    uniqueAttackRange: "攻撃射程",
    uniqueSkillAmpRatio: "スキル増幅",
    uniqueTenacity: "強靭さ",
  },
};

const RATIO_STATS = new Set([
  "attackSpeedRatio",
  "criticalStrikeChance",
  "criticalStrikeDamage",
  "healerGiveHpHealRatio",
  "hpRegenRatio",
  "increaseBasicAttackDamageRatioByLv",
  "lifeSteal",
  "moveSpeedRatio",
  "normalLifeSteal",
  "penetrationDefenseRatio",
  "skillAmpRatio",
  "uniqueSkillAmpRatio",
  "uniqueTenacity",
]);

const DIRECT_PERCENT_STATS = new Set([
  "cooldownReduction",
  "tacticalCooldownReduction",
  "ultCooldownReduction",
]);

function formatStatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function formatItemStats(stats: ItemStats, language: GameLanguage): string {
  const labels = ITEM_STAT_LABELS[language];

  return Object.entries(labels)
    .filter(([field]) => stats[field] !== undefined)
    .map(([field, label]) => {
      const value = stats[field];
      const isPercent = RATIO_STATS.has(field) || DIRECT_PERCENT_STATS.has(field);
      const displayValue = RATIO_STATS.has(field) ? value * 100 : value;
      return `${label} +${formatStatValue(displayValue)}${isPercent ? "%" : ""}`;
    })
    .join("\n");
}

export function formatItemDescription(
  stats: ItemStats | undefined,
  effect: string | undefined,
  language: GameLanguage
): string {
  return [stats ? formatItemStats(stats, language) : "", effect ?? ""].filter(Boolean).join("\n\n");
}

export function formatGameDescription(value: string): string {
  return value
    .replace(/<color(?:=[^>]+)?>/gi, "")
    .replace(/<\/color>/gi, "")
    .replace(/\\n/g, "\n")
    .replace(/\{\d+\}/g, "—")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function GameDataTooltipProvider({ children }: { children: React.ReactNode }) {
  const { language } = useL10n();
  const { l10n: descriptions } = useL10nNamespace("game-descriptions");

  const value = React.useMemo<DescriptionContextValue>(() => {
    const itemStatsByImage = new Map<string, ItemStats>();

    for (const [code, imagePath] of Object.entries(itemImageMap as Record<string, string>)) {
      const stats = (itemStatMap as Record<string, ItemStats>)[code];
      if (stats && !itemStatsByImage.has(imagePath)) {
        itemStatsByImage.set(imagePath, stats);
      }
    }

    return {
      descriptions,
      itemStatsByImage,
      language,
      missingDescription: MISSING_DESCRIPTION_COPY[language],
    };
  }, [descriptions, language]);

  return <DescriptionContext.Provider value={value}>{children}</DescriptionContext.Provider>;
}

export function useGameDescription(kind: DescriptionKind, code: number): string {
  const context = React.useContext(DescriptionContext);
  if (kind === "item") {
    let stats: ItemStats | undefined = (itemStatMap as Record<string, ItemStats>)[String(code)];
    const imagePath = (itemImageMap as Record<string, string>)[String(code)];
    if (!stats && imagePath) stats = context.itemStatsByImage.get(imagePath);
    const effect = context.descriptions.get(`Item/Effect/${code}`);
    const description = formatItemDescription(stats, effect, context.language);
    return description || context.missingDescription;
  }

  const description = context.descriptions.get(`Trait/Tooltip/${code}`);
  return description ? formatGameDescription(description) : context.missingDescription;
}

interface GameDataTooltipProps {
  children: React.ReactNode;
  description: string;
  title: string;
}

export function GameDataTooltip({ children, description, title }: GameDataTooltipProps) {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const tooltipId = React.useId();
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 164;
    const centeredLeft = rect.left + rect.width / 2;
    setPosition({
      left: Math.min(Math.max(centeredLeft, viewportPadding), window.innerWidth - viewportPadding),
      top: rect.top - 8,
    });
  }, []);

  React.useEffect(() => {
    if (!position) return;

    const hide = () => setPosition(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [position]);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={updatePosition}
        onMouseLeave={() => setPosition(null)}
      >
        {children}
      </span>
      {position &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-xl"
            style={{ left: position.left, top: position.top }}
          >
            <p className="text-xs font-semibold text-[var(--color-foreground)]">{title}</p>
            <p className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
