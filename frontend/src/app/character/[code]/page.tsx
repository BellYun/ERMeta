import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CharacterPageContent } from "@/components/features/character-analysis/CharacterPageContent";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { fetchPatches, fetchStats } from "@/components/features/character-analysis/utils";
import { getCharacterName } from "@/lib/characterMap";
import { TierGroup } from "@/utils/tier";

/** 1시간마다 ISR 재생성 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = parseInt(rawCode, 10);
  const name = !isNaN(code) ? getCharacterName(code) : null;
  const t = await getTranslations("characterMetadata");

  if (name && !name.startsWith("코드:")) {
    const title = t("titleWithName", { name });
    const description = t("descriptionWithName", { name });

    return {
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
        title: t("openGraphTitle", { title }),
        description,
        url: `/character/${code}`,
      },
      twitter: {
        title: t("twitterTitle", { title }),
        description,
      },
      alternates: { canonical: `/character/${code}` },
    };
  }

  return {
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
      title: t("openGraphTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
      url: "/character",
    },
    twitter: {
      title: t("twitterTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
    },
    alternates: { canonical: "/character" },
  };
}

export default async function CharacterPage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = parseInt(rawCode, 10);

  if (isNaN(code) || !CHARACTER_CODES.includes(code)) {
    notFound();
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com";

  const patches = await fetchPatches(base);
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? fetchStats(code, patches[0], TierGroup.MITHRIL, base) : null,
    patches[1] ? fetchStats(code, patches[1], TierGroup.MITHRIL, base) : null,
  ]);

  return (
    <CharacterPageContent
      code={code}
      patches={patches}
      initialStats={initialStats}
      initialPrevStats={initialPrevStats}
    />
  );
}
