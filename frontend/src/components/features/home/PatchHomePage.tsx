import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { buildHomeMetaView, DEFAULT_HOME_TIER, type HomeMetaStats } from "@/lib/homeMetaShared";
import { HomeCompositionPreview } from "./HomeCompositionPreview";
import { PatchForecastComparison } from "./PatchForecastComparison";

export async function PatchHomePage({
  locale,
  currentPatch,
  homeMetaStats,
}: {
  locale: string;
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
}) {
  const t = await getTranslations({ locale, namespace: "patchHome" });
  const nav = await getTranslations({ locale, namespace: "navigation" });
  const view = buildHomeMetaView(homeMetaStats, DEFAULT_HOME_TIER);
  const rankingsHref = `/${locale}/rankings`;
  return (
    <div className="page-shell home-shell patch-home patch-home--editorial">
      <section className="home-entry" aria-labelledby="home-entry-title">
        <header>
          <p className="patch-home__kicker">ER&amp;GG · {t("patch", { patch: currentPatch })}</p>
          <h1 id="home-entry-title">{t("welcomeTitle")}</h1>
          <PatchForecastComparison
            locale={locale}
            currentPatch={currentPatch}
            homeMetaStats={homeMetaStats}
            preview
          />
          <div className="home-entry__rankings">
            <p className="home-entry__rankings-caption">{t("rankingsShortcutHint")}</p>
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
              <Link className="home-entry__primary" href={`/${locale}/synergy-detail`}>
                {t("welcomeTeamCta")} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <nav className="patch-home__destinations" aria-label={t("explore")}>
        <Link href={rankingsHref}>
          <span>{t("compare")}</span>
          <h2>{nav("characterRankings")}</h2>
          <p>{t("rankingBody")}</p>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link href={`/${locale}/synergy-detail`}>
          <span>{t("combine")}</span>
          <h2>{nav("synergyRecommendation")}</h2>
          <p>{t("comboBody")}</p>
          <ArrowRight aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
