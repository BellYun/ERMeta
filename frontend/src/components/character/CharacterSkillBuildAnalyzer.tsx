"use client";

import { GitBranch, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { CharacterSkillBuildResult } from "@/app/api/builds/skills/route";
import { useL10nNamespace } from "@/components/L10nProvider";
import {
  getSkillSlotLabel,
  normalizeSkillGroupCode,
  type SkillOrderChoice,
  type TacticalSkillChoice,
} from "@/lib/characterBuildChoices";
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

function resolveTacticalSkillName(skillNames: Map<string, string>, code: number): string {
  const value =
    skillNames.get(`TacticalSkillSet/Code/Name/${code}`) ??
    skillNames.get(`Skill/Group/Name/${code}`) ??
    skillNames.get(`Skill/Group/Name/${normalizeSkillGroupCode(code)}`);
  return value ? stripGameMarkup(value) : String(code);
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function SkillOrderPanel({
  characterCode,
  orders,
  selectedIndex,
  onSelect,
  skillNames,
}: {
  characterCode: number;
  orders: SkillOrderChoice[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  skillNames: Map<string, string>;
}) {
  const t = useTranslations("characterDetailed");
  const selected = orders[selectedIndex] ?? null;

  return (
    <div className="metric-card min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2">
        <GitBranch className="h-4 w-4 text-[var(--color-accent-foreground)]" />
        <h3 className="dashboard-section-title text-xs font-semibold text-[var(--color-foreground)]">
          {t("sections.skillTree")}
        </h3>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {t("empty.skillBuilds")}
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {orders.map((order, index) => (
              <button
                key={`${order.skills.join("-")}-${index}`}
                type="button"
                aria-pressed={selectedIndex === index}
                onClick={() => onSelect(index)}
                className={cn(
                  "min-w-[104px] shrink-0 rounded-md border px-2.5 py-2 text-left transition-colors",
                  selectedIndex === index
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]"
                )}
              >
                <span className="block text-[11px] font-semibold text-[var(--color-foreground)]">
                  {t("labels.buildNumber", { number: index + 1 })}
                </span>
                <span className="mt-0.5 block text-[10px] text-[var(--color-muted-foreground)]">
                  {t("labels.pickShort", { value: order.pickRate.toFixed(1) })}
                </span>
                <span
                  className={cn(
                    "block text-[10px]",
                    order.winRate >= 12.5
                      ? "text-[var(--color-stat-up)]"
                      : "text-[var(--color-danger)]"
                  )}
                >
                  {t("labels.winShort", { value: order.winRate.toFixed(1) })}
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-2.5 py-1.5 text-[10px]">
                <span className="font-medium text-[var(--color-foreground)]">
                  {t("labels.matches", { count: selected.totalGames.toLocaleString() })}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {t("labels.averageRpShort", { value: formatSigned(selected.averageRP) })}
                </span>
              </div>

              <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">
                {selected.skills.map((skillCode, index) => {
                  const name = resolveSkillName(skillNames, skillCode);
                  const slot = getSkillSlotLabel(characterCode, skillCode);
                  return (
                    <li
                      key={`${skillCode}-${index}`}
                      title={`${index + 1}. ${name}`}
                      className="relative flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1.5"
                    >
                      <span className="absolute left-1 top-0.5 text-[8px] tabular-nums text-[var(--color-muted-foreground)]">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                          slot === "R"
                            ? "bg-[color-mix(in_srgb,var(--color-danger-readable)_14%,var(--color-surface))] text-[var(--color-danger-readable)]"
                            : slot === "D"
                              ? "bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))] text-[var(--color-success)]"
                              : "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
                        )}
                      >
                        {slot}
                      </span>
                      <span className="mt-1 w-full truncate text-center text-[8px] text-[var(--color-muted-foreground)]">
                        {name}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TacticalSkillPanel({
  choices,
  selectedIndex,
  onSelect,
  skillNames,
}: {
  choices: TacticalSkillChoice[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  skillNames: Map<string, string>;
}) {
  const t = useTranslations("characterDetailed");

  return (
    <div className="metric-card min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2">
        <Sparkles className="h-4 w-4 text-[var(--color-accent-foreground)]" />
        <h3 className="dashboard-section-title text-xs font-semibold text-[var(--color-foreground)]">
          {t("sections.tacticalSkills")}
        </h3>
      </div>

      {choices.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          {t("empty.tacticalSkills")}
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]/60 p-1.5">
          {choices.map((choice, index) => {
            const selected = selectedIndex === index;
            const name = resolveTacticalSkillName(skillNames, choice.code);
            return (
              <button
                key={choice.code}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                  selected ? "bg-[var(--color-accent-muted)]" : "hover:bg-[var(--color-surface-2)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-accent-foreground)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  T
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[var(--color-foreground)]">
                    {name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--color-muted-foreground)]">
                    {t("labels.matches", { count: choice.totalGames.toLocaleString() })}
                    {" · "}
                    {t("labels.averageRpShort", { value: formatSigned(choice.averageRP) })}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[10px]">
                  <span className="block text-[var(--color-foreground)]">
                    {t("labels.pickShort", { value: choice.pickRate.toFixed(1) })}
                  </span>
                  <span
                    className={cn(
                      "block",
                      choice.winRate >= 12.5
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-danger)]"
                    )}
                  >
                    {t("labels.winShort", { value: choice.winRate.toFixed(1) })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
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
  const [selectedOrderIndex, setSelectedOrderIndex] = React.useState(0);
  const [selectedTacticalIndex, setSelectedTacticalIndex] = React.useState(0);

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
    setSelectedOrderIndex(0);
    setSelectedTacticalIndex(0);

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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.7fr)]">
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.7fr)]">
          <SkillOrderPanel
            characterCode={characterCode}
            orders={data.skillOrders}
            selectedIndex={selectedOrderIndex}
            onSelect={setSelectedOrderIndex}
            skillNames={skillNames}
          />
          <TacticalSkillPanel
            choices={data.tacticalSkills}
            selectedIndex={selectedTacticalIndex}
            onSelect={setSelectedTacticalIndex}
            skillNames={skillNames}
          />
        </div>
      )}
    </div>
  );
}
