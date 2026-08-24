"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useL10n } from "@/components/L10nProvider";
import { getCharacterPatchNote } from "@/data/patch-notes";
import type { CharacterPatchNote } from "@/data/patch-notes";
import { analytics } from "@/lib/analytics";
import {
  buildFallbackMap,
  getCharacterHalfImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import type { HoneyPickData } from "@/lib/honeyPicks";
import { withCurrentSeoLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { PatchNoteBottomSheet } from "./PatchNoteBottomSheet";

const FALLBACK_MAP = buildFallbackMap();

export function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType);
  if (types.every((t) => t === "buff")) return "buff";
  if (types.every((t) => t === "nerf")) return "nerf";
  return "rework";
}

export const CHANGE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  buff: { text: "버프", color: "text-[var(--color-stat-up)]", bg: "bg-[var(--color-stat-up)]/10" },
  nerf: {
    text: "너프",
    color: "text-[var(--color-stat-down)]",
    bg: "bg-[var(--color-stat-down)]/10",
  },
  rework: {
    text: "조정",
    color: "text-[var(--color-foreground)]",
    bg: "bg-[var(--color-surface)] border border-[var(--color-border)]",
  },
};

const RANK_STYLE: Record<number, string> = {
  1: "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]",
  2: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
  3: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
};

interface ResolvedPick {
  pick: HoneyPickData;
  name: string;
  weaponName: string;
  halfUrl: string;
  patchNote: CharacterPatchNote | null;
  changeType: "buff" | "nerf" | "rework" | null;
}

interface HoneyPicksSectionProps {
  initialData?: HoneyPickData[];
  initialPatchVersion?: string;
}

function getPickKey(pick: HoneyPickData) {
  return `${pick.characterNum}:${pick.bestWeapon}`;
}

export function HoneyPicksSection({ initialData, initialPatchVersion }: HoneyPicksSectionProps) {
  const { l10n } = useL10n();
  const t = useTranslations("honeyPicks");
  const router = useRouter();
  const pathname = usePathname();
  const picks = React.useMemo(() => initialData ?? [], [initialData]);
  const currentPatch = initialPatchVersion ?? "";
  const [mobileSheet, setMobileSheet] = React.useState<{
    pick: HoneyPickData;
    patchNote: CharacterPatchNote;
    changeLabel: { text: string; color: string } | null;
  } | null>(null);

  const getCharName = React.useCallback(
    (code: number) => resolveCharacterName(code, l10n, FALLBACK_MAP),
    [l10n]
  );

  const trackHoneyClick = (r: ResolvedPick, rank: number) => {
    analytics.honeyPickClicked({
      characterCode: r.pick.characterNum,
      characterName: r.name,
      weaponCode: r.pick.bestWeapon,
      score: r.pick.honeyScore,
      rank,
    });
  };

  // Resolve picks with patch notes, buff/rework 우선 + 최소 4개 보장
  const resolved = React.useMemo<ResolvedPick[]>(() => {
    const all = picks.map((pick) => {
      const patchNote = getCharacterPatchNote(pick.characterNum, currentPatch) ?? null;
      const changeType = patchNote ? getOverallChangeType(patchNote) : null;
      return {
        pick,
        name: getCharName(pick.characterNum),
        weaponName: resolveWeaponName(pick.bestWeapon, l10n),
        halfUrl: getCharacterHalfImageUrl(pick.characterNum),
        patchNote,
        changeType,
      };
    });

    const buffed = all.filter((r) => r.changeType === "buff" || r.changeType === "rework");

    // 버프/조정 실험체가 4개 미만이면 나머지를 승률 상승 실험체로 채움
    if (buffed.length >= 4) return buffed.slice(0, 5);

    const buffedNums = new Set(buffed.map((r) => r.pick.characterNum));
    const rest = all.filter((r) => !buffedNums.has(r.pick.characterNum));
    return [...buffed, ...rest].slice(0, 5);
  }, [picks, currentPatch, getCharName, l10n]);

  if (resolved.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">{t("empty")}</p>
    );
  }

  return (
    <>
      {/* ── Desktop: comparison ledger ── */}
      <div
        className="home-pick-ledger hidden sm:flex"
        role="group"
        aria-label={t("patch", { patch: currentPatch })}
      >
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;
          const previewChange = r.patchNote?.changes[0] ?? null;

          return (
            <button
              type="button"
              key={getPickKey(r.pick)}
              className="home-pick-ledger__item"
              data-accent={i === 0 ? "true" : undefined}
              onClick={() => {
                trackHoneyClick(r, i + 1);
                router.push(
                  withCurrentSeoLocale(
                    pathname,
                    `/character/${r.pick.characterNum}?weapon=${r.pick.bestWeapon}`
                  )
                );
              }}
            >
              <div className="home-pick-ledger__identity">
                <span
                  className={cn(
                    "home-pick-ledger__rank",
                    RANK_STYLE[i + 1] ??
                      "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
                <div className="home-pick-ledger__portrait">
                  <Image
                    src={r.halfUrl}
                    alt=""
                    aria-hidden="true"
                    fill
                    className="object-cover object-top"
                    sizes="48px"
                    priority={i < 1}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold text-[var(--color-foreground)]">
                      {r.name}
                    </span>
                    {changeLabel && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                          changeLabel.color,
                          changeLabel.bg
                        )}
                      >
                        {changeLabel.text}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-foreground)]">
                    {r.weaponName}
                  </span>
                </div>
              </div>

              <div className="home-pick-ledger__metrics">
                <span className="home-pick-ledger__metric">
                  <span className="home-pick-ledger__metric-label">{t("stats.winRate")}</span>
                  <span className="home-pick-ledger__metric-value">
                    {r.pick.winRate.toFixed(1)}%
                  </span>
                  <span
                    className={cn(
                      "home-pick-ledger__delta",
                      r.pick.winRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.winRateDelta >= 0 ? "+" : ""}
                    {r.pick.winRateDelta.toFixed(1)}
                  </span>
                </span>
                <span className="home-pick-ledger__metric">
                  <span className="home-pick-ledger__metric-label">{t("stats.pickRate")}</span>
                  <span className="home-pick-ledger__metric-value">
                    {r.pick.pickRate.toFixed(1)}%
                  </span>
                  <span
                    className={cn(
                      "home-pick-ledger__delta",
                      r.pick.pickRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.pickRateDelta >= 0 ? "+" : ""}
                    {r.pick.pickRateDelta.toFixed(1)}
                  </span>
                </span>
                <span className="home-pick-ledger__metric">
                  <span className="home-pick-ledger__metric-label">{t("stats.rp")}</span>
                  <span
                    className={cn(
                      "home-pick-ledger__metric-value",
                      r.pick.averageRP >= 0
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {r.pick.averageRP >= 0 ? "+" : ""}
                    {r.pick.averageRP.toFixed(0)}
                  </span>
                  <span
                    className={cn(
                      "home-pick-ledger__delta",
                      r.pick.averageRPDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.averageRPDelta >= 0 ? "+" : ""}
                    {r.pick.averageRPDelta.toFixed(1)}
                  </span>
                </span>
              </div>

              {previewChange && (
                <span className="home-pick-ledger__patch">
                  <span className="home-pick-ledger__patch-target">{previewChange.target}</span>
                  {previewChange.valueSummary && (
                    <span className="home-pick-ledger__patch-value">
                      {previewChange.valueSummary}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: Card grid ── */}
      <div
        tabIndex={0}
        aria-label="모바일 상승 실험체 카드 목록"
        className="sm:hidden -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide"
      >
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;
          return (
            <div
              key={getPickKey(r.pick)}
              className={cn(
                "char-card relative w-[138px] shrink-0 snap-start cursor-pointer touch-manipulation bg-[var(--color-surface)]"
              )}
              data-accent={i === 0 ? "true" : undefined}
              style={{ aspectRatio: "0.72" }}
              onClick={() => {
                trackHoneyClick(r, i + 1);
                if (r.patchNote) {
                  setMobileSheet({
                    pick: r.pick,
                    patchNote: r.patchNote,
                    changeLabel: changeLabel
                      ? {
                          text: changeLabel.text,
                          color: `${changeLabel.color} ${changeLabel.bg}`,
                        }
                      : null,
                  });
                } else {
                  router.push(withCurrentSeoLocale(pathname, `/character/${r.pick.characterNum}`));
                }
              }}
            >
              <Image
                src={r.halfUrl}
                alt={r.name}
                fill
                className="object-cover object-top"
                sizes="138px"
                priority={i < 1}
              />
              <div className="absolute inset-x-0 bottom-0 h-[68%] bg-[var(--color-surface)]/96" />
              <div className="absolute inset-x-0 bottom-[68%] h-10 bg-gradient-to-t from-[var(--color-surface)]/96 to-transparent" />

              {/* Rank + badge */}
              <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold",
                    RANK_STYLE[i + 1] ??
                      "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
                {changeLabel && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[8px] font-bold",
                      changeLabel.color,
                      changeLabel.bg
                    )}
                  >
                    {changeLabel.text}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="truncate text-base font-bold text-[var(--color-foreground)]">
                  {r.name}
                </p>
                <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                  {r.weaponName}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                  <div className="min-w-0">
                    <p className="text-[var(--color-muted-foreground)]">{t("stats.winRate")}</p>
                    <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                      {r.pick.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--color-muted-foreground)]">{t("stats.pickRate")}</p>
                    <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                      {r.pick.pickRate.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[var(--color-stat-up)] tabular-nums font-medium">
                    {r.pick.winRateDelta >= 0 ? "+" : ""}
                    {r.pick.winRateDelta.toFixed(1)}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      r.pick.pickRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.pickRateDelta >= 0 ? "+" : ""}
                    {r.pick.pickRateDelta.toFixed(1)}
                  </span>
                  <div className="col-span-2 mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-2">
                    <span className="text-[var(--color-muted-foreground)]">{t("stats.rp")}</span>
                    <span className="text-[var(--color-accent-gold)] tabular-nums font-semibold">
                      {r.pick.averageRP >= 0 ? "+" : ""}
                      {r.pick.averageRP.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile bottom sheet */}
      {mobileSheet && (
        <PatchNoteBottomSheet
          pick={mobileSheet.pick}
          patchNote={mobileSheet.patchNote}
          changeLabel={mobileSheet.changeLabel}
          characterName={getCharName(mobileSheet.pick.characterNum)}
          onClose={() => setMobileSheet(null)}
          onNavigate={() => {
            setMobileSheet(null);
            router.push(
              withCurrentSeoLocale(
                pathname,
                `/character/${mobileSheet.pick.characterNum}?weapon=${mobileSheet.pick.bestWeapon}`
              )
            );
          }}
        />
      )}
    </>
  );
}
