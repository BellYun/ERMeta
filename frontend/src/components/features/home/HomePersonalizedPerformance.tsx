/* Hallmark · component: personalized performance · genre: modern-minimal · theme: Open Studio
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (40–41) · pre-emit critique: P5 H5 E4 S5 R5 V4
 */
"use client";

import { ArrowDown, ArrowRight, ArrowUp, Minus, Settings2, UserRoundPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";
import { TierBadge } from "@/components/features/TierBadge";
import { useL10n } from "@/components/L10nProvider";
import { useFocusCharWeapons } from "@/hooks/useFocusCharWeapons";
import { analytics } from "@/lib/analytics";
import {
  buildFallbackMap,
  getCharacterMiniWebpUrl,
  resolveCharacterName,
} from "@/lib/characterMap";
import type { HomeMetaStats } from "@/lib/homeMetaShared";
import {
  buildHomePersonalizedPerformances,
  type HomePersonalizedPerformance,
} from "@/lib/homePersonalization";
import { cn } from "@/lib/utils";
import { getWeaponGroupImageUrl, resolveWeaponName } from "@/lib/weaponMap";

const fallbackMap = buildFallbackMap();

function Delta({ value, suffix }: { value: number | null; suffix: (formatted: string) => string }) {
  const format = useFormatter();

  if (value === null) {
    return <span className="text-[var(--studio-muted)]">—</span>;
  }

  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const formatted = format.number(Math.abs(value), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs tabular-nums",
        direction === "up"
          ? "text-[var(--color-stat-up)]"
          : direction === "down"
            ? "text-[var(--color-stat-down)]"
            : "text-[var(--studio-muted)]"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {suffix(formatted)}
    </span>
  );
}

function PerformanceCard({
  locale,
  patch,
  previousPatch,
  performance,
}: {
  locale: string;
  patch: string;
  previousPatch: string | null;
  performance: HomePersonalizedPerformance;
}) {
  const t = useTranslations("patchHome.personalization");
  const format = useFormatter();
  const { l10n } = useL10n();
  const name = resolveCharacterName(performance.charCode, l10n, fallbackMap);
  const weaponName =
    performance.weaponCode > 0 ? resolveWeaponName(performance.weaponCode, l10n) : t("allWeapons");
  const weaponIconUrl = getWeaponGroupImageUrl(performance.weaponCode);
  const hasCurrentSample = performance.currentGames > 0 && performance.currentTier !== null;
  const href = `/${locale}/character/${performance.charCode}?weapon=${performance.weaponCode}`;

  return (
    <Link
      href={href}
      aria-label={t("openAnalysis", { name, weapon: weaponName })}
      data-testid="home-personalized-card"
      onClick={() =>
        analytics.homePersonalizedCardClicked({
          characterCode: performance.charCode,
          weaponCode: performance.weaponCode,
          patch,
          currentTier: performance.currentTier,
          sampleState: hasCurrentSample ? "ready" : "collecting",
        })
      }
      className="group flex min-w-0 flex-col rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-surface)] p-4 text-[var(--studio-ink)] outline-none transition-[border-color,background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:border-[var(--studio-control)] hover:bg-[var(--studio-raised)] focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studio-canvas)] active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative h-12 w-12 shrink-0">
          <span className="relative block h-full w-full overflow-hidden rounded-lg bg-[var(--studio-raised)] ring-1 ring-[var(--studio-rule)]">
            <Image
              src={getCharacterMiniWebpUrl(performance.charCode)}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          </span>
          {weaponIconUrl ? (
            <span className="weapon-icon-backdrop absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border shadow-sm">
              <Image src={weaponIconUrl} alt="" width={18} height={18} aria-hidden="true" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-base font-bold">{name}</strong>
          <span className="block truncate text-sm text-[var(--studio-muted)]">{weaponName}</span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[var(--studio-muted)] group-hover:text-[var(--studio-accent)]"
          aria-hidden="true"
        />
      </div>

      {hasCurrentSample ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--studio-rule)] pt-4">
            <div className="min-w-0">
              <dt className="text-xs text-[var(--studio-muted)]">{t("tier")}</dt>
              <dd className="mt-2 flex min-h-11 flex-col items-start gap-1">
                <TierBadge tier={performance.currentTier!} />
                <span className="whitespace-nowrap text-xs text-[var(--studio-muted)]">
                  {performance.previousTier
                    ? t("previousTier", { tier: performance.previousTier })
                    : "—"}
                </span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-[var(--studio-muted)]">{t("averageRp")}</dt>
              <dd className="mt-2 flex min-h-11 flex-col gap-1 font-mono tabular-nums">
                <strong className="text-lg leading-7">
                  {format.number(performance.averageRP ?? 0, { maximumFractionDigits: 1 })}
                </strong>
                <Delta
                  value={performance.averageRPDelta}
                  suffix={(value) => t("rpChange", { value })}
                />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-[var(--studio-muted)]">{t("winRate")}</dt>
              <dd className="mt-2 flex min-h-11 flex-col gap-1 font-mono tabular-nums">
                <strong className="text-lg leading-7">
                  {format.number(performance.winRate ?? 0, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </strong>
                <Delta
                  value={performance.winRateDelta}
                  suffix={(value) => t("winRateChange", { value })}
                />
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[var(--studio-muted)]">
            {t("sample", {
              current: format.number(performance.currentGames),
              previous: performance.previousGames ? format.number(performance.previousGames) : "—",
            })}
          </p>
        </>
      ) : (
        <div className="mt-4 border-t border-[var(--studio-rule)] pt-4" role="status">
          <strong className="block text-sm">{t("collecting")}</strong>
          <p className="mt-1 text-sm leading-6 text-[var(--studio-muted)]">{t("collectingBody")}</p>
        </div>
      )}
      <span className="sr-only">
        {previousPatch ? t("comparison", { patch: previousPatch }) : t("noComparison")}
      </span>
    </Link>
  );
}

export function HomePersonalizedPerformance({
  locale,
  currentPatch,
  homeMetaStats,
}: {
  locale: string;
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
}) {
  const t = useTranslations("patchHome.personalization");
  const [isClient, setIsClient] = React.useState(false);
  const { focusCharWeapons } = useFocusCharWeapons();
  const performances = React.useMemo(
    () => buildHomePersonalizedPerformances(homeMetaStats, focusCharWeapons),
    [focusCharWeapons, homeMetaStats]
  );
  const poolHref = `/${locale}/synergy-detail?focusPool=open#focus-weapon-pool`;

  React.useEffect(() => setIsClient(true), []);

  if (!isClient) {
    return (
      <div
        className="min-h-32 animate-pulse rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-surface)] motion-reduce:animate-none"
        aria-hidden="true"
        data-testid="home-personalization-loading"
      />
    );
  }

  if (focusCharWeapons.length === 0) {
    return (
      <aside
        className="flex flex-col gap-4 rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-surface)] p-4 text-[var(--studio-ink)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
        data-testid="home-personalization-empty"
        aria-label={t("registerTitle")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--studio-accent-soft)] text-[var(--studio-accent)]">
            <UserRoundPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <strong className="block text-base font-bold">{t("registerTitle")}</strong>
            <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--studio-muted)]">
              {t("registerBody")}
            </p>
          </div>
        </div>
        <Link
          href={poolHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-md border border-[var(--studio-accent)] px-4 text-sm font-bold text-[var(--studio-accent)] outline-none transition-[background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:bg-[var(--studio-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studio-surface)] active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:self-center"
        >
          {t("registerCta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    );
  }

  return (
    <section
      className="rounded-[var(--studio-radius)] border border-[var(--studio-rule)] bg-[var(--studio-raised)] p-4 text-[var(--studio-ink)] sm:p-5"
      aria-labelledby="home-personalization-title"
      data-testid="home-personalization-ready"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p id="home-personalization-title" className="text-lg font-bold tracking-[-0.03em]">
            {t("title")}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--studio-muted)]">
            {t("basis", { patch: currentPatch })}
            {homeMetaStats.previousPatch
              ? ` · ${t("comparison", { patch: homeMetaStats.previousPatch })}`
              : ""}
          </p>
        </div>
        <Link
          href={poolHref}
          className="inline-flex min-h-11 items-center gap-2 self-start whitespace-nowrap rounded-md px-2 text-sm font-semibold text-[var(--studio-accent)] outline-none transition-[background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:bg-[var(--studio-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] active:translate-y-px sm:self-auto"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {t("editCta")}
        </Link>
      </header>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {performances.map((performance) => (
          <PerformanceCard
            key={`${performance.charCode}:${performance.weaponCode}`}
            locale={locale}
            patch={currentPatch}
            previousPatch={homeMetaStats.previousPatch}
            performance={performance}
          />
        ))}
      </div>
    </section>
  );
}
