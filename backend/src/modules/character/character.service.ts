import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
const STATS_EXCLUDED_PATCHES = new Set(['11.0']);
const WEAPON_AGNOSTIC_CHARACTER_CODES = new Set([27]);
const WEAPON_AGNOSTIC_SENTINEL = 0;
const TIER_CUMULATIVE: Record<string, string[]> = {
  PLATINUM_PLUS: ['PLATINUM', 'DIAMOND', 'METEORITE', 'MITHRIL'],
  DIAMOND_PLUS: ['DIAMOND', 'METEORITE', 'MITHRIL'],
  METEORITE_PLUS: ['METEORITE', 'MITHRIL'],
  MITHRIL_PLUS: ['MITHRIL'],
  IN1000_PLUS: ['IN1000'],
};

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

interface CharacterStatRow {
  characterNum: number;
  bestWeapon: number | null;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

interface CharacterStatsResponse {
  characterNum: number;
  patchVersion: string;
  tier: string;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRank: number;
  averageRP: number;
  top3Rate: number;
  weapons: Array<{
    bestWeapon: number | null;
    totalGames: number;
    pickRate: number;
    winRate: number;
    averageRank: number;
    averageRP: number;
  }>;
}

type InsightLocale = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW';

function signed(value: number, digits = 1) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatInsightTier(locale: InsightLocale, tier: string) {
  if (tier === 'MITHRIL_PLUS') {
    if (locale === 'ja') return 'ミスリル以上';
    if (locale === 'ko') return '미스릴 이상';
    return 'Mithril+';
  }
  if (tier === 'METEORITE_PLUS') {
    if (locale === 'ja') return 'メテオライト以上';
    if (locale === 'ko') return '메테오라이트 이상';
    return 'Meteorite+';
  }
  if (tier === 'DIAMOND_PLUS') {
    if (locale === 'ja') return 'ダイヤ以上';
    if (locale === 'ko') return '다이아 이상';
    return 'Diamond+';
  }
  return tier;
}

function sampleLabel(totalGames: number): 'high' | 'medium' | 'low' {
  if (totalGames >= 1000) return 'high';
  if (totalGames >= 300) return 'medium';
  return 'low';
}

function weaponSpread(stats: CharacterStatsResponse) {
  if (stats.weapons.length < 2) return 0;
  return stats.weapons[0].pickRate - stats.weapons[1].pickRate;
}

function buildTempoRead(stats: CharacterStatsResponse, locale: InsightLocale) {
  const lowTop3 = stats.top3Rate < 37.5;
  const highTop3 = stats.top3Rate >= 40;
  const highWin = stats.winRate >= 12.5;
  const lowWin = stats.winRate < 12.5;
  const lowRp = stats.averageRP < 3;
  const highRp = stats.averageRP >= 8;
  const korean = locale === 'ko';

  if (lowTop3 && highWin) {
    return korean
      ? 'Top 3 비율은 낮지만 승률이 높아, 마지막 금지 구역 교전에서 1등으로 전환하는 힘이 있는 편입니다.'
      : 'Top 3 rate is low but win rate is high, so this pick is better at converting final fights than stable early placement.';
  }
  if (highTop3 && lowWin) {
    return korean
      ? 'Top 3 비율은 높지만 승률이 낮아, 순방은 잘하지만 마지막 교전 마무리가 어려울 수 있습니다.'
      : 'Top 3 rate is high but win rate is low, which suggests stable placement but weaker closeout power.';
  }
  if (lowRp && highWin) {
    return korean
      ? '승률은 높지만 평균 RP가 낮아, 나쁜 초반을 줄이는 운영이 중요합니다.'
      : 'Win rate is high but average RP is low, so avoiding bad starts matters.';
  }
  if (highRp && lowWin) {
    return korean
      ? '평균 RP는 높지만 승률이 낮아, 킬과 순위 점수로 랭크를 올리는 운영에 가깝습니다.'
      : 'Average RP is high but win rate is low, so the pick is closer to a kill-and-placement style.';
  }
  if (lowTop3) {
    return korean
      ? 'Top 3 비율이 낮아 초반 교전이나 중반 합류 구간에서 사출 위험이 있습니다.'
      : 'Top 3 rate is low, so early fights and mid-game grouping are risky.';
  }
  if (highTop3 && highWin) {
    return korean
      ? 'Top 3 비율과 승률이 모두 기준선 이상이라, 순방과 마지막 교전 전환이 함께 잡힌 안정적인 픽입니다.'
      : 'Top 3 rate and win rate are both above baseline, suggesting stable placement and good final-fight conversion.';
  }
  return null;
}

function buildCharacterInsightPayload(
  stats: CharacterStatsResponse,
  previousStats: CharacterStatsResponse | null,
  locale: InsightLocale,
) {
  const korean = locale === 'ko';
  const tier = formatInsightTier(locale, stats.tier);
  const sample = sampleLabel(stats.totalGames);
  const rpDelta = previousStats ? stats.averageRP - previousStats.averageRP : null;
  const winDelta = previousStats ? stats.winRate - previousStats.winRate : null;
  const concentrated = weaponSpread(stats) >= 25;
  const stable = stats.totalGames >= 1000;
  const climbing = stats.averageRP >= 8;
  const convertToWin = stats.winRate >= 12.5;
  const tempoRead = buildTempoRead(stats, locale);

  if (!korean) {
    return {
      patchVersion: stats.patchVersion,
      tier: stats.tier,
      sampleLabel: sample,
      headline: `Character ${stats.characterNum} is ${climbing ? 'a positive-RP option' : 'a conditional option'} in ${tier}.`,
      fitTitle: 'Best-fit situations',
      fitPoints: [
        tempoRead,
        climbing
          ? 'High average RP makes this pick suitable for kill-and-placement ranked climbing.'
          : 'Average RP is limited, so reducing early eliminations matters more than forcing fights.',
        convertToWin
          ? 'Win rate is above the eight-team baseline, so first-place conversion is visible.'
          : 'Win rate is below baseline, so finishing power or teamfight control is important.',
      ].filter(Boolean),
      metricsTitle: 'How to read the stats',
      metricsPoints: [
        `${stats.totalGames.toLocaleString('en-US')} matches are included for ${tier}.`,
        `Win rate ${formatPercent(stats.winRate)}, pick rate ${formatPercent(stats.pickRate)}, average RP ${signed(stats.averageRP)} should be read together.`,
        sample === 'low'
          ? 'Low sample size can move win rate and RP sharply.'
          : stats.pickRate < 1
            ? 'Low pick rate can indicate specialist bias.'
            : 'Sample size and pick rate are usable, but weapon and team composition still change the result.',
        rpDelta != null
          ? `Average RP changed by ${signed(rpDelta)} compared with the previous patch.`
          : 'Previous-patch comparison is unavailable, so current-patch data is emphasized.',
      ],
      compositionTitle: 'When to pick',
      compositionReason: concentrated
        ? 'The leading weapon choice is concentrated, so the role is relatively clear.'
        : 'Weapon choices are distributed, so the composition should fill whichever role the selected weapon leaves open.',
      warningsTitle: 'Cautions',
      warnings: [
        sample === 'low' ? 'Low sample size can exaggerate win rate and RP.' : 'Patch timing can still move the numbers day by day.',
        stats.pickRate < 1 ? 'Low pick rate can indicate specialist bias.' : 'A usable pick rate suggests broader adoption, but matchups still matter.',
        'Use weapon and trio data together instead of relying on one metric.',
      ],
    };
  }

  return {
    patchVersion: stats.patchVersion,
    tier: stats.tier,
    sampleLabel: sample,
    headline: `캐릭터 ${stats.characterNum}는 ${tier} 구간에서 ${climbing ? '랭크 상승 기대값이 있는' : '조합 보완이 필요한'} 픽입니다.`,
    fitTitle: '잘 맞는 상황',
    fitPoints: [
      tempoRead,
      climbing
        ? '평균 RP가 높아 킬·순위 점수를 챙기는 운영에서 랭크 상승 기대값이 있습니다.'
        : '평균 RP가 낮은 편이라 이기는 판보다 사출을 줄이는 운영이 더 중요합니다.',
      convertToWin
        ? '승률이 8팀 기준 기대값을 넘어서 1등 전환력도 확인됩니다.'
        : '승률은 기대값보다 낮아 마무리 화력이나 한타 주도권을 보완하는 팀원이 좋습니다.',
    ].filter(Boolean),
    metricsTitle: '지표 해석',
    metricsPoints: [
      `${tier} 기준 ${stats.totalGames.toLocaleString('ko-KR')}판 표본입니다. ${
        stable ? '표본 안정성은 충분한 편입니다.' : '표본 변동성이 있으므로 단일 지표만 보기는 어렵습니다.'
      }`,
      `승률 ${formatPercent(stats.winRate)}, 픽률 ${formatPercent(stats.pickRate)}, 평균 RP ${signed(stats.averageRP)}를 함께 봐야 합니다.`,
      sample === 'low'
        ? '표본 수가 낮아 승률과 RP가 실제 성능보다 크게 흔들릴 수 있습니다.'
        : stats.pickRate < 1
          ? '픽률이 낮아 숙련자 표본에 치우쳤을 가능성이 있습니다.'
          : '표본과 픽률은 확보되어 있지만 조합과 무기 선택에 따라 결과가 달라질 수 있습니다.',
      rpDelta != null && winDelta != null
        ? `이전 패치 대비 평균 RP는 ${signed(rpDelta)}, 승률은 ${signed(winDelta)}%p 변했습니다.`
        : '이전 패치 비교 데이터가 부족해 현재 패치 지표 중심으로 해석합니다.',
    ],
    compositionTitle: '언제 뽑으면 좋은가',
    compositionReason: concentrated
      ? '주력 무기 선택 비중이 높아 역할이 비교적 명확합니다. 역할 조합별 RP와 함께 확인하는 편이 좋습니다.'
      : '무기 선택지가 분산되어 있어 조합에 따라 역할이 달라질 수 있습니다. 역할 조합별 RP와 함께 확인하는 편이 좋습니다.',
    warningsTitle: '주의할 점',
    warnings: [
      sample === 'low'
        ? '표본 수가 낮아 승률과 RP가 실제 성능보다 크게 흔들릴 수 있습니다.'
        : '표본은 확보되어 있지만 패치 직후에는 하루 단위로 지표가 흔들릴 수 있습니다.',
      stats.pickRate < 1
        ? '픽률이 낮은 선택지는 숙련자 표본에 치우쳤을 가능성이 있습니다.'
        : '픽률이 있는 편이라 범용성은 확인되지만, 조합과 무기 선택에 따라 결과가 달라질 수 있습니다.',
      '무기별 수치는 전체 캐릭터 지표와 함께 비교해야 합니다.',
    ],
  };
}

interface RankingStatRow extends CharacterStatRow {
  bestWeapon: number;
  tier: string;
  patchVersion: string;
}

function expandCumulativeTier(tier: string): string[] {
  return TIER_CUMULATIVE[tier] ?? [tier];
}

function aggregateCharacterStatsAcrossTiers(rows: CharacterStatRow[]): CharacterStatRow[] {
  const map = new Map<string, CharacterStatRow & { rankSum: number }>();

  for (const row of rows) {
    const key = `${row.characterNum}|${row.bestWeapon ?? 'null'}`;
    const games = row.totalGames ?? 0;
    const existing = map.get(key);
    if (existing) {
      existing.totalGames += games;
      existing.totalWins += row.totalWins ?? 0;
      existing.totalRP += row.totalRP ?? 0;
      existing.totalTop3 += row.totalTop3 ?? 0;
      existing.rankSum += (row.averageRank ?? 0) * games;
    } else {
      map.set(key, {
        characterNum: row.characterNum,
        bestWeapon: row.bestWeapon,
        totalGames: games,
        totalWins: row.totalWins ?? 0,
        totalRP: row.totalRP ?? 0,
        totalTop3: row.totalTop3 ?? 0,
        averageRank: row.averageRank ?? 0,
        rankSum: (row.averageRank ?? 0) * games,
      });
    }
  }

  return [...map.values()].map(({ rankSum, ...row }) => ({
    ...row,
    averageRank: row.totalGames > 0 ? rankSum / row.totalGames : 0,
  }));
}

function collapseWeaponAgnosticRows(rows: CharacterStatRow[]): CharacterStatRow[] {
  const passthrough: CharacterStatRow[] = [];
  const groups = new Map<number, CharacterStatRow[]>();

  for (const row of rows) {
    if (!WEAPON_AGNOSTIC_CHARACTER_CODES.has(row.characterNum)) {
      passthrough.push(row);
      continue;
    }

    const bucket = groups.get(row.characterNum);
    if (bucket) bucket.push(row);
    else groups.set(row.characterNum, [row]);
  }

  const merged: CharacterStatRow[] = [];
  for (const group of groups.values()) {
    const games = group.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
    const base = group.reduce((a, b) =>
      (b.totalGames ?? 0) > (a.totalGames ?? 0) ? b : a,
    );
    merged.push({
      ...base,
      bestWeapon: WEAPON_AGNOSTIC_SENTINEL,
      totalGames: games,
      totalWins: group.reduce((sum, row) => sum + (row.totalWins ?? 0), 0),
      totalRP: group.reduce((sum, row) => sum + (row.totalRP ?? 0), 0),
      totalTop3: group.reduce((sum, row) => sum + (row.totalTop3 ?? 0), 0),
      averageRank:
        games > 0
          ? group.reduce(
              (sum, row) => sum + (row.averageRank ?? 0) * (row.totalGames ?? 0),
              0,
            ) / games
          : 0,
    });
  }

  return [...passthrough, ...merged];
}

function buildEmptyCharacterStats(characterCode: number, patchVersion: string, tier: string) {
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

function buildRankings(rows: CharacterStatRow[]): CharacterRankingData[] {
  const grandTotal = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);

  const rankings = rows.map((row) => ({
    characterNum: row.characterNum,
    bestWeapon: row.bestWeapon ?? 0,
    totalGames: row.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((row.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: row.totalGames > 0 ? ((row.totalWins ?? 0) / row.totalGames) * 100 : 0,
    averageRP: row.totalGames > 0 ? ((row.totalRP ?? 0) / row.totalGames) : 0,
    top3Rate: row.totalGames > 0 ? ((row.totalTop3 ?? 0) / row.totalGames) * 100 : 0,
  }));

  rankings.sort((a, b) => b.averageRP - a.averageRP);
  return rankings.map((row, index) => ({ rank: index + 1, ...row }));
}

function selectRankings(
  rows: RankingStatRow[],
  requestedTier: string,
): { rankings: CharacterRankingData[]; usedTier: string } {
  const cumulativeTiers = new Set(expandCumulativeTier(requestedTier));
  const filtered = rows.filter((row) => cumulativeTiers.has(row.tier));
  if (filtered.length === 0) return { rankings: [], usedTier: requestedTier };
  const merged = aggregateCharacterStatsAcrossTiers(filtered);
  return {
    rankings: buildRankings(collapseWeaponAgnosticRows(merged)),
    usedTier: requestedTier,
  };
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

    const patchList = (patches ?? [])
      .map((p: { version: string }) => p.version)
      .filter((version) => !STATS_EXCLUDED_PATCHES.has(version));
    const effectivePatch = patchVersion || patchList[0] || '';
    const currentIndex = patchList.indexOf(effectivePatch);
    const previousPatch =
      currentIndex >= 0 && currentIndex + 1 < patchList.length
        ? patchList[currentIndex + 1]
        : null;

    const patchVersions = previousPatch
      ? [effectivePatch, previousPatch]
      : [effectivePatch];

    const selectCols =
      'characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier,patchVersion';
    const queryResult = await client
      .from('v2_CharacterStats')
      .select(selectCols)
      .in('patchVersion', patchVersions)
      .in('tier', TIER_FALLBACK_ORDER);
    const { error } = queryResult;
    let { data } = queryResult;

    if (previousPatch && data) {
      const hasV2Prev = data.some(
        (row: { patchVersion: string }) => row.patchVersion === previousPatch,
      );
      if (!hasV2Prev) {
        const { data: oldData } = await client
          .from('CharacterStats')
          .select(selectCols)
          .eq('patchVersion', previousPatch)
          .in('tier', TIER_FALLBACK_ORDER);
        if (oldData && oldData.length > 0) data = [...data, ...oldData];
      }
    }

    if (error || !data) {
      return {
        rankings: [],
        previousRankings: [],
        patchVersion: effectivePatch,
        previousPatch: null,
        tier: requestedTier,
      };
    }

    const typedData = data as RankingStatRow[];
    const currentRows = typedData.filter((r) => r.patchVersion === effectivePatch);
    const prevRows = previousPatch
      ? typedData.filter((r) => r.patchVersion === previousPatch)
      : [];

    const { rankings, usedTier } = selectRankings(currentRows, requestedTier);
    const { rankings: previousRankings } =
      prevRows.length > 0
        ? selectRankings(prevRows, usedTier)
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
      return buildEmptyCharacterStats(characterCode, patchVersion, tier);
    }

    const cacheKey = `char-stats:${characterCode}:${patchVersion || 'latest'}:${tier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getCharacterStats(characterCode, patchVersion, tier),
    );
  }

  async getCharacterInsight(
    characterCode: number,
    patchVersion: string,
    tier: string,
    locale: string,
  ) {
    if (!Number.isFinite(characterCode)) {
      throw new BadRequestException('Invalid character code');
    }

    const patchList = await this.getStatsPatchList();
    const effectivePatch = patchVersion || patchList[0] || '';
    if (!effectivePatch) {
      throw new NotFoundException('No patch version available');
    }

    const previousPatch = patchList.find((patch) => patch !== effectivePatch) ?? null;
    const [stats, previousStats] = await Promise.all([
      this.getCharacterStats(characterCode, effectivePatch, tier),
      previousPatch ? this.getCharacterStats(characterCode, previousPatch, tier) : null,
    ]);
    const typedStats = stats as CharacterStatsResponse;

    if (!typedStats || typedStats.totalGames <= 0) {
      throw new NotFoundException('No stats available');
    }

    const safeLocale = this.normalizeInsightLocale(locale);
    return {
      characterCode,
      insight: buildCharacterInsightPayload(
        typedStats,
        previousStats as CharacterStatsResponse | null,
        safeLocale,
      ),
    };
  }

  private normalizeInsightLocale(locale: string): InsightLocale {
    if (locale === 'ko' || locale === 'en' || locale === 'ja' || locale === 'zh-CN' || locale === 'zh-TW') {
      return locale;
    }
    return 'ko';
  }

  private async getStatsPatchList(): Promise<string[]> {
    const client = this.supabase.getClient();
    const { data: patches } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(50);

    return (patches ?? [])
      .map((patch: { version: string }) => patch.version)
      .filter((version) => !STATS_EXCLUDED_PATCHES.has(version));
  }

  private async _getCharacterStats(
    characterCode: number,
    patchVersion: string,
    tier: string,
  ) {
    const client = this.supabase.getClient();

    const { data: patches } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(50);

    const patchList = (patches ?? [])
      .map((patch: { version: string }) => patch.version)
      .filter((version) => !STATS_EXCLUDED_PATCHES.has(version));
    const effectivePatch = patchVersion || patchList[0] || '';
    const emptyResponse = buildEmptyCharacterStats(characterCode, effectivePatch, tier);

    const tiers = expandCumulativeTier(tier);
    const selectCols =
      'characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank';
    let { data, error } = await client
      .from('v2_CharacterStats')
      .select(selectCols)
      .eq('patchVersion', effectivePatch)
      .in('tier', tiers);

    if ((!data || data.length === 0) && !error) {
      const fallback = await client
        .from('CharacterStats')
        .select(selectCols)
        .eq('patchVersion', effectivePatch)
        .in('tier', tiers);
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data || data.length === 0) return emptyResponse;

    const allRows = aggregateCharacterStatsAcrossTiers(data as CharacterStatRow[]);
    const grandTotal = allRows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
    const rows = collapseWeaponAgnosticRows(
      allRows.filter((row) => row.characterNum === characterCode),
    );

    if (rows.length === 0) return emptyResponse;

    const totalGames = rows.reduce((sum, r) => sum + r.totalGames, 0);
    const totalWins = rows.reduce((sum, r) => sum + r.totalWins, 0);
    const totalRP = rows.reduce((sum, r) => sum + r.totalRP, 0);
    const totalTop3 = rows.reduce((sum, r) => sum + r.totalTop3, 0);
    const weightedAverageRank =
      totalGames > 0
        ? rows.reduce((sum, row) => sum + (row.averageRank ?? 0) * (row.totalGames ?? 0), 0) /
          totalGames
        : 0;

    const weapons = rows
      .map((r) => ({
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames,
        pickRate: totalGames > 0 ? (r.totalGames / totalGames) * 100 : 0,
        winRate: r.totalGames > 0 ? (r.totalWins / r.totalGames) * 100 : 0,
        averageRank: r.averageRank ?? 0,
        averageRP: r.totalGames > 0 ? r.totalRP / r.totalGames : 0,
      }))
      .sort((a, b) => b.totalGames - a.totalGames);

    return {
      characterNum: characterCode,
      patchVersion: effectivePatch,
      tier,
      totalGames,
      pickRate: grandTotal > 0 ? (totalGames / grandTotal) * 100 : 0,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      averageRank: weightedAverageRank,
      averageRP: totalGames > 0 ? totalRP / totalGames : 0,
      top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
      weapons,
    };
  }
}
