import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CharacterPageContent } from "@/components/features/character-analysis/CharacterPageContent";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { getCharacterName } from "@/lib/characterMap";
import { getCachedCharacterStats } from "@/lib/characterStats";
import { getPatches } from "@/lib/getPatches";
import { getStaticTranslator } from "@/lib/staticIntl";
import { TierGroup } from "@/utils/tier";

/** 1시간마다 ISR 재생성 */
export const revalidate = 3600;
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
  const name = !isNaN(code) ? getCharacterName(code) : null;
  const t = await getStaticTranslator("characterMetadata");

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

  const patches = await getPatches();
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? getCachedCharacterStats(code, patches[0], TierGroup.MITHRIL) : null,
    patches[1] ? getCachedCharacterStats(code, patches[1], TierGroup.MITHRIL) : null,
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
