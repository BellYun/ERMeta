"use client";

import Image from "next/image";
import * as React from "react";
import type { CharacterPatchNote } from "@/data/patch-notes";
import type { HoneyPickData } from "@/lib/honeyPicks";
import { cn } from "@/lib/utils";

export function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType);
  if (types.every((t) => t === "buff")) return "buff";
  if (types.every((t) => t === "nerf")) return "nerf";
  if (types.includes("buff") && types.includes("nerf")) return "rework";
  return types[0] ?? "rework";
}

export const CHANGE_LABEL: Record<string, { text: string; color: string }> = {
  buff: {
    text: "버프",
    color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-stat-up)]",
  },
  nerf: {
    text: "너프",
    color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-stat-down)]",
  },
  rework: {
    text: "조정",
    color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
  },
};

interface HoneyPickCardProps {
  pick: HoneyPickData;
  name: string;
  weaponName: string;
  halfUrl: string;
  patchNote: CharacterPatchNote | null;
  changeLabel: { text: string; color: string } | null;
  isCenter: boolean;
  rank: number;
  cardWidth: number;
  onCardClick: () => void;
  onPatchNoteExpand?: () => void;
}

export function HoneyPickCard({
  pick,
  name,
  weaponName,
  halfUrl,
  patchNote,
  changeLabel,
  isCenter,
  rank,
  cardWidth,
  onCardClick,
}: HoneyPickCardProps) {
  return (
    <div className="shrink-0 px-1" style={{ width: `${cardWidth}%` }}>
      <div
        className={cn(
          "group/card relative cursor-pointer rounded-md",
          isCenter ? "z-20 overflow-visible" : "opacity-55 overflow-hidden"
        )}
        onClick={onCardClick}
      >
        {/* Main card */}
        <div className="relative w-full aspect-[4/5] shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Image
            src={halfUrl}
            alt={name}
            fill
            className="object-cover object-top"
            sizes="33vw"
            priority={isCenter}
          />

          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[var(--color-surface)]" />

          {/* Rank badge */}
          <div
            className={cn(
              "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded border text-[11px] font-bold",
              isCenter
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
            )}
          >
            {rank}
          </div>

          {/* Change label */}
          {isCenter && changeLabel && (
            <div className="absolute top-2 right-2">
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px] font-bold",
                  changeLabel.color
                )}
              >
                {changeLabel.text}
              </span>
            </div>
          )}

          {/* Info panel */}
          <div
            className={cn(
              "absolute inset-x-2 bottom-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]",
              isCenter ? "p-2.5" : "p-2"
            )}
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate font-bold text-[var(--color-foreground)]",
                  isCenter ? "text-sm" : "text-xs"
                )}
              >
                {name}
              </p>
              {isCenter && (
                <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted-foreground)]">
                  {weaponName}
                </p>
              )}
            </div>

            {/* Stats - center only */}
            {isCenter && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">승률</p>
                  <p
                    className={cn(
                      "text-[13px] font-bold tabular-nums leading-tight",
                      pick.winRate >= 60
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-foreground)]"
                    )}
                  >
                    {pick.winRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-[var(--color-stat-up)] mt-0.5 tabular-nums">
                    +{pick.winRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="h-7 w-px bg-[var(--color-border)]" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">픽률</p>
                  <p className="text-[13px] font-bold leading-tight text-[var(--color-foreground)] tabular-nums">
                    {pick.pickRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-[var(--color-stat-up)] mt-0.5 tabular-nums">
                    +{pick.pickRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="h-7 w-px bg-[var(--color-border)]" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">RP</p>
                  <p
                    className={cn(
                      "text-[13px] font-bold tabular-nums leading-tight",
                      pick.averageRP >= 0
                        ? "text-[var(--color-accent-gold)]"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {pick.averageRP >= 0 ? "+" : ""}
                    {pick.averageRP.toFixed(0)}
                  </p>
                  <p
                    className={cn(
                      "text-[9px] font-medium mt-0.5 tabular-nums",
                      pick.averageRPDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {pick.averageRPDelta >= 0 ? "+" : ""}
                    {pick.averageRPDelta.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patch note hover panel - desktop only */}
        {isCenter && patchNote && (
          <div
            className={cn(
              "hidden sm:block absolute top-0 left-full h-full w-0 group-hover/card:w-52 overflow-hidden rounded-r",
              "bg-[var(--color-surface)] border-l border-[var(--color-border)]"
            )}
          >
            <div className="w-52 h-full p-3 flex flex-col gap-2 overflow-y-auto">
              <div className="flex items-center gap-1.5">
                {changeLabel && (
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-bold",
                      changeLabel.color
                    )}
                  >
                    {changeLabel.text}
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  패치 {patchNote.patch}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {patchNote.changes.map((change, ci) => {
                  const label = CHANGE_LABEL[change.changeType];
                  return (
                    <div key={ci} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "rounded border px-1 py-0.5 text-[8px] font-bold",
                            label.color
                          )}
                        >
                          {label.text}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--color-foreground)]">
                          {change.target}
                        </span>
                      </div>
                      {change.valueSummary && (
                        <p className="text-[9px] text-[var(--color-muted-foreground)] pl-1 break-words leading-tight">
                          {change.valueSummary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-2 border-t border-[var(--color-border)]/40">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--color-muted-foreground)]">승률 변화</span>
                  <span className="font-semibold text-[var(--color-stat-up)] tabular-nums">
                    +{pick.winRateDelta.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span className="text-[var(--color-muted-foreground)]">RP 변화</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      pick.averageRPDelta >= 0
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-stat-down)]"
                    )}
                  >
                    {pick.averageRPDelta >= 0 ? "+" : ""}
                    {pick.averageRPDelta.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
