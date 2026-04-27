"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { useTraitNames } from "@/hooks/useTraitNames";
import { cn } from "@/lib/utils";
import { TierGroup } from "@/utils/tier";

// ─── 특성 그룹 분류 ───────────────────────────────────────────────────────────

type TraitGroup = "havoc" | "fortification" | "support" | "chaos" | "unknown";

function createGroupConfig(t: (key: string) => string) {
  return {
    havoc: {
      label: t("groups.havoc.name"),
      letter: t("groups.havoc.letter"),
      bg: "bg-red-500/20",
      text: "text-red-400",
      ring: "ring-red-500/40",
    },
    fortification: {
      label: t("groups.fortification.name"),
      letter: t("groups.fortification.letter"),
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      ring: "ring-blue-500/40",
    },
    support: {
      label: t("groups.support.name"),
      letter: t("groups.support.letter"),
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      ring: "ring-emerald-500/40",
    },
    chaos: {
      label: t("groups.chaos.name"),
      letter: t("groups.chaos.letter"),
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      ring: "ring-purple-500/40",
    },
    unknown: {
      label: t("groups.unknown.name"),
      letter: t("groups.unknown.letter"),
      bg: "bg-[var(--color-surface-2)]",
      text: "text-[var(--color-muted-foreground)]",
      ring: "ring-[var(--color-border)]",
    },
  } satisfies Record<
    TraitGroup,
    { label: string; letter: string; bg: string; text: string; ring: string }
  >;
}

type GroupConfigMap = ReturnType<typeof createGroupConfig>;

function getTraitGroup(code: number): TraitGroup {
  if (code === 7000501) return "chaos";
  const sub = Math.floor(code / 100);
  if (sub === 70107) return "chaos";
  if (sub === 71108) return "support";

  const prefix = Math.floor(code / 100000);
  if (prefix === 70) return "havoc";
  if (prefix === 71) return "fortification";
  if (prefix === 72) return "support";
  if (prefix === 73) return "chaos";
  return "unknown";
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TraitSubOption {
  code: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

interface TraitSecondaryInfo {
  secGroup: TraitGroup;
  totalGames: number;
  pickRate: number;
  winRate: number;
  optionTrait1Options: TraitSubOption[];
  optionTrait2Options: TraitSubOption[];
}

interface TraitMainGroup {
  mainGroup: TraitGroup;
  totalGames: number;
  groupPickRate: number;
  groupWinRate: number;
  mainCoreOptions: TraitSubOption[];
  sub1Options: TraitSubOption[];
  sub2Options: TraitSubOption[];
  secondaries: TraitSecondaryInfo[];
}

interface Props {
  characterCode: number;
  tier: TierGroup;
  patchVersion: string | null;
  bestWeapon: number | null;
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function TraitIcon({
  code,
  name,
  pickRate,
  winRate: _winRate,
  size = 28,
}: {
  code: number;
  name?: string;
  pickRate: number;
  winRate: number;
  size?: number;
}) {
  const [imgError, setImgError] = React.useState(false);
  const t = useTranslations("characterTraitBuild");
  const groupConfig = React.useMemo(() => createGroupConfig(t), [t]);
  const config = groupConfig[getTraitGroup(code)];
  const isEmpty = pickRate === 0;

  return (
    <div className={cn("flex flex-col items-center gap-0.5", isEmpty && "opacity-30")}>
      <div
        className={cn(
          "relative rounded-md p-0.5",
          !isEmpty && pickRate >= 30 ? "ring-1 ring-[var(--color-accent-gold)]/60" : ""
        )}
      >
        {!imgError ? (
          <Image
            src={`/TraitSkill/TraitSkillIcon_${code}.png`}
            alt={name ?? String(code)}
            width={size}
            height={size}
            className="rounded-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-sm text-[9px] font-bold",
              config.bg,
              config.text
            )}
            style={{ width: size, height: size }}
          >
            {config.letter}
          </span>
        )}
      </div>
      <span className="text-[9px] text-[var(--color-foreground)] truncate max-w-[48px] text-center">
        {name ?? config.label}
      </span>
      <span
        className={cn(
          "text-[8px]",
          isEmpty
            ? "text-[var(--color-muted-foreground)]"
            : pickRate >= 30
              ? "text-[var(--color-accent-gold)]"
              : "text-[var(--color-primary)]"
        )}
      >
        {pickRate.toFixed(1)}%
      </span>
    </div>
  );
}

function SlotRow({
  label,
  options,
  traitNames,
  config,
}: {
  label: string;
  options: TraitSubOption[];
  traitNames: Record<number, string>;
  config: GroupConfigMap[TraitGroup];
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex items-start gap-2 py-2">
      <span className={cn("shrink-0 text-[10px] font-semibold pt-2 w-10", config.text)}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map(
          (opt) =>
            opt.code != null && (
              <TraitIcon
                key={opt.code}
                code={opt.code}
                name={traitNames[opt.code]}
                pickRate={opt.pickRate}
                winRate={opt.winRate}
              />
            )
        )}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function CharacterTraitBuildAnalyzer({
  characterCode,
  tier,
  patchVersion,
  bestWeapon,
}: Props) {
  const { l10n } = useL10n();
  const t = useTranslations("characterTraitBuild");
  const [builds, setBuilds] = React.useState<TraitMainGroup[]>([]);
  const traitNames = useTraitNames(l10n);
  const [loading, setLoading] = React.useState(false);
  const groupConfig = React.useMemo(() => createGroupConfig(t), [t]);

  React.useEffect(() => {
    if (!patchVersion) return;

    setLoading(true);
    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    });

    fetch(`/api/builds/traits/main?${params}`)
      .then((r) => r.json())
      .then((d) => setBuilds(d.builds ?? []))
      .catch(() => setBuilds([]))
      .finally(() => setLoading(false));
  }, [characterCode, tier, patchVersion, bestWeapon]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 text-center text-sm text-[var(--color-muted-foreground)]">
        {t("empty.builds")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {builds.map((group, gi) => {
        const mainConfig = groupConfig[group.mainGroup];

        return (
          <div
            key={gi}
            className={cn(
              "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden",
              gi === 0 && "ring-1 ring-[var(--color-accent-gold)]/30"
            )}
          >
            {/* 주특성 헤더 */}
            <div
              className={cn(
                "flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[var(--color-border)]",
                mainConfig.bg
              )}
            >
              <div className="flex items-center gap-2">
                {gi === 0 && (
                  <span className="text-xs font-bold text-[var(--color-accent-gold)]">#1</span>
                )}
                <span className={cn("text-sm font-bold", mainConfig.text)}>{mainConfig.label}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {t("labels.matches", { count: group.totalGames.toLocaleString() })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--color-muted-foreground)]">
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {t("labels.pick", { value: group.groupPickRate.toFixed(1) })}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    group.groupWinRate >= 55
                      ? "text-[var(--color-accent-gold)]"
                      : "text-[var(--color-foreground)]"
                  )}
                >
                  {t("labels.win", { value: group.groupWinRate.toFixed(1) })}
                </span>
              </div>
            </div>

            {/* 주특성: 코어 + 슬롯1 + 슬롯2 */}
            <div className="px-3 sm:px-4 py-1 border-b border-[var(--color-border)]/50 divide-y divide-[var(--color-border)]/20">
              <SlotRow
                label={t("labels.core")}
                options={group.mainCoreOptions}
                traitNames={traitNames}
                config={mainConfig}
              />
              <SlotRow
                label={t("labels.slot1")}
                options={group.sub1Options}
                traitNames={traitNames}
                config={mainConfig}
              />
              <SlotRow
                label={t("labels.slot2")}
                options={group.sub2Options}
                traitNames={traitNames}
                config={mainConfig}
              />
            </div>

            {/* 부특성 3열 */}
            {group.secondaries.length > 0 && (
              <div>
                <div className="px-3 sm:px-4 py-1.5 bg-[var(--color-surface-2)]/40 border-b border-[var(--color-border)]/50">
                  <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-muted-foreground)]">
                    {t("labels.secondary")}
                  </span>
                </div>
                <div
                  className={cn(
                    "grid gap-px bg-[var(--color-border)]/20",
                    group.secondaries.length === 1 && "grid-cols-1",
                    group.secondaries.length === 2 && "grid-cols-2",
                    group.secondaries.length >= 3 && "grid-cols-1 sm:grid-cols-3"
                  )}
                >
                  {group.secondaries.map((sec, si) => {
                    const secConfig = groupConfig[sec.secGroup];
                    const isEmpty = sec.totalGames === 0;
                    return (
                      <div
                        key={si}
                        className={cn("bg-[var(--color-surface)]/80 p-3", isEmpty && "opacity-40")}
                      >
                        {/* 부특성 그룹 헤더 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "flex items-center justify-center rounded-full h-5 w-5",
                                secConfig.bg
                              )}
                            >
                              <span className={cn("text-[10px] font-black", secConfig.text)}>
                                {secConfig.letter}
                              </span>
                            </div>
                            <span className={cn("text-xs font-bold", secConfig.text)}>
                              {secConfig.label}
                            </span>
                          </div>
                          <div className="flex gap-1.5 text-[9px]">
                            <span className="text-[var(--color-muted-foreground)]">
                              {t("labels.pick", { value: sec.pickRate.toFixed(0) })}
                            </span>
                            {!isEmpty && (
                              <span
                                className={cn(
                                  sec.winRate >= 55
                                    ? "text-[var(--color-accent-gold)]"
                                    : "text-[var(--color-muted-foreground)]"
                                )}
                              >
                                {t("labels.win", { value: sec.winRate.toFixed(1) })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 슬롯1 + 슬롯2 아이콘 */}
                        {!isEmpty ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {sec.optionTrait1Options.map(
                                (opt) =>
                                  opt.code != null && (
                                    <TraitIcon
                                      key={opt.code}
                                      code={opt.code}
                                      name={traitNames[opt.code]}
                                      pickRate={opt.pickRate}
                                      winRate={opt.winRate}
                                      size={24}
                                    />
                                  )
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {sec.optionTrait2Options.map(
                                (opt) =>
                                  opt.code != null && (
                                    <TraitIcon
                                      key={opt.code}
                                      code={opt.code}
                                      name={traitNames[opt.code]}
                                      pickRate={opt.pickRate}
                                      winRate={opt.winRate}
                                      size={24}
                                    />
                                  )
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[var(--color-muted-foreground)] text-center py-2">
                            {t("empty.cell")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
