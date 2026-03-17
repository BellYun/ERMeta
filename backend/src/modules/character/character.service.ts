import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];

export interface CharacterRankingData {
  rank: number;
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  top3Rate: number;
}

// View 조회 결과 타입
interface RankingViewRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRPPerGame: number;
  top3Rate: number;
  rank: number;
  tier: string;
  patchVersion: string;
}

/**
 * View 결과를 API 응답 형식으로 변환
 * View에서 이미 pickRate, winRate, rank가 계산되어 있으므로 매핑만 수행
 */
function viewToRankingData(rows: RankingViewRow[]): CharacterRankingData[] {
  return rows.map((r) => ({
    rank: r.rank,
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames,
    pickRate: r.pickRate,
    winRate: r.winRate,
    averageRP: r.averageRPPerGame,
    top3Rate: r.top3Rate,
  }));
}

/**
 * 요청된 티어에 데이터가 없으면 폴백 순서대로 시도
 */
function selectTierData(
  rows: RankingViewRow[],
  requestedTier: string,
): { rankings: CharacterRankingData[]; usedTier: string } {
  const tierOrder = [
    requestedTier,
    ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
  ];
  for (const tier of tierOrder) {
    const tierRows = rows.filter((r) => r.tier === tier);
    if (tierRows.length > 0) {
      return { rankings: viewToRankingData(tierRows), usedTier: tier };
    }
  }
  return { rankings: [], usedTier: requestedTier };
}

@Injectable()
export class CharacterService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async fetchRankingData(patchVersion: string, requestedTier: string) {
    const cacheKey = `ranking:${patchVersion || 'latest'}:${requestedTier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._fetchRankingData(patchVersion, requestedTier),
    );
  }

  private async _fetchRankingData(patchVersion: string, requestedTier: string) {
    const client = this.supabase.getClient();

    // 패치 목록 조회
    const { data: patches } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(50);

    const patchList = (patches ?? []).map(
      (p: { version: string }) => p.version,
    );
    const effectivePatch = patchVersion || patchList[0] || '10.4';
    const currentIndex = patchList.indexOf(effectivePatch);
    const previousPatch =
      currentIndex >= 0 && currentIndex + 1 < patchList.length
        ? patchList[currentIndex + 1]
        : null;

    // character_rankings View에서 조회 (pickRate, winRate, rank가 이미 계산됨)
    const patchVersions = previousPatch
      ? [effectivePatch, previousPatch]
      : [effectivePatch];

    const { data, error } = await client
      .from('character_rankings')
      .select('*')
      .in('patchVersion', patchVersions)
      .in('tier', TIER_FALLBACK_ORDER);

    if (error || !data) {
      return {
        rankings: [],
        previousRankings: [],
        patchVersion: effectivePatch,
        previousPatch: null,
        tier: requestedTier,
      };
    }

    const viewRows = data as RankingViewRow[];
    const currentRows = viewRows.filter((r) => r.patchVersion === effectivePatch);
    const prevRows = previousPatch
      ? viewRows.filter((r) => r.patchVersion === previousPatch)
      : [];

    const { rankings, usedTier } = selectTierData(currentRows, requestedTier);
    const { rankings: previousRankings } =
      prevRows.length > 0
        ? selectTierData(prevRows, usedTier)
        : { rankings: [] as CharacterRankingData[] };

    return {
      rankings,
      previousRankings,
      patchVersion: effectivePatch,
      previousPatch,
      tier: usedTier,
    };
  }

  async getCharacterStats(
    characterCode: number,
    patchVersion: string,
    tier: string,
  ) {
    if (!characterCode || isNaN(characterCode)) {
      return {
        characterNum: characterCode,
        patchVersion,
        tier,
        totalGames: 0,
        pickRate: 0,
        winRate: 0,
        averageRank: 0,
        averageRP: 0,
        top3Rate: 0,
        weapons: [],
      };
    }

    const cacheKey = `char-stats:${characterCode}:${patchVersion}:${tier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getCharacterStats(characterCode, patchVersion, tier),
    );
  }

  private async _getCharacterStats(
    characterCode: number,
    patchVersion: string,
    tier: string,
  ) {
    const emptyResponse = {
      characterNum: characterCode,
      patchVersion,
      tier,
      totalGames: 0,
      pickRate: 0,
      winRate: 0,
      averageRank: 0,
      averageRP: 0,
      top3Rate: 0,
      weapons: [],
    };

    const client = this.supabase.getClient();

    // character_rankings View에서 해당 패치+티어 전체 조회
    const { data, error } = await client
      .from('character_rankings')
      .select('*')
      .eq('patchVersion', patchVersion)
      .eq('tier', tier);

    if (error || !data || data.length === 0) return emptyResponse;

    const viewRows = data as RankingViewRow[];
    const rows = viewRows.filter((r) => r.characterNum === characterCode);

    if (rows.length === 0) return emptyResponse;

    // 캐릭터별 무기 통계 (View에서 이미 계산된 값 사용)
    const totalGames = rows.reduce((sum, r) => sum + r.totalGames, 0);
    const weapons = rows
      .map((r) => ({
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames,
        pickRate: totalGames > 0 ? (r.totalGames / totalGames) * 100 : 0,
        winRate: r.winRate,
        averageRank: 0, // View에 averageRank가 있지만 무기별은 별도
        averageRP: r.averageRPPerGame,
      }))
      .sort((a, b) => b.totalGames - a.totalGames);

    // 전체 pickRate는 View에서 이미 계산됨 — 합산
    const totalPickRate = rows.reduce((sum, r) => sum + r.pickRate, 0);
    const weightedWinRate =
      totalGames > 0
        ? rows.reduce((sum, r) => sum + r.winRate * r.totalGames, 0) / totalGames
        : 0;
    const weightedRP =
      totalGames > 0
        ? rows.reduce((sum, r) => sum + r.averageRPPerGame * r.totalGames, 0) / totalGames
        : 0;
    const weightedTop3 =
      totalGames > 0
        ? rows.reduce((sum, r) => sum + r.top3Rate * r.totalGames, 0) / totalGames
        : 0;

    return {
      characterNum: characterCode,
      patchVersion,
      tier,
      totalGames,
      pickRate: totalPickRate,
      winRate: weightedWinRate,
      averageRank: 0,
      averageRP: weightedRP,
      top3Rate: weightedTop3,
      weapons,
    };
  }
}
