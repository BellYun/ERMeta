import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { characterDisplayName, comboTier, weaponDisplayName, type TrioWeaponCombo } from "./types";

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

      <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-end">
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
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {combo.members.map((member) => (
              <Link
                key={`${member.character}-${member.weapon}`}
                href={`/character/${member.character}`}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(8,13,27,0.48)] p-2 transition-colors hover:border-[rgba(96,165,250,0.34)] hover:bg-[rgba(96,165,250,0.08)]"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <Image
                    src={getCharacterMiniWebpUrl(member.character)}
                    alt={characterDisplayName(member.character)}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--color-foreground)]">
                    {characterDisplayName(member.character)}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                    {weaponDisplayName(member.weapon)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(8,13,27,0.58)] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                조합 등급
              </p>
              <p
                className={`mt-1 font-mono text-[3.2rem] font-black leading-none ${SCORE_COLOR[score] ?? ""}`}
              >
                {score}
              </p>
            </div>
            <div className="pb-1 text-right font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">
              <p>
                승률{" "}
                <span className="font-bold text-[var(--color-foreground)]">
                  {combo.winRate.toFixed(1)}%
                </span>
              </p>
              <p>
                평균 RP <span className="font-bold text-[var(--color-accent-gold)]">{rpText}</span>
              </p>
              <p>
                평균 순위{" "}
                <span className="font-bold text-[var(--color-foreground)]">
                  #{combo.averageRank.toFixed(1)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
