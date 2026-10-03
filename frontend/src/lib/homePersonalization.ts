import {
  assignTier,
  computeMetaScores,
  getMetaRankingKey,
} from "@/components/features/tier-ranking/utils";
import type { Tier } from "@/lib/design-tokens";
import { buildHomeMetaView, DEFAULT_HOME_TIER, type HomeMetaStats } from "@/lib/homeMetaShared";
import type { CharacterRankingData } from "@/lib/ranking";

export interface HomePersonalizationSelection {
  charCode: number;
  weaponCode: number;
}

export interface HomePersonalizedPerformance extends HomePersonalizationSelection {
  currentTier: Tier | null;
  previousTier: Tier | null;
  averageRP: number | null;
  averageRPDelta: number | null;
  winRate: number | null;
  winRateDelta: number | null;
  currentGames: number;
  previousGames: number;
}

function getRankingKey(row: Pick<CharacterRankingData, "characterNum" | "bestWeapon">) {
  return `${row.characterNum}:${row.bestWeapon}`;
}

function getTier(row: CharacterRankingData | undefined, scores: Map<number, number>): Tier | null {
  if (!row) return null;
  return assignTier(scores.get(getMetaRankingKey(row)) ?? 0);
}

/**
 * 홈이 이미 받은 현재·이전 패치 통계에서 저장된 실험체+무기 성적만 뽑는다.
 * 저장 순서를 유지해 조합 추천의 내 실험체 풀과 같은 순서로 노출한다.
 */
export function buildHomePersonalizedPerformances(
  stats: HomeMetaStats,
  selections: HomePersonalizationSelection[]
): HomePersonalizedPerformance[] {
  if (selections.length === 0) return [];

  const view = buildHomeMetaView(stats, DEFAULT_HOME_TIER);
  const currentRankings = view.rankingData.rankings;
  const previousRankings = view.rankingData.previousRankings;
  const currentByKey = new Map(currentRankings.map((row) => [getRankingKey(row), row]));
  const previousByKey = new Map(previousRankings.map((row) => [getRankingKey(row), row]));
  const currentScores = computeMetaScores(currentRankings);
  const previousScores = computeMetaScores(previousRankings);

  return selections.map(({ charCode, weaponCode }) => {
    const key = `${charCode}:${weaponCode}`;
    const current = currentByKey.get(key);
    const previous = previousByKey.get(key);

    return {
      charCode,
      weaponCode,
      currentTier: getTier(current, currentScores),
      previousTier: getTier(previous, previousScores),
      averageRP: current?.averageRP ?? null,
      averageRPDelta: current && previous ? current.averageRP - previous.averageRP : null,
      winRate: current?.winRate ?? null,
      winRateDelta: current && previous ? current.winRate - previous.winRate : null,
      currentGames: current?.totalGames ?? 0,
      previousGames: previous?.totalGames ?? 0,
    };
  });
}
