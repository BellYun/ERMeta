import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CharacterPageContent } from "@/components/features/character-analysis/CharacterPageContent";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { LANGUAGE_BY_ROUTE_LOCALE, ROUTE_LOCALES, isRouteLocale } from "@/i18n/routing";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { getCachedCharacterStats } from "@/lib/characterStats";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { getStaticTranslator, OG_LOCALE_BY_LANGUAGE } from "@/lib/staticIntl";

export const dynamic = "force-static";
export const dynamicParams = false;

interface Props {
  params: Promise<{ locale: string; code: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.flatMap((locale) =>
    CHARACTER_CODES.map((code) => ({ locale, code: String(code) }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code: rawCode } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }
  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];

  const code = parseInt(rawCode, 10);
  const translatorPromise = getStaticTranslator("characterMetadata", language);
  const currentPatch = getStatsPatchVersions()[0];
  const name =
    !Number.isNaN(code) && CHARACTER_CODES.includes(code)
      ? resolveCharacterName(code, loadL10nMap(language), buildFallbackMap())
      : null;

  if (name && !name.startsWith("코드:")) {
    const [t, stats] = await Promise.all([
      translatorPromise,
      currentPatch ? getCachedCharacterStats(code, currentPatch, "DIAMOND_PLUS") : null,
    ]);
    const title =
      locale === "ko" && currentPatch
        ? `${name} 빌드/특성/무기 통계 - 이터널리턴 ${currentPatch}`
        : locale === "ja" && currentPatch
          ? `${name} ビルド/特性/武器統計 - Eternal Return ${currentPatch}`
          : currentPatch
            ? `${name} Build, Traits, Weapon Stats - Eternal Return ${currentPatch}`
            : t("titleWithName", { name });
    const description =
      locale === "ko" && stats && stats.totalGames > 0
        ? `이터널리턴 ${name} ${currentPatch} 패치 다이아 이상 통계. 승률 ${stats.winRate.toFixed(1)}%, 픽률 ${stats.pickRate.toFixed(1)}%, 평균 RP ${stats.averageRP.toFixed(1)}, 무기와 조합 데이터.`
        : locale === "ja" && stats && stats.totalGames > 0
          ? `Eternal Return ${name} パッチ${currentPatch}のダイヤ以上統計。勝率${stats.winRate.toFixed(1)}%、ピック率${stats.pickRate.toFixed(1)}%、平均RP ${stats.averageRP.toFixed(1)}、武器とチーム構成データ。`
          : stats && stats.totalGames > 0
            ? `Eternal Return ${name} stats for patch ${currentPatch} in Diamond+. Win rate ${stats.winRate.toFixed(1)}%, pick rate ${stats.pickRate.toFixed(1)}%, average RP ${stats.averageRP.toFixed(1)}, weapons and team comps.`
            : t("descriptionWithName", { name });

    return {
      metadataBase: new URL(BASE_URL),
      title,
      description,
      keywords: [
        t("keywords.character", { name }),
        t("keywords.build", { name }),
        locale === "ko" ? `${name} 특성` : locale === "ja" ? `${name} 特性` : `${name} traits`,
        locale === "ko" ? `${name} 무기` : locale === "ja" ? `${name} 武器` : `${name} weapons`,
        locale === "ko" ? `${name} 조합` : locale === "ja" ? `${name} 構成` : `${name} team comps`,
        locale === "ko"
          ? `이터널리턴 ${name} 빌드`
          : locale === "ja"
            ? `Eternal Return ${name} ビルド`
            : `Eternal Return ${name} build`,
        locale === "ko"
          ? `이터널리턴 ${name} 특성`
          : locale === "ja"
            ? `Eternal Return ${name} 特性`
            : `Eternal Return ${name} traits`,
        locale === "ko"
          ? `이터널리턴 ${name} 무기`
          : locale === "ja"
            ? `Eternal Return ${name} 武器`
            : `Eternal Return ${name} weapons`,
        currentPatch
          ? locale === "ko"
            ? `이터널리턴 ${currentPatch} ${name}`
            : locale === "ja"
              ? `Eternal Return ${currentPatch} ${name}`
              : `Eternal Return ${currentPatch} ${name}`
          : t("keywords.character", { name }),
        t("keywords.winRate", { name }),
        t("keywords.stats", { name }),
        t("keywords.brand"),
        t("keywords.app"),
        t("keywords.analysis"),
      ],
      openGraph: {
        locale: OG_LOCALE_BY_LANGUAGE[language] ?? "ja_JP",
        title: t("openGraphTitle", { title }),
        description,
        url: localizeRoutePath(`/character/${code}`, locale),
      },
      twitter: {
        title: t("twitterTitle", { title }),
        description,
      },
      alternates: buildLocalizedAlternates(`/character/${code}`, locale),
      robots: {
        index: locale === "ko" || locale === "ja",
        follow: true,
      },
    };
  }

  const t = await translatorPromise;

  return {
    metadataBase: new URL(BASE_URL),
    title: t("titleFallback"),
    description: t("descriptionFallback"),
    keywords: [
      t("keywords.brand"),
      t("keywords.app"),
      t("keywords.analysis"),
      t("keywords.fallbackBuild"),
      t("keywords.fallbackStats"),
      t("keywords.fallbackWeapon"),
    ],
    openGraph: {
      locale: OG_LOCALE_BY_LANGUAGE[language] ?? "ja_JP",
      title: t("openGraphTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
      url: localizeRoutePath("/character", locale),
    },
    twitter: {
      title: t("twitterTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
    },
    alternates: buildLocalizedAlternates("/character", locale),
    robots: {
      index: locale === "ko" || locale === "ja",
      follow: true,
    },
  };
}

export default async function LocalizedCharacterPage({ params }: Props) {
  const { locale, code: rawCode } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const code = parseInt(rawCode, 10);

  if (Number.isNaN(code) || !CHARACTER_CODES.includes(code)) {
    notFound();
  }

  // 통계용 패치 목록(제외 패치 제외). 최신 버전이 자동으로 맨 앞(기본 선택)에 온다.
  const patches = getStatsPatchVersions();
  const [currentPatch, previousPatch] = patches;
  const [initialStats, initialPrevStats] = await Promise.all([
    currentPatch ? getCachedCharacterStats(code, currentPatch, "DIAMOND_PLUS") : null,
    previousPatch ? getCachedCharacterStats(code, previousPatch, "DIAMOND_PLUS") : null,
  ]);

  return (
    <CharacterPageContent
      locale={locale}
      code={code}
      patches={patches}
      initialStats={initialStats}
      initialPrevStats={initialPrevStats}
    />
  );
}
