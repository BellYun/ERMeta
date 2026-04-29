import type { Metadata } from "next";
import { HomePageContent } from "@/components/features/home/HomePageContent";
import { getPatches } from "@/lib/getPatches";
import { fetchHoneyPicksServer } from "@/lib/honeyPicks";
import { fetchRankingData } from "@/lib/ranking";

export const revalidate = 3600;
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "메타분석 | 이리와지지" },
  description:
    "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계. 다이아~상위 1000위 데이터 기반 실시간 메타 분석.",
  keywords: [
    "이리와지지",
    "이리와GG",
    "ERGG",
    "이터널리턴 티어표",
    "이터널리턴 메타",
    "이터널리턴 캐릭터 순위",
    "이터널리턴 승률",
    "이터널리턴 픽률",
  ],
  openGraph: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
    url: "/",
  },
  twitter: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
  },
  alternates: { canonical: "/" },
};

export default async function Home() {
  const defaultTier = "MITHRIL";
  const emptyRankingData: Awaited<ReturnType<typeof fetchRankingData>> = {
    rankings: [],
    previousRankings: [],
    patchVersion: "",
    previousPatch: null,
    tier: defaultTier,
  };

  const patches = await getPatches();
  const defaultPatch = patches[0] ?? "";

  let honeyData: Awaited<ReturnType<typeof fetchHoneyPicksServer>> = {
    picks: [],
    patchVersion: "",
    previousPatch: null as string | null,
    tier: defaultTier,
  };
  let rankingData = emptyRankingData;

  if (defaultPatch) {
    try {
      [honeyData, rankingData] = await Promise.all([
        fetchHoneyPicksServer(defaultPatch, defaultTier),
        fetchRankingData(defaultPatch, defaultTier),
      ]);
    } catch {
      honeyData = { ...honeyData, patchVersion: defaultPatch };
      rankingData = { ...emptyRankingData, patchVersion: defaultPatch };
    }
  }

  return (
    <HomePageContent
      patches={patches}
      honeyPicks={honeyData.picks}
      honeyPatchVersion={honeyData.patchVersion}
      rankingData={rankingData}
    />
  );
}
