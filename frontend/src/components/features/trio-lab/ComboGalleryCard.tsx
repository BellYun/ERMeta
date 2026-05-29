import { ChevronRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import {
  characterDisplayName,
  scoreFromWinRate,
  weaponDisplayName,
  type TrioWeaponCombo,
} from "./types";

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-accent-gold)]",
  S: "text-[var(--color-accent-gold)]",
  A: "text-[var(--color-primary-hover)]",
  B: "text-[#34d399]",
  C: "text-[var(--color-accent-purple)]",
  D: "text-[var(--color-muted-foreground)]",
};

interface ComboGalleryCardProps {
  combo: TrioWeaponCombo;
  detailHref: string;
  rank: number;
}

export function ComboGalleryCard({ combo, detailHref, rank }: ComboGalleryCardProps) {
  const score = scoreFromWinRate(combo.winRate, combo.totalGames);
  const positiveRP = combo.averageRP > 0;

  return (
    <article className="char-card group relative flex h-full flex-col gap-4 p-4 sm:p-5">
      <header className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[var(--color-muted-foreground)]">
          #{String(rank).padStart(2, "0")}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            positiveRP
              ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.10)] text-[var(--color-stat-up)]"
              : "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.10)] text-[var(--color-stat-down)]"
          }`}
        >
          <TrendingUp className="h-3 w-3" strokeWidth={2.4} />
          {positiveRP ? "+" : ""}
          {combo.averageRP.toFixed(0)} RP
        </span>
      </header>

      <div className="flex items-end gap-2">
        {combo.members.map((m) => (
          <div
            key={`${m.character}-${m.weapon}`}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <Link
              href={`/character/${m.character}`}
              aria-label={`${characterDisplayName(m.character)} 캐릭터 페이지`}
              className="relative block h-14 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] ring-1 ring-transparent transition-all hover:ring-[rgba(96,165,250,0.32)] sm:h-16 sm:w-16"
            >
              <Image
                src={getCharacterMiniWebpUrl(m.character)}
                alt={characterDisplayName(m.character)}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </Link>
            <div className="text-center leading-tight">
              <p className="text-xs font-semibold text-[var(--color-foreground)]">
                {characterDisplayName(m.character)}
              </p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">
                {weaponDisplayName(m.weapon)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
        <span
          className={`font-mono text-lg font-extrabold tracking-tight ${SCORE_COLOR[score] ?? ""}`}
        >
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
          {combo.totalGames.toLocaleString("ko-KR")} 매치
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            승률
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.winRate.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            평균 RP
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            {combo.averageRP >= 0 ? "+" : ""}
            {combo.averageRP.toFixed(0)}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-1 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            평균 순위
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-foreground)]">
            #{combo.averageRank.toFixed(1)}
          </dd>
        </div>
      </dl>

      <footer className="mt-auto pt-1">
        <Link
          href={detailHref}
          scroll={false}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(251,191,36,0.28)] bg-[rgba(251,191,36,0.10)] py-2 text-xs font-bold text-[var(--color-accent-gold)] transition-colors hover:bg-[rgba(251,191,36,0.18)]"
        >
          조합 상세 보기
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Link>
      </footer>
    </article>
  );
}
