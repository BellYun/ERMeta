"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { getCharacterPatchNote } from "@/data/patch-notes";
import type { RouteLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { CHANGE_TYPE_CONFIG } from "./constants";
import { ChangeTypeBadge } from "./PatchNoteComponents";

interface PatchLogTabProps {
  patches: string[];
  selectedCode: number;
}

const COPY: Record<
  RouteLocale,
  {
    summaryTitle: (count: number) => string;
    summaryBody: string;
  }
> = {
  ko: {
    summaryTitle: (count) => `${count}개 변경`,
    summaryBody: "",
  },
  en: {
    summaryTitle: (count) => `${count} balance ${count === 1 ? "change" : "changes"}`,
    summaryBody: "Change details are based on the Korean patch-note source.",
  },
  ja: {
    summaryTitle: (count) => `${count}件のバランス変更`,
    summaryBody: "変更内容は韓国語パッチノート原文を基準に集計しています。",
  },
  "zh-Hans": {
    summaryTitle: (count) => `${count} 项平衡调整`,
    summaryBody: "变更内容以韩文版本说明原文为基准汇总。",
  },
  "zh-Hant": {
    summaryTitle: (count) => `${count} 項平衡調整`,
    summaryBody: "變更內容以韓文版本說明原文為基準彙整。",
  },
};

export function PatchLogTab({ patches, selectedCode }: PatchLogTabProps) {
  const t = useTranslations("characterPatch");
  const locale = useLocale() as RouteLocale;
  const copy = COPY[locale] ?? COPY.ko;

  if (patches.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        {t("loadingPatches")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patches.slice(0, 5).map((patch, i) => {
        const note = getCharacterPatchNote(selectedCode, patch);
        return (
          <div
            key={patch}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden min-w-0"
          >
            {/* 패치 버전 헤더 */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 sm:px-4 py-2">
              <span className="text-xs font-semibold text-[var(--color-foreground)]">{patch}</span>
              {i === 0 && (
                <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                  {t("current")}
                </span>
              )}
            </div>
            {/* 변경 내역 */}
            {!note || note.changes.length === 0 ? (
              <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-[var(--color-muted-foreground)]">
                {t("noChanges")}
              </div>
            ) : locale !== "ko" ? (
              <div className="px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from(new Set(note.changes.map((change) => change.changeType))).map(
                    (type) => (
                      <ChangeTypeBadge key={type} type={type} />
                    )
                  )}
                  <span className="text-[13px] sm:text-sm font-medium text-[var(--color-foreground)]">
                    {copy.summaryTitle(note.changes.length)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] sm:text-xs text-[var(--color-muted-foreground)]">
                  {copy.summaryBody}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {note.changes.map((change, idx) => {
                  const config = CHANGE_TYPE_CONFIG[change.changeType];
                  return (
                    <div
                      key={idx}
                      className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-[var(--color-surface-2)] overflow-hidden"
                    >
                      <div className="pt-0.5 shrink-0">
                        <ChangeTypeBadge type={change.changeType} />
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 sm:gap-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          <span className="text-[13px] sm:text-sm font-medium text-[var(--color-foreground)] break-words min-w-0">
                            {change.target}
                          </span>
                          {change.valueSummary && (
                            <span
                              className={cn(
                                "text-[11px] sm:text-xs font-mono shrink-0",
                                config.colorClass
                              )}
                            >
                              {change.valueSummary}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-0.5 min-w-0">
                          {change.description.map((desc, di) => (
                            <li
                              key={di}
                              className="text-[11px] sm:text-xs text-[var(--color-muted-foreground)] before:content-['•'] before:mr-1 sm:before:mr-1.5 break-words"
                            >
                              {desc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
