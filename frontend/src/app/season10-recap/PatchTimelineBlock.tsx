import Image from "next/image";
import Link from "next/link";
import { getCharacterImageUrl, getCharacterName } from "@/lib/characterMap";
import type { PatchTopGroup } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

interface PatchTimelineBlockProps {
  perPatchTop: PatchTopGroup[];
}

export function PatchTimelineBlock({ perPatchTop }: PatchTimelineBlockProps) {
  return (
    <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]/88">
              Patch Timeline
            </p>
            <h2 className="mt-2 text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.7rem]">
              패치별 평균 RP TOP 5
            </h2>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              미스릴+ 기준, 각 패치에서 가장 높은 평균 RP를 기록한 캐릭터+무기 조합입니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
            총 {perPatchTop.length}개 패치
          </span>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-2 overscroll-x-contain lg:-mx-6 lg:px-6 xl:-mx-7 xl:px-7">
          <div className="flex min-w-max gap-3 pr-1 lg:gap-4">
            {perPatchTop.map(({ patch, entries }) => (
              <PatchColumn key={patch} patch={patch} entries={entries} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PatchColumn({ patch, entries }: PatchTopGroup) {
  return (
    <div className="flex w-[252px] shrink-0 flex-col gap-3 rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-3.5 sm:w-[264px]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            patch
          </p>
          <p className="mt-1 text-base font-black tracking-[-0.04em] text-[var(--color-foreground)]">
            {patch}
          </p>
        </div>
        <span className="rounded-full border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
          TOP 5
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
          데이터 없음
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <PatchRankRow
              key={`${patch}-${entry.characterNum}-${entry.bestWeapon}`}
              rank={i + 1}
              entry={entry}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function PatchRankRow({ rank, entry }: { rank: number; entry: PatchTopGroup["entries"][number] }) {
  const name = getCharacterName(entry.characterNum);
  const weaponName = entry.bestWeapon > 0 ? resolveWeaponName(entry.bestWeapon) : "통합 집계";
  const imageUrl = getCharacterImageUrl(entry.characterNum);
  const href =
    entry.bestWeapon > 0
      ? `/character/${entry.characterNum}?weapon=${entry.bestWeapon}`
      : `/character/${entry.characterNum}`;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-colors",
          rank === 1
            ? "border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)]"
            : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]"
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums",
            rank === 1
              ? "bg-[rgba(251,191,36,0.18)] text-[var(--color-accent-gold)]"
              : rank <= 3
                ? "bg-[rgba(96,165,250,0.12)] text-[var(--color-primary)]"
                : "bg-[rgba(255,255,255,0.06)] text-[var(--color-muted-foreground)]"
          )}
        >
          {rank}
        </span>
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-2)]">
          <Image src={imageUrl} alt={name} fill className="object-cover" sizes="36px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
            {name}
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">{weaponName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              entry.averageRP >= 0
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-danger)]"
            )}
          >
            {entry.averageRP >= 0 ? "+" : ""}
            {entry.averageRP.toFixed(1)}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</p>
        </div>
      </Link>
    </li>
  );
}
