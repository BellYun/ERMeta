import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ADSENSE_SLOTS, canRenderAdSlot } from "@/components/ads/adsenseConfig";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import type { ActiveRouteLocale } from "@/i18n/routing";
import { buildHomeMetaView, DEFAULT_HOME_TIER, type HomeMetaStats } from "@/lib/homeMetaShared";
import { localizeRoutePath } from "@/lib/seoLocales";
import { HomeAdPlacementSlot } from "./HomeAdPlacementSlot";
import { HomeCompositionPreview } from "./HomeCompositionPreview";
import { PatchForecastComparison } from "./PatchForecastComparison";

export async function PatchHomePage({
  locale,
  currentPatch,
  homeMetaStats,
}: {
  locale: ActiveRouteLocale;
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
}) {
  const t = await getTranslations({ locale, namespace: "patchHome" });
  const view = buildHomeMetaView(homeMetaStats, DEFAULT_HOME_TIER);
  const rankingsHref = localizeRoutePath("/rankings", locale);
  return (
    <div className="page-shell home-shell patch-home patch-home--editorial">
      <section className="home-entry" aria-labelledby="home-entry-title">
        <header>
          <p className="patch-home__kicker">ER&amp;GG · {t("patch", { patch: currentPatch })}</p>
          <h1 id="home-entry-title">{t("welcomeTitle")}</h1>
          {canRenderAdSlot(ADSENSE_SLOTS.homeRanking) ? <HomeAdPlacementSlot /> : null}
          <PatchForecastComparison
            locale={locale}
            currentPatch={currentPatch}
            homeMetaStats={homeMetaStats}
            preview
          />
          <div className="home-entry__rankings">
            <p className="home-entry__rankings-caption">
              {t("rankingsShortcutHint")} · {t("patch", { patch: homeMetaStats.patchVersion })}
            </p>
            <div className="home-entry__rankings-intro" inert aria-hidden="true">
              <TierRankingTable initialData={view.rankingData} />
            </div>
            <Link href={rankingsHref}>
              {t("rankingsShortcutCta")} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <div className="home-entry__paths">
          <article className="home-entry__team">
            <p className="home-entry__eyebrow">{t("welcomeTeamLabel")}</p>
            <h2>{t("welcomeTeamTitle")}</h2>
            <p className="home-entry__description">{t("welcomeTeamBody")}</p>
            <div className="home-entry__combo-preview" aria-label={t("welcomeExample")}>
              <div className="home-entry__composition-result">
                <HomeCompositionPreview />
              </div>
              <Link
                className="home-entry__primary"
                href={localizeRoutePath("/synergy-detail", locale)}
              >
                {t("welcomeTeamCta")} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
