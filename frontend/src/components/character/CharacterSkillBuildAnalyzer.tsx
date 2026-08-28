"use client";

import { ChevronDown, ChevronRight, GitBranch, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { CharacterSkillBuildResult } from "@/app/api/builds/skills/route";
import { useL10nNamespace } from "@/components/L10nProvider";
import {
  getSkillSlotLabel,
  getSkillMasteryOrder,
  mergeSkillOrderChoices,
  normalizeSkillGroupCode,
  type SkillOrderChoice,
} from "@/lib/characterBuildChoices";
import { getCharacterSkillIconUrl } from "@/lib/characterSkillIcons";
import { cn } from "@/lib/utils";

interface CharacterSkillBuildAnalyzerProps {
  characterCode: number;
  tier: string;
  patchVersion: string | null;
  bestWeapon: number | null;
  mainCore: number | null;
}

const EMPTY_RESULT: CharacterSkillBuildResult = {
  skillOrders: [],
  tacticalSkills: [],
};

const SKILL_ORDER_LEVEL_LIMIT = 17;

function stripGameMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function resolveSkillName(skillNames: Map<string, string>, skillCode: number): string {
  const normalized = normalizeSkillGroupCode(skillCode);
  const value =
    skillNames.get(`Skill/Group/Name/${skillCode}`) ??
    skillNames.get(`Skill/Group/Name/${normalized}`) ??
    skillNames.get(`Skill/Code/Name/${skillCode}`);
  return value ? stripGameMarkup(value) : String(skillCode);
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function SkillOrderPanel({
  characterCode,
  bestWeapon,
  orders,
  skillNames,
}: {
  characterCode: number;
  bestWeapon: number | null;
  orders: SkillOrderChoice[];
  skillNames: Map<string, string>;
}) {
  const t = useTranslations("characterDetailed");
  const synergyT = useTranslations("synergyResults");
  const tierRankingT = useTranslations("tierRanking");
  const [showAll, setShowAll] = React.useState(false);
  const visibleOrders = showAll ? orders : orders.slice(0, 2);

  return (
    <div className="metric-card min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2">
        <GitBranch className="h-4 w-4 text-[var(--color-accent-foreground)]" />
        <h3 className="dashboard-section-title text-xs font-semibold text-[var(--color-foreground)]">
          {t("sections.skillMasterOrder")}
        </h3>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {t("empty.skillBuilds")}
        </div>
      ) : (
        <div>
          <div className="hidden grid-cols-[minmax(174px,0.6fr)_minmax(0,1.65fr)_minmax(118px,0.45fr)] gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 px-3 py-1.5 text-[10px] font-medium text-[var(--color-muted-foreground)] md:grid">
            <span>{t("labels.masterOrder")}</span>
            <span>{t("labels.levelOrder")}</span>
            <span>{t("labels.performance")}</span>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {visibleOrders.map((order, orderIndex) => {
              const visibleSkills = order.skills.slice(0, SKILL_ORDER_LEVEL_LIMIT);
              const masteryOrder = getSkillMasteryOrder(characterCode, visibleSkills);
              const masteredStepIndices = new Set(
                masteryOrder.filter((step) => step.isMastered).map((step) => step.stepIndex)
              );

              return (
                <article
                  key={`${order.skills.join("-")}-${orderIndex}`}
                  className="grid min-w-0 gap-3 px-3 py-3 md:grid-cols-[minmax(174px,0.6fr)_minmax(0,1.65fr)_minmax(118px,0.45fr)] md:items-center"
                >
                  <div className="min-w-0">
                    <span className="mb-2 block text-[10px] font-medium text-[var(--color-muted-foreground)] md:hidden">
                      {t("labels.buildNumber", { number: orderIndex + 1 })}
                      {" · "}
                      {t("labels.masterOrder")}
                    </span>
                    <div className="flex min-w-0 items-center gap-0.5">
                      {masteryOrder.map((step, index) => {
                        const name = resolveSkillName(skillNames, step.skillCode);
                        const iconUrl = getCharacterSkillIconUrl(
                          characterCode,
                          step.slot,
                          bestWeapon
                        );
                        return (
                          <React.Fragment key={step.slot}>
                            {index > 0 && (
                              <ChevronRight
                                aria-hidden="true"
                                className="h-2.5 w-2.5 shrink-0 text-[var(--color-muted-foreground)]"
                              />
                            )}
                            <span
                              title={name}
                              aria-label={`${step.slot}: ${name}`}
                              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] font-bold text-[var(--color-accent-foreground)] shadow-sm"
                            >
                              {iconUrl ? (
                                <>
                                  <Image
                                    aria-hidden="true"
                                    src={iconUrl}
                                    alt=""
                                    width={32}
                                    height={32}
                                    unoptimized
                                    className="h-full w-full object-cover"
                                  />
                                  <span
                                    aria-hidden="true"
                                    className="absolute bottom-0 right-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-tl bg-black/75 px-0.5 text-[8px] font-bold leading-none text-white"
                                  >
                                    {step.slot}
                                  </span>
                                </>
                              ) : (
                                step.slot
                              )}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="mb-2 block text-[10px] font-medium text-[var(--color-muted-foreground)] md:hidden">
                      {t("labels.levelOrder")}
                    </span>
                    <ol className="flex min-w-0 flex-wrap gap-1">
                      {visibleSkills.map((skillCode, stepIndex) => {
                        const name = resolveSkillName(skillNames, skillCode);
                        const slot = getSkillSlotLabel(characterCode, skillCode);
                        const mastered = masteredStepIndices.has(stepIndex);
                        return (
                          <li
                            key={`${skillCode}-${stepIndex}`}
                            title={`${stepIndex + 1}. ${name}`}
                            className={cn(
                              "flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[11px] font-semibold tabular-nums",
                              mastered
                                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-surface)]"
                                : slot === "R"
                                  ? "border-[color-mix(in_srgb,var(--color-danger-readable)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger-readable)_10%,var(--color-surface))] text-[var(--color-danger-readable)]"
                                  : slot === "D"
                                    ? "border-[color-mix(in_srgb,var(--color-success)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))] text-[var(--color-success)]"
                                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
                            )}
                          >
                            <span className="sr-only">{`${stepIndex + 1}. ${name}: `}</span>
                            <span aria-hidden="true">{slot}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--color-border)] pt-2 text-[10px] tabular-nums md:block md:border-l md:border-t-0 md:pl-3 md:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-[var(--color-muted-foreground)]">
                        {t("stats.pickRate")}
                      </dt>
                      <dd className="font-medium text-[var(--color-accent-foreground)]">
                        {order.pickRate.toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-[var(--color-muted-foreground)]">{t("stats.winRate")}</dt>
                      <dd
                        className={cn(
                          "font-medium",
                          order.winRate >= 12.5
                            ? "text-[var(--color-stat-up)]"
                            : "text-[var(--color-danger)]"
                        )}
                      >
                        {order.winRate.toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-[var(--color-muted-foreground)]">
                        {t("stats.averageRp")}
                      </dt>
                      <dd className="font-medium text-[var(--color-foreground)]">
                        {formatSigned(order.averageRP)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          {orders.length > 2 && (
            <div className="border-t border-[var(--color-border)] p-2">
              <button
                type="button"
                aria-expanded={showAll}
                onClick={() => setShowAll((current) => !current)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                {showAll
                  ? tierRankingT("collapse")
                  : synergyT("more", { visible: visibleOrders.length, total: orders.length })}
                <ChevronDown
                  aria-hidden="true"
                  className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TacticalSkillPanel() {
  const t = useTranslations("characterDetailed");

  return (
    <div className="metric-card min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2">
        <Sparkles className="h-4 w-4 text-[var(--color-accent-foreground)]" />
        <h3 className="dashboard-section-title text-xs font-semibold text-[var(--color-foreground)]">
          {t("sections.tacticalSkills")}
        </h3>
      </div>

      <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        {t("empty.tacticalSkills")}
      </div>
    </div>
  );
}

export function CharacterSkillBuildAnalyzer({
  characterCode,
  tier,
  patchVersion,
  bestWeapon,
  mainCore,
}: CharacterSkillBuildAnalyzerProps) {
  const t = useTranslations("characterDetailed");
  const { l10n: skillNames } = useL10nNamespace("skill-names");
  const [data, setData] = React.useState<CharacterSkillBuildResult>(EMPTY_RESULT);
  const [loading, setLoading] = React.useState(true);
  const mergedSkillOrders = React.useMemo(
    () => mergeSkillOrderChoices(data.skillOrders, characterCode),
    [data.skillOrders, characterCode]
  );

  React.useEffect(() => {
    if (!patchVersion) {
      setData(EMPTY_RESULT);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
      ...(mainCore != null ? { mainCore: String(mainCore) } : {}),
    });

    setLoading(true);
    setData(EMPTY_RESULT);

    fetch(`/api/builds/skills?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result: CharacterSkillBuildResult) => setData(result))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setData(EMPTY_RESULT);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [characterCode, tier, patchVersion, bestWeapon, mainCore]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 py-1">
        <span className="dashboard-section-title text-xs font-semibold text-[var(--color-foreground)]">
          {t("sections.skillChoices")}
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(220px,0.55fr)]">
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(220px,0.55fr)]">
          <SkillOrderPanel
            key={`${characterCode}-${tier}-${patchVersion}-${bestWeapon}-${mainCore}`}
            characterCode={characterCode}
            bestWeapon={bestWeapon}
            orders={mergedSkillOrders}
            skillNames={skillNames}
          />
          <TacticalSkillPanel />
        </div>
      )}
    </div>
  );
}
