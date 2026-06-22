"use client";

import { useTranslations } from "next-intl";
import type { CharacterPatchNote } from "@/data/patch-notes";
import { cn } from "@/lib/utils";

export function PatchNoteTooltip({ patchNote }: { patchNote: CharacterPatchNote }) {
  const t = useTranslations("tierRanking");

  const changeTypeLabel = (type: string): { text: string; color: string } => {
    if (type === "buff")
      return {
        text: "상향",
        color:
          "text-[var(--color-stat-up)] bg-[var(--color-stat-up)]/10 border-[var(--color-stat-up)]/20",
      };
    if (type === "nerf")
      return {
        text: "하향",
        color:
          "text-[var(--color-stat-down)] bg-[var(--color-stat-down)]/10 border-[var(--color-stat-down)]/20",
      };
    return {
      text: "조정",
      color:
        "text-[var(--color-foreground)] bg-[var(--color-surface)] border-[var(--color-border)]",
    };
  };

  return (
    <div
      className="pointer-events-auto absolute left-0 right-0 top-full z-50 mt-1 w-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:pointer-events-none sm:left-0 sm:right-auto sm:w-96 sm:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-3">
        {t("patchNoteTitle", { patch: patchNote.patch })}
      </p>
      <div className="flex flex-col gap-3">
        {patchNote.changes.map((change, i) => {
          const { text, color } = changeTypeLabel(change.changeType);
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold border", color)}>
                  {text}
                </span>
                <span className="text-xs font-medium text-[var(--color-foreground)]">
                  {change.target}
                </span>
              </div>
              {change.valueSummary && (
                <p className="text-[11px] text-[var(--color-muted-foreground)] pl-1 break-words">
                  {change.valueSummary}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
