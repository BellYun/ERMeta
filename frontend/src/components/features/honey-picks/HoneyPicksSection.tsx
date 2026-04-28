"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route";
import { useL10n } from "@/components/L10nProvider";
import { getCharacterPatchNote } from "@/data/patch-notes";
import type { CharacterPatchNote } from "@/data/patch-notes";
import { analytics } from "@/lib/analytics";
import {
  buildFallbackMap,
  getCharacterHalfImageUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";
import { useFilter } from "../FilterContext";
import { PatchNoteBottomSheet } from "./PatchNoteBottomSheet";

const FALLBACK_MAP = buildFallbackMap();

export function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType);
  if (types.every((t) => t === "buff")) return "buff";
  if (types.every((t) => t === "nerf")) return "nerf";
  return "rework";
}

export const CHANGE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  buff: { text: "BUFF", color: "text-[var(--color-stat-up)]", bg: "bg-[var(--color-stat-up)]/10" },
  nerf: {
    text: "NERF",
    color: "text-[var(--color-stat-down)]",
    bg: "bg-[var(--color-stat-down)]/10",
  },
  rework: {
    text: "ADJUST",
    color: "text-[var(--color-primary)]",
    bg: "bg-[var(--color-primary)]/10",
  },
};

const RANK_STYLE: Record<number, string> = {
  1: "from-[#FFD700] to-[#FFA500] text-black",
  2: "from-[#C0C0C0] to-[#A0A0A0] text-black",
  3: "from-[#CD7F32] to-[#A0522D] text-white",
};

async function fetchHoneyPicks(
  patch: string | undefined,
  tier: string,
  fallbackMessage: string
): Promise<{ picks: HoneyPickData[]; patchVersion: string }> {
  const params = new URLSearchParams();
  if (patch) params.set("patchVersion", patch);
  params.set("tier", tier);
  const res = await fetch(`/api/meta/honey-picks?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? fallbackMessage);
  return {
    picks: data.picks ?? [],
    patchVersion: data.patchVersion ?? patch ?? "",
  };
}

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
  const { patch, tier } = useFilter();
  const router = useRouter();
  const [picks, setPicks] = React.useState<HoneyPickData[]>(initialData ?? []);
  const [loading, setLoading] = React.useState(!initialData || initialData.length === 0);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPatch, setCurrentPatch] = React.useState<string>(initialPatchVersion ?? "");
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

  const isInitialRender = React.useRef(true);
  React.useEffect(() => {
    if (isInitialRender.current && initialData && initialData.length > 0) {
      isInitialRender.current = false;
      setLoading(false);
      return;
    }
    isInitialRender.current = false;

    setLoading(true);
    setError(null);
    fetchHoneyPicks(patch, tier, t("apiError"))
      .then(({ picks: nextPicks, patchVersion }) => {
        setPicks(nextPicks);
        setCurrentPatch(patchVersion);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("errorFallback")))
      .finally(() => setLoading(false));
  }, [patch, tier, initialData, t]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--color-danger)]">{error}</p>;
  }

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

          return (
            <div
              key={r.pick.characterNum}
              className="char-card group cursor-pointer p-4"
              onClick={() => {
                trackHoneyClick(r, i + 1);
                router.push(`/character/${r.pick.characterNum}?weapon=${r.pick.bestWeapon}`);
              }}
            >
              <span
                className={cn(
                  "absolute left-4 top-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-sm font-black bg-gradient-to-br shadow-[0_14px_24px_-18px_rgba(0,0,0,0.92)]",
                  RANK_STYLE[i + 1] ??
                    "from-[var(--color-surface-3)] to-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                )}
              >
                {i + 1}
              </span>

              <div className="flex items-start gap-3 pl-10">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.04)]">
                  <Image
                    src={r.halfUrl}
                    alt={r.name}
                    fill
                    className="object-cover object-top"
                    sizes="72px"
                    priority={i < 3}
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[1.05rem] font-extrabold tracking-[-0.04em] text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary-hover)]">
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
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
            </div>
          );
        })}
      </div>

      {/* ── Mobile: Card grid ── */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;
          return (
            <div
              key={r.pick.characterNum}
              className={cn(
                "relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform touch-manipulation",
                i === 0 && "col-span-2"
              )}
              style={{ aspectRatio: i === 0 ? "16/9" : "3/4" }}
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
                  router.push(`/character/${r.pick.characterNum}`);
                }
              }}
            >
              <Image
                src={r.halfUrl}
                alt={r.name}
                fill
                className="object-cover object-top"
                sizes="50vw"
                priority={i < 2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              {/* Rank + badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black shadow bg-gradient-to-br",
                    RANK_STYLE[i + 1] ??
                      "from-[var(--color-surface-3)] to-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
                {changeLabel && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm",
                      changeLabel.color,
                      changeLabel.bg
                    )}
                  >
                    {changeLabel.text}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="absolute bottom-0 inset-x-0 p-2.5">
                <p
                  className={cn("font-bold text-white truncate", i === 0 ? "text-base" : "text-sm")}
                >
                  {r.name}
                </p>
                <p className="text-[10px] text-white/50 truncate">{r.weaponName}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  <span className="font-semibold tabular-nums text-white">
                    {r.pick.winRate.toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-stat-up)] tabular-nums font-medium">
                    +{r.pick.winRateDelta.toFixed(1)}
                  </span>
                  <span className="ml-auto text-[var(--color-accent-gold)] tabular-nums font-semibold">
                    {r.pick.averageRP >= 0 ? "+" : ""}
                    {r.pick.averageRP.toFixed(0)} {t("stats.rp")}
                  </span>
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
              `/character/${mobileSheet.pick.characterNum}?weapon=${mobileSheet.pick.bestWeapon}`
            );
          }}
        />
      )}
    </>
  );
}
