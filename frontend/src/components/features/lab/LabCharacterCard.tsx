import Image from "next/image";
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.72)] backdrop-blur-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
          <Image
            src={imgUrl}
            alt={character.characterName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
            {character.characterName}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] truncate">
            {character.weaponName}
          </p>
        </div>
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
