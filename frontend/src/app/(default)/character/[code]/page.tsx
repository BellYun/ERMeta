import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CharacterPageContent } from "@/components/features/character-analysis/CharacterPageContent";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { getAllPatchVersions } from "@/data/patch-notes";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { buildDefaultAlternates } from "@/lib/seoLocales";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { getStaticTranslator, OG_LOCALE_BY_LANGUAGE } from "@/lib/staticIntl";

export const dynamic = "force-static";
export const dynamicParams = false;

interface Props {
  params: Promise<{ code: string }>;
}

export function generateStaticParams() {
  return CHARACTER_CODES.map((code) => ({ code: String(code) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;

  const code = parseInt(rawCode, 10);
  const t = await getStaticTranslator("characterMetadata", DEFAULT_LANGUAGE);
  const name =
    !Number.isNaN(code) && CHARACTER_CODES.includes(code)
      ? resolveCharacterName(code, loadL10nMap(DEFAULT_LANGUAGE), buildFallbackMap())
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
        locale: OG_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko_KR",
        title: t("openGraphTitle", { title }),
        description,
        url: `/character/${code}`,
      },
      twitter: {
        title: t("twitterTitle", { title }),
        description,
      },
      alternates: buildDefaultAlternates(`/character/${code}`),
      robots: {
        index: true,
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
      locale: OG_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko_KR",
      title: t("openGraphTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
      url: "/character",
    },
    twitter: {
      title: t("twitterTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
    },
    alternates: buildDefaultAlternates("/character"),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DefaultCharacterPage({ params }: Props) {
  const { code: rawCode } = await params;

  const code = parseInt(rawCode, 10);

  if (Number.isNaN(code) || !CHARACTER_CODES.includes(code)) {
    notFound();
  }

  // 패치노트 최신 버전이 자동으로 맨 앞(기본 선택)에 온다.
  const patches = getAllPatchVersions();

  return (
    <CharacterPageContent
      locale="ko"
      code={code}
      patches={patches}
      initialStats={null}
      initialPrevStats={null}
    />
  );
}
