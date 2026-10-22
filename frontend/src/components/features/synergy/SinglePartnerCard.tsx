"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { TierBadge } from "@/components/features/TierBadge";
import { useL10n } from "@/components/L10nProvider";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import type { PickPartner } from "@/lib/pickPartnerStats";
import { assignComboTier } from "@/lib/tierScoring";
import { getWeaponGroupImageUrl, resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap } from "./constants";
import styles from "./SinglePartnerCard.module.css";

export function SinglePartnerCard({
  ally,
  partner,
  rank,
  inPool,
  onRecommendationClick,
}: {
  ally: { charCode: number; weaponCode: number | null };
  partner: PickPartner;
  rank: number;
  inPool: boolean;
  onRecommendationClick: () => void;
}) {
  const t = useTranslations("singlePartnerResults");
  const metricT = useTranslations("synergyComboCard");
  const resultsT = useTranslations("synergyResults");
  const { l10n } = useL10n();
  const members = [
    { characterCode: ally.charCode, weaponCode: ally.weaponCode, recommended: false },
    null,
    { characterCode: partner.characterCode, weaponCode: partner.weaponCode, recommended: true },
  ];
  return (
    <article
      data-testid="single-partner-card"
      data-focus-pool={inPool || undefined}
      className={`composition-result-card rounded-md border bg-[var(--color-surface)] ${inPool ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]" : "border-[var(--color-border)]"}`}
    >
      <div className="composition-result-card__summary items-center">
        <span className="composition-result-card__rank text-center text-xs font-bold text-[var(--color-muted-foreground)]">
          {rank}
        </span>
        {partner.totalGames >= 10 && (
          <span className="composition-result-card__tier">
            <TierBadge
              tier={assignComboTier(partner)}
              className="h-5 min-w-5 text-[9px] sm:h-6 sm:min-w-6"
            />
          </span>
        )}
        <div className="composition-result-card__members">
          <div>
            {members.map((member, index) => {
              if (!member)
                return (
                  <div
                    key="unknown"
                    data-testid="unknown-teammate"
                    role="img"
                    aria-label={t("unknownAlly")}
                    className={`${styles.unknown} flex flex-col items-center justify-center gap-0.5 text-[var(--color-muted-foreground)]`}
                  >
                    <div
                      className={`${styles.portrait} flex shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] text-lg font-semibold`}
                      aria-hidden="true"
                    >
                      ?
                    </div>
                    <span className="text-[10px] font-medium">{t("unknown")}</span>
                  </div>
                );
              const name = resolveCharacterName(member.characterCode, l10n, getFallbackMap());
              const weapon = member.weaponCode
                ? resolveWeaponName(member.weaponCode, l10n)
                : t("allWeapons");
              const icon = getWeaponGroupImageUrl(member.weaponCode);
              return (
                <Link
                  key={index}
                  href={`/character/${member.characterCode}${member.weaponCode ? `?weapon=${member.weaponCode}` : ""}`}
                  prefetch={false}
                  onClick={member.recommended ? onRecommendationClick : undefined}
                  aria-label={`${name} ${weapon}`}
                  data-recommended={member.recommended || undefined}
                  className="group/member flex flex-col items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  <span className="composition-result-card__member-label">
                    {t(member.recommended ? "recommended" : "selected")}
                  </span>
                  <div className="relative shrink-0">
                    <span className="relative block h-full w-full overflow-hidden rounded-md bg-[var(--color-border)] ring-1 ring-[var(--color-border)]">
                      <Image
                        src={getCharacterMiniWebpUrl(member.characterCode)}
                        alt={name}
                        fill
                        sizes="(max-width: 480px) 22px, 32px"
                        className="object-cover"
                      />
                    </span>
                    {icon && (
                      <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 z-10 grid h-4 w-4 place-items-center rounded-full border shadow-sm">
                        <Image
                          src={icon}
                          alt=""
                          width={16}
                          height={16}
                          className="h-3 w-3 object-contain"
                        />
                      </span>
                    )}
                  </div>
                  <span
                    className={`truncate text-center text-[11px] font-bold ${member.recommended ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]"}`}
                  >
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        {inPool && <span className="sr-only">{t("inPool")}</span>}
        {partner.totalGames < 10 && (
          <span className="composition-result-card__warning text-[10px] text-[var(--color-muted-foreground)]">
            {metricT("smallSample")}
          </span>
        )}
        <div className="composition-result-card__metrics">
          {[
            [metricT("winRate"), `${partner.winRate.toFixed(1)}%`],
            [
              resultsT("sort.averageRP"),
              `${partner.averageRP > 0 ? "+" : ""}${partner.averageRP.toFixed(2)}`,
            ],
            [metricT("games"), partner.totalGames.toLocaleString()],
            [metricT("averageRank"), partner.averageRank.toFixed(2)],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
