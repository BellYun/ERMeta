import Image from "next/image";
import Link from "next/link";
import { useL10n } from "@/components/L10nProvider";
import type { ActiveRouteLocale } from "@/i18n/routing";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import { localizeRoutePath } from "@/lib/seoLocales";
import { resolveWeaponName } from "@/lib/weaponMap";
import { DivergingBarChart } from "./DivergingBarChart";
import { formatLabNumber, LAB_COPY, localizeLabRoleText } from "./labLocale";
import type { LabCharacter } from "./types";

const CHARACTER_FALLBACK_MAP = buildFallbackMap();

interface Props {
  character: LabCharacter;
  locale: ActiveRouteLocale;
}

export function LabCharacterCard({ character, locale }: Props) {
  const { l10n } = useL10n();
  const copy = LAB_COPY[locale];
  const imgUrl = getCharacterMiniWebpUrl(character.characterCode);
  const classification = character.classification;
  const characterName = resolveCharacterName(character.characterCode, l10n, CHARACTER_FALLBACK_MAP);
  const weaponName = resolveWeaponName(character.weapon, l10n);
  const partnerRoles = (classification?.partnerRoles ?? []).map((role) =>
    localizeLabRoleText(role, locale)
  );

  return (
    <div className="metric-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <Link
          href={localizeRoutePath(`/character/${character.characterCode}`, locale)}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-accent-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          aria-label={copy.analysisLink(characterName)}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
            <Image
              src={imgUrl}
              alt={characterName}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {characterName}
            </p>
            <p className="truncate text-xs text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-foreground)]">
              {weaponName}
              {locale === "ko" && classification?.archetype
                ? ` · ${classification.archetype}`
                : ""}
            </p>
            {classification?.partnerRoles.length === 2 && classification.partnerDelta != null ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
                {partnerRoles.join(" + ")} {copy.connection} · +
                {classification.partnerDelta.toFixed(2)} RP ·{" "}
                {copy.games(formatLabNumber(classification.partnerGames, locale))}
                {classification.partnerGameShare > 0
                  ? ` (${(classification.partnerGameShare * 100).toFixed(1)}%)`
                  : ""}
              </p>
            ) : null}
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-[var(--color-muted-foreground)]">{copy.sample}</p>
          <p className="text-xs font-semibold tabular-nums text-[var(--color-foreground)]">
            {formatLabNumber(character.totalGames, locale)}
          </p>
        </div>
      </div>

      <DivergingBarChart strong={character.strong} weak={character.weak} locale={locale} />
    </div>
  );
}
