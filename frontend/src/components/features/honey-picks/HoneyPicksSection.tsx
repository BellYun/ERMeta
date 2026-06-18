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
  buff: { text: "상향", color: "text-[var(--color-stat-up)]", bg: "bg-[var(--color-stat-up)]/10" },
  nerf: {
    text: "하향",
    color: "text-[var(--color-stat-down)]",
    bg: "bg-[var(--color-stat-down)]/10",
  },
  rework: {
    text: "조정",
    color: "text-[var(--color-primary)]",
    bg: "bg-white border border-[var(--color-border)]",
  },
};

const RANK_STYLE: Record<number, string> = {
  1: "border-[var(--color-border-light)] bg-white text-[var(--color-foreground)]",
  2: "border-[var(--color-border)] bg-white text-[var(--color-foreground)]",
  3: "border-[var(--color-border)] bg-white text-[var(--color-foreground)]",
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

    // 버프/조정 캐릭터가 4개 미만이면 나머지를 승률 상승 캐릭터로 채움
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
      {/* ── Desktop: Dashboard row ── */}
      <div className="hidden sm:grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;
          const desktopPatchNote = r.changeType === "buff" ? r.patchNote : null;
          const previewChanges = desktopPatchNote?.changes.slice(0, 2) ?? [];

          return (
            <div
              key={r.pick.characterNum}
              className="char-card group cursor-pointer p-4"
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
              <span
                className={cn(
                  "absolute left-4 top-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold",
                  RANK_STYLE[i + 1] ??
                    "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
                )}
              >
                {i + 1}
              </span>

              <div className="flex items-start gap-3 pl-10">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <Image
                    src={r.halfUrl}
                    alt={r.name}
                    fill
                    className="object-cover object-top"
                    sizes="72px"
                    priority={i < 1}
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[1.05rem] font-bold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary-hover)]">
                      {r.name}
                    </p>
                    {changeLabel && (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0",
                          changeLabel.color,
                          changeLabel.bg
                        )}
                      >
                        {changeLabel.text}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)] truncate">
                    {r.weaponName}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--color-border)]/70 pt-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("stats.winRate")}
                  </p>
                  <p className="mt-1 text-[1.05rem] font-bold tabular-nums text-[var(--color-foreground)]">
                    {r.pick.winRate.toFixed(1)}%
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[0.95rem] font-semibold tabular-nums",
                      r.pick.winRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.winRateDelta >= 0 ? "+" : ""}
                    {r.pick.winRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="min-w-0 border-x border-[var(--color-border)]/50 px-2">
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("stats.pickRate")}
                  </p>
                  <p className="mt-1 text-[1.05rem] font-bold tabular-nums text-[var(--color-foreground)]">
                    {r.pick.pickRate.toFixed(1)}%
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[0.95rem] font-semibold tabular-nums",
                      r.pick.pickRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.pickRateDelta >= 0 ? "+" : ""}
                    {r.pick.pickRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="min-w-0 pl-2">
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {t("stats.rp")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[1.05rem] font-bold tabular-nums",
                      r.pick.averageRP >= 0
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {r.pick.averageRP >= 0 ? "+" : ""}
                    {r.pick.averageRP.toFixed(0)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[0.95rem] font-semibold tabular-nums",
                      r.pick.averageRPDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.averageRPDelta >= 0 ? "+" : ""}
                    {r.pick.averageRPDelta.toFixed(1)}
                  </p>
                </div>
              </div>

              {desktopPatchNote && previewChanges.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-white/98" />
                  <div className="absolute inset-0 flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-2 pr-10">
                      {changeLabel && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0",
                            changeLabel.color,
                            changeLabel.bg
                          )}
                        >
                          {changeLabel.text}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                        {t("patch", { patch: desktopPatchNote.patch })}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {previewChanges.map((change, changeIndex) => (
                        <div
                          key={`${change.target}-${changeIndex}`}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
                        >
                          <p className="text-[11px] font-semibold leading-5 text-[var(--color-foreground)]">
                            {change.target}
                          </p>
                          {change.valueSummary && (
                            <p className="mt-1 text-[11px] leading-5 text-[var(--color-primary-hover)]">
                              {change.valueSummary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: Card grid ── */}
      <div
        tabIndex={0}
        aria-label="모바일 상승 캐릭터 카드 목록"
        className="sm:hidden -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide"
      >
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;
          return (
            <div
              key={r.pick.characterNum}
              className={cn(
                "relative w-[138px] shrink-0 snap-start overflow-hidden rounded-lg border border-[var(--color-border)] bg-white cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
              )}
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
              <div className="absolute inset-0 bg-white/90" />

              {/* Rank + badge */}
              <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold",
                    RANK_STYLE[i + 1] ??
                      "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
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
                <p className="truncate text-[1.05rem] font-bold text-[var(--color-foreground)]">
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
