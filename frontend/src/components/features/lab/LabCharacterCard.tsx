import Image from "next/image";
import Link from "next/link";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { DivergingBarChart } from "./DivergingBarChart";
import type { LabCharacter } from "./types";

function formatGames(n: number): string {
  return n.toLocaleString("ko-KR");
}

interface Props {
  character: LabCharacter;
}

export function LabCharacterCard({ character }: Props) {
  const imgUrl = getCharacterMiniWebpUrl(character.characterCode);
  const classification = character.classification;

  return (
    <div className="metric-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <Link
          href={`/character/${character.characterCode}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          aria-label={`${character.characterName} 분석 페이지로 이동`}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
            <Image
              src={imgUrl}
              alt={character.characterName}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {character.characterName}
            </p>
            <p className="truncate text-xs text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)]">
              {character.weaponName}
              {classification?.archetype ? ` · ${classification.archetype}` : ""}
            </p>
            {classification?.partnerRoles.length === 2 && classification.partnerDelta != null ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
                {classification.partnerRoles.join(" + ")} 연계 · +
                {classification.partnerDelta.toFixed(2)} RP ·{" "}
                {formatGames(classification.partnerGames)}판
                {classification.partnerGameShare > 0
                  ? ` (${(classification.partnerGameShare * 100).toFixed(1)}%)`
                  : ""}
              </p>
            ) : null}
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-[var(--color-muted-foreground)]">표본</p>
          <p className="text-xs font-semibold tabular-nums text-[var(--color-foreground)]">
            {formatGames(character.totalGames)}
          </p>
        </div>
      </div>

      <DivergingBarChart strong={character.strong} weak={character.weak} />
    </div>
  );
}
