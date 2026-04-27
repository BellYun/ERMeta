"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  tier: string
): Promise<{ picks: HoneyPickData[]; patchVersion: string }> {
  const params = new URLSearchParams();
  if (patch) params.set("patchVersion", patch);
  params.set("tier", tier);
  const res = await fetch(`/api/meta/honey-picks?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "API 오류");
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
    fetchHoneyPicks(patch, tier)
      .then(({ picks: nextPicks, patchVersion }) => {
        setPicks(nextPicks);
        setCurrentPatch(patchVersion);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [patch, tier, initialData]);

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
      <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
        이번 패치에서 버프 후 떡상한 캐릭터가 없습니다.
      </p>
    );
  }

  return (
    <>
      {/* ── Desktop: Compact 2-column grid ── */}
      <div className="hidden sm:grid grid-cols-2 gap-2.5">
        {resolved.map((r, i) => {
          const changeLabel = r.changeType ? CHANGE_LABEL[r.changeType] : null;

          return (
            <div
              key={r.pick.characterNum}
              className={cn(
                "relative flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 cursor-pointer group transition-colors hover:bg-[var(--color-surface-2)]",
                i === 0 && "col-span-2"
              )}
              onClick={() => {
                trackHoneyClick(r, i + 1);
                router.push(`/character/${r.pick.characterNum}?weapon=${r.pick.bestWeapon}`);
              }}
            >
              {/* Rank */}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black bg-gradient-to-br",
                  RANK_STYLE[i + 1] ??
                    "from-[var(--color-surface-3)] to-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                )}
              >
                {i + 1}
              </span>

              {/* Character image */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
                <Image
                  src={r.halfUrl}
                  alt={r.name}
                  fill
                  className="object-cover object-top"
                  sizes="48px"
                  priority={i < 3}
                />
              </div>

              {/* Name + weapon + badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-[var(--color-foreground)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {r.name}
                  </p>
                  {changeLabel && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8px] font-bold shrink-0",
                        changeLabel.color,
                        changeLabel.bg
                      )}
                    >
                      {changeLabel.text}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">
                  {r.weaponName}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-[9px] text-[var(--color-muted-foreground)] uppercase">승률</p>
                  <p className="text-sm font-bold tabular-nums text-[var(--color-foreground)]">
                    {r.pick.winRate.toFixed(1)}%
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      r.pick.winRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.winRateDelta >= 0 ? "+" : ""}
                    {r.pick.winRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-[var(--color-muted-foreground)] uppercase">픽률</p>
                  <p className="text-sm font-bold tabular-nums text-[var(--color-foreground)]">
                    {r.pick.pickRate.toFixed(1)}%
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      r.pick.pickRateDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {r.pick.pickRateDelta >= 0 ? "+" : ""}
                    {r.pick.pickRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-[var(--color-muted-foreground)] uppercase">RP</p>
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
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
                      "text-[10px] font-semibold tabular-nums",
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
                    {r.pick.averageRP.toFixed(0)} RP
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
