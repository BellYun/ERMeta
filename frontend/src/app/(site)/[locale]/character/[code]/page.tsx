import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CharacterPageContent } from "@/components/features/character-analysis/CharacterPageContent";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { getAllPatchVersions } from "@/data/patch-notes";
import { LANGUAGE_BY_ROUTE_LOCALE, ROUTE_LOCALES, isRouteLocale } from "@/i18n/routing";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
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
  const t = await getStaticTranslator("characterMetadata", language);
  const name =
    !Number.isNaN(code) && CHARACTER_CODES.includes(code)
      ? resolveCharacterName(code, loadL10nMap(language), buildFallbackMap())
      : null;

  if (name && !name.startsWith("코드:")) {
    const title = t("titleWithName", { name });
    const description = t("descriptionWithName", { name });

    return {
      metadataBase: new URL(BASE_URL),
      title,
      description,
      keywords: [
        t("keywords.character", { name }),
        t("keywords.build", { name }),
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

  // 패치노트 최신 버전이 자동으로 맨 앞(기본 선택)에 온다.
  const patches = getAllPatchVersions();

  return (
    <CharacterPageContent
      locale={locale}
      code={code}
      patches={patches}
      initialStats={null}
      initialPrevStats={null}
    />
  );
}
