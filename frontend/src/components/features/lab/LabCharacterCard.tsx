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

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
        <Link
          href={`/character/${character.characterCode}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          aria-label={`${character.characterName} 분석 페이지로 이동`}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
            <Image
              src={imgUrl}
              alt={character.characterName}
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="40px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)] transition group-hover:text-[var(--color-primary)]">
              {character.characterName}
            </p>
            <p className="truncate text-xs text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)]">
              {character.weaponName}
            </p>
          </div>
        </Link>
        <div className="text-right shrink-0">
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
