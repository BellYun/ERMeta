import { ArrowLeft, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { characterDisplayName, scoreFromWinRate, type TrioWeaponCombo } from "./types";

const SCORE_COLOR: Record<string, string> = {
  "S+": "text-[var(--color-accent-gold)]",
  S: "text-[var(--color-accent-gold)]",
  A: "text-[var(--color-primary-hover)]",
  B: "text-[#34d399]",
  C: "text-[var(--color-accent-purple)]",
  D: "text-[var(--color-muted-foreground)]",
};

interface ComboDetailHeroProps {
  combo: TrioWeaponCombo;
  patchVersion: string;
  tier: string;
}

export function ComboDetailHero({ combo, patchVersion, tier }: ComboDetailHeroProps) {
  const trioName = combo.members.map((m) => characterDisplayName(m.character)).join(" + ");
  const score = scoreFromWinRate(combo.winRate, combo.totalGames);

  return (
    <header className="analysis-hero flex flex-col gap-3 p-5 sm:p-7">
      <nav className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href="/trio-lab"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          조합 실험실
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="text-[var(--color-foreground)]">{trioName}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-0.5 font-medium text-[var(--color-muted-foreground)]">
          패치 {patchVersion} · {tier} · {combo.totalGames.toLocaleString("ko-KR")} 매치
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-3">
          <span
            className={`font-mono text-[3rem] font-black leading-none tracking-tighter sm:text-[3.5rem] ${SCORE_COLOR[score] ?? ""}`}
          >
            {score}
          </span>
          <div className="pb-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.04em] text-[var(--color-foreground)] sm:text-3xl">
              {trioName}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              trio-weapon 통계 기반 · 평균 RP {combo.averageRP >= 0 ? "+" : ""}
              {combo.averageRP.toFixed(0)} · 평균 #{combo.averageRank.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
            aria-label="이 조합 북마크"
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={2.2} />
            북마크
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]"
            aria-label="조합 공유"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            공유
          </button>
        </div>
      </div>
    </header>
  );
}
