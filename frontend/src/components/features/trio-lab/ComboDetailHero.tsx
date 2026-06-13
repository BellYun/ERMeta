import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { characterDisplayName, comboTier, type TrioWeaponCombo } from "./types";

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
  listHref: string;
  patchVersion: string;
  tier: string;
}

export function ComboDetailHero({ combo, listHref, patchVersion, tier }: ComboDetailHeroProps) {
  const trioName = combo.members.map((m) => characterDisplayName(m.character)).join(" + ");
  const score = comboTier(combo.winRate, combo.averageRP, combo.averageRank, combo.totalGames);
  const rpText = `${combo.averageRP >= 0 ? "+" : ""}${combo.averageRP.toFixed(1)}`;

  return (
    <header className="analysis-hero flex flex-col gap-5 p-4 sm:p-5 lg:p-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href={listHref}
          scroll={false}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          조합 실험실
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="truncate text-[var(--color-foreground)]">{trioName}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(420px,1fr)] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 font-medium text-[var(--color-muted-foreground)]">
              패치 {patchVersion}
            </span>
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 font-medium text-[var(--color-muted-foreground)]">
              {tier}
            </span>
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 font-mono font-semibold text-[var(--color-foreground)]">
              {combo.totalGames.toLocaleString("ko-KR")} 매치
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-[var(--color-foreground)] sm:text-3xl">
            {trioName}
          </h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(8,13,27,0.58)] p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[132px_1fr] sm:items-stretch">
            <div className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-4">
              <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                조합 등급
              </p>
              <p
                className={`mt-2 font-mono text-[4.2rem] font-black leading-none sm:text-[4.8rem] ${SCORE_COLOR[score] ?? ""}`}
              >
                {score}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <HeroMetric label="승률" value={`${combo.winRate.toFixed(1)}%`} />
              <HeroMetric label="평균 RP" value={rpText} tone="gold" />
              <HeroMetric label="평균 순위" value={`#${combo.averageRank.toFixed(1)}`} />
              <HeroMetric label="표본" value={combo.totalGames.toLocaleString("ko-KR")} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gold";
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-3">
      <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-black leading-none tabular-nums sm:text-3xl ${
          tone === "gold" ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
