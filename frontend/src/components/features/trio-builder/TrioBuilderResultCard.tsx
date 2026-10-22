import Image from "next/image";
import { useTranslations } from "next-intl";
import { useL10n } from "@/components/L10nProvider";
import { Link } from "@/i18n/navigation";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import type { TeamAssignment } from "@/lib/trioBuilder";
import { getWeaponGroupImageUrl, resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap } from "../synergy/constants";

export function TrioBuilderResultCard({ row, rank }: { row: TeamAssignment; rank: number }) {
  const t = useTranslations("trioBuilder");
  const { l10n } = useL10n();
  const metrics = row.metrics;
  const values = [
    {
      label: t("winRate"),
      value: metrics ? `${metrics.winRate.toFixed(1)}%` : "—",
      emphasized: metrics != null && metrics.winRate >= 12.5,
    },
    {
      label: t("averageRP"),
      value: metrics ? `${metrics.averageRP > 0 ? "+" : ""}${metrics.averageRP.toFixed(2)}` : "—",
    },
    { label: t("totalGames"), value: metrics ? metrics.totalGames.toLocaleString() : "—" },
    {
      label: t("averageRank"),
      value: metrics ? metrics.averageRank.toFixed(2) : "—",
      emphasized: metrics != null && metrics.averageRank <= 3.5,
    },
  ];
  return (
    <article
      className="composition-result-card bg-[var(--studio-surface)]"
      data-testid="trio-assignment"
    >
      <div className="composition-result-card__summary items-center">
        <span className="composition-result-card__rank text-center text-xs font-bold text-[var(--studio-muted)]">
          {rank}
        </span>
        <div className="composition-result-card__members">
          <div>
            {row.members.map((pick, index) => {
              const name = resolveCharacterName(pick.charCode, l10n, getFallbackMap());
              const weapon = pick.weaponCode ? resolveWeaponName(pick.weaponCode, l10n) : "";
              const icon = getWeaponGroupImageUrl(pick.weaponCode);
              return (
                <Link
                  key={index}
                  href={`/character/${pick.charCode}${pick.weaponCode ? `?weapon=${pick.weaponCode}` : ""}`}
                  prefetch={false}
                  aria-label={`${["A", "B", "C"][index]} · ${name}${weapon ? ` · ${weapon}` : ""}`}
                  className="flex flex-col items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)]"
                >
                  <div className="relative shrink-0">
                    <span className="relative block h-full w-full overflow-hidden rounded-md bg-[var(--color-border)] ring-1 ring-[var(--color-border)]">
                      <Image
                        src={getCharacterMiniWebpUrl(pick.charCode)}
                        alt=""
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
                  <span className="truncate text-center text-[11px] font-bold text-[var(--studio-ink)]">
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        {!metrics && (
          <span className="composition-result-card__warning text-[10px] text-[var(--studio-muted)]">
            {t("noData")}
          </span>
        )}
        <div className="composition-result-card__metrics">
          {values.map(({ label, value, emphasized }) => (
            <div key={label}>
              <span>{label}</span>
              <span data-metric-emphasis={emphasized || undefined}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
