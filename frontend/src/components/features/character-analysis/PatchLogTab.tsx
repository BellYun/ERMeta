"use client";

import { useLocale } from "next-intl";
import * as React from "react";
import { localizePatchNote } from "@/data/patch-note-localization";
import { getAllPatchVersions, getCharacterPatchHistory } from "@/data/patch-notes";
import type { RouteLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { CHANGE_TYPE_CONFIG } from "./constants";
import { ChangeTypeBadge } from "./PatchNoteComponents";

interface PatchLogTabProps {
  selectedCode: number;
}

const PATCH_VERSIONS = getAllPatchVersions();

const COPY: Record<
  RouteLocale,
  {
    historyCount: (count: number) => string;
    coverage: (oldest: string, newest: string) => string;
    changeCount: (count: number) => string;
    noHistory: string;
    sourceNotice: string;
  }
> = {
  ko: {
    historyCount: (count) => count + "개 버전에서 변경",
    coverage: (oldest, newest) => "패치노트 수집 범위 " + oldest + "–" + newest,
    changeCount: (count) => count + "개 변경",
    noHistory: "수집된 패치노트에 이 실험체의 변경 기록이 없습니다.",
    sourceNotice: "",
  },
  en: {
    historyCount: (count) => "Changes in " + count + (count === 1 ? " patch" : " patches"),
    coverage: (oldest, newest) => "Patch notes collected: " + oldest + "–" + newest,
    changeCount: (count) => count + " balance " + (count === 1 ? "change" : "changes"),
    noHistory: "No changes for this character in the collected patch notes.",
    sourceNotice: "Untranslated details appear in Korean, the source language.",
  },
  ja: {
    historyCount: (count) => count + "件のパッチで変更",
    coverage: (oldest, newest) => "収録パッチノート: " + oldest + "–" + newest,
    changeCount: (count) => count + "件のバランス変更",
    noHistory: "収録済みのパッチノートにこのキャラクターの変更はありません。",
    sourceNotice: "未翻訳の詳細は原文の韓国語で表示します。",
  },
  "zh-Hans": {
    historyCount: (count) => count + " 个版本有改动",
    coverage: (oldest, newest) => "已收录版本说明：" + oldest + "–" + newest,
    changeCount: (count) => count + " 项平衡调整",
    noHistory: "已收录的版本说明中没有该角色的改动。",
    sourceNotice: "未翻译的详情以韩文原文显示。",
  },
  "zh-Hant": {
    historyCount: (count) => count + " 個版本有改動",
    coverage: (oldest, newest) => "已收錄版本說明：" + oldest + "–" + newest,
    changeCount: (count) => count + " 項平衡調整",
    noHistory: "已收錄的版本說明中沒有該角色的改動。",
    sourceNotice: "未翻譯的詳情以韓文原文顯示。",
  },
};

export function PatchLogTab({ selectedCode }: PatchLogTabProps) {
  const locale = useLocale() as RouteLocale;
  const copy = COPY[locale] ?? COPY.ko;
  const history = React.useMemo(() => getCharacterPatchHistory(selectedCode), [selectedCode]);
  const oldest = PATCH_VERSIONS[PATCH_VERSIONS.length - 1];
  const newest = PATCH_VERSIONS[0];
  const coverage = oldest && newest ? copy.coverage(oldest, newest) : null;

  if (history.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted-foreground)]">
        <p>{copy.noHistory}</p>
        {coverage && <p className="mt-1 text-xs">{coverage}</p>}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 sm:px-4">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          {copy.historyCount(history.length)}
        </p>
        {coverage && (
          <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">{coverage}</p>
        )}
        {copy.sourceNotice && (
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {copy.sourceNotice}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {history.map((sourceNote) => {
          const note = localizePatchNote(sourceNote, locale);
          const changeTypes = Array.from(new Set(note.changes.map((change) => change.changeType)));
          return (
            <div
              key={note.patch}
              className="min-w-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 bg-[var(--color-surface-2)] px-3 py-2.5 text-xs sm:px-4">
                <span className="font-semibold text-[var(--color-foreground)]">{note.patch}</span>
                <span className="flex items-center gap-1.5">
                  {changeTypes.map((type) => (
                    <ChangeTypeBadge key={type} type={type} />
                  ))}
                </span>
                <span className="ml-auto text-[11px] text-[var(--color-muted-foreground)]">
                  {copy.changeCount(note.changes.length)}
                </span>
              </div>
              <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {note.changes.map((change, idx) => {
                  const config = CHANGE_TYPE_CONFIG[change.changeType];
                  return (
                    <div
                      key={idx}
                      className="flex min-w-0 gap-2 overflow-hidden px-3 py-2 hover:bg-[var(--color-surface-2)] sm:gap-3 sm:px-4 sm:py-3"
                    >
                      <div className="shrink-0 pt-0.5">
                        <ChangeTypeBadge type={change.changeType} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                          <span className="min-w-0 break-words text-[13px] font-medium text-[var(--color-foreground)] sm:text-sm">
                            {change.target}
                          </span>
                          {change.valueSummary && (
                            <span
                              className={cn(
                                "min-w-0 break-words font-mono text-[11px] sm:text-xs",
                                config.colorClass
                              )}
                            >
                              {change.valueSummary}
                            </span>
                          )}
                        </div>
                        <ul className="min-w-0 space-y-0.5">
                          {change.description.map((desc, di) => (
                            <li
                              key={di}
                              className="break-words text-[11px] text-[var(--color-muted-foreground)] before:mr-1 before:content-['•'] sm:text-xs sm:before:mr-1.5"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
