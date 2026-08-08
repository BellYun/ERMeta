"use client";

import { CalendarRange } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type {
  PatchResponseEntry,
  PatchResponseGroup,
  TierPatchResponses,
} from "@/app/season10-recap/BalancePatchResponseBlock";
import { ChangeTypeBadgeStatic } from "@/components/features/patches/ChangeTypeBadgeStatic";
import { Link } from "@/i18n/navigation";
import { getCharacterImageUrl } from "@/lib/characterMap";
import { cn } from "@/lib/utils";

const CHANGE_LABELS = {
  buff: "버프",
  nerf: "너프",
  rework: "조정",
} as const;

function formatRp(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function BalancePatchResponseTabs({ groups }: { groups: PatchResponseGroup[] }) {
  const latestPatch = groups[groups.length - 1]?.patch ?? "";
  const [selectedPatch, setSelectedPatch] = useState(latestPatch);
  const selectedGroup = groups.find((group) => group.patch === selectedPatch) ?? groups[0];

  if (!selectedGroup) return null;

  return (
    <div>
      <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1.5">
        <div
          className="grid grid-cols-3 gap-1 sm:grid-cols-6"
          role="tablist"
          aria-label="패치 버전 선택"
        >
          {groups.map((group) => {
            const isSelected = group.patch === selectedGroup.patch;

            return (
              <button
                key={group.patch}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`patch-response-panel-${group.patch}`}
                onClick={() => setSelectedPatch(group.patch)}
                className={cn(
                  "h-9 rounded-md border text-[10px] font-bold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-accent-foreground)] shadow-sm"
                    : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
                )}
              >
                {group.patch}
              </button>
            );
          })}
        </div>
      </div>

      <PatchResponseCard group={selectedGroup} />
    </div>
  );
}

function PatchResponseCard({ group }: { group: PatchResponseGroup }) {
  return (
    <div
      id={`patch-response-panel-${group.patch}`}
      role="tabpanel"
      className="overflow-visible rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3.5 py-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]">
            <CalendarRange className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              {group.patch} 패치 반응
            </h3>
            <p className="mt-0.5 text-[9px] leading-4 text-[var(--color-muted-foreground)]">
              평균 대비 RP 변동 TOP 3
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[8px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">
          분석 대상 {group.totalResponses}개
        </span>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-3.5">
        <ResponseTierList label="다이아+" entries={group.diamondPlus} />
        <ResponseTierList label="미스릴+" entries={group.mithrilPlus} />
      </div>
    </div>
  );
}

function ResponseTierList({ label, entries }: { label: string; entries: TierPatchResponses }) {
  const visibleCount = entries.buffs.length + entries.nerfs.length;

  return (
    <div className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 sm:p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-[var(--color-foreground)]">{label}</p>
        <span className="text-[8px] tabular-nums text-[var(--color-muted-foreground)]">
          표시 {visibleCount}개
        </span>
      </div>
      <div className="space-y-3">
        <ResponseDirectionList label="상향" entries={entries.buffs} tone="success" />
        <ResponseDirectionList label="하향" entries={entries.nerfs} tone="danger" />
      </div>
    </div>
  );
}

function ResponseDirectionList({
  label,
  entries,
  tone,
}: {
  label: string;
  entries: PatchResponseEntry[];
  tone: "success" | "danger";
}) {
  const toneClass = tone === "success" ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", toneClass)} />
          <p className="text-[9px] font-bold text-[var(--color-foreground)]">{label} 반응</p>
        </div>
        <span className="text-[8px] text-[var(--color-muted-foreground)]">
          TOP {entries.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {entries.length > 0 ? (
          entries.map((entry) => <ResponseRow key={`${label}-${entry.key}`} entry={entry} />)
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2.5 text-center text-[9px] text-[var(--color-muted-foreground)]">
            해당 사례 없음
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseRow({ entry }: { entry: PatchResponseEntry }) {
  const responseTone =
    entry.response >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]";
  const borderTone =
    entry.response >= 0 ? "border-l-[var(--color-success)]" : "border-l-[var(--color-danger)]";

  return (
    <Link
      href={`/character/${entry.characterNum}${entry.weapon > 0 ? `?weapon=${entry.weapon}` : ""}`}
      className={cn(
        "group relative flex min-w-0 items-center gap-2 rounded-md border border-[var(--color-border)] border-l-2 bg-[var(--color-surface)] px-2 py-2 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        borderTone
      )}
    >
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Image
          src={getCharacterImageUrl(entry.characterNum)}
          alt={entry.characterName}
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-[var(--color-foreground)]">
          {entry.characterName}
        </p>
        <p className="mt-0.5 truncate text-[8px] text-[var(--color-muted-foreground)]">
          {entry.weaponName}
        </p>
        <p className="mt-1 truncate font-mono text-[8px] tabular-nums text-[var(--color-muted-foreground)]">
          평균 대비 {formatRp(entry.previousRelativeRp)} →{" "}
          <span className={responseTone}>{formatRp(entry.currentRelativeRp)}</span>
        </p>
      </div>
      <strong
        className={cn(
          "shrink-0 rounded bg-[var(--color-surface-2)] px-1.5 py-1 text-[10px] tabular-nums",
          responseTone
        )}
      >
        {formatRp(entry.response)} RP
      </strong>
      <span className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-50 hidden w-80 max-w-[calc(100vw-2rem)] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-xl group-hover:block group-focus-visible:block">
        <span className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="text-[10px] font-bold text-[var(--color-foreground)]">
            PATCH {entry.patch} 변경 내역
          </span>
          <span className="text-[8px] text-[var(--color-muted-foreground)]">
            {entry.note.changes.length}건
          </span>
        </span>
        <span className="mt-2 block space-y-2.5">
          {entry.note.changes.map((change, index) => (
            <span key={`${entry.key}-${change.target}-${index}`} className="block">
              <span className="flex items-center gap-1.5">
                <ChangeTypeBadgeStatic
                  type={change.changeType}
                  label={CHANGE_LABELS[change.changeType]}
                />
                <span className="text-[10px] font-bold text-[var(--color-foreground)]">
                  {change.target}
                </span>
              </span>
              <span className="mt-1 block text-[9px] leading-4 text-[var(--color-muted-foreground)]">
                {change.description}
              </span>
              {change.valueSummary ? (
                <span className="mt-1 block font-mono text-[8px] leading-4 text-[var(--color-foreground)]">
                  {change.valueSummary}
                </span>
              ) : null}
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}
