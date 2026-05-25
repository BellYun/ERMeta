import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { expandCumulativeTier } from "@/utils/tier";

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];

interface StatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

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

export interface RankingResponse {
  rankings: CharacterRankingData[];
  previousRankings: CharacterRankingData[];
  patchVersion: string;
  previousPatch: string | null;
  tier: string;
}

export function buildRankings(rows: StatRow[]): CharacterRankingData[] {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);

  const rankings = rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
    top3Rate: r.totalGames > 0 ? ((r.totalTop3 ?? 0) / r.totalGames) * 100 : 0,
  }));

  rankings.sort((a, b) => b.averageRP - a.averageRP);
  return rankings.map((c, i) => ({ rank: i + 1, ...c }));
}

function aggregateAcrossTiers(rows: (StatRow & { tier: string })[]): StatRow[] {
  const map = new Map<string, StatRow & { _rankSum: number }>();
  for (const r of rows) {
    const key = `${r.characterNum}|${r.bestWeapon ?? "null"}`;
    const games = r.totalGames ?? 0;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, {
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: games,
        totalWins: r.totalWins ?? 0,
        totalRP: r.totalRP ?? 0,
        totalTop3: r.totalTop3 ?? 0,
        averageRank: 0,
        _rankSum: (r.averageRank ?? 0) * games,
      });
    } else {
      ex.totalGames += games;
      ex.totalWins += r.totalWins ?? 0;
      ex.totalRP += r.totalRP ?? 0;
      ex.totalTop3 += r.totalTop3 ?? 0;
      ex._rankSum += (r.averageRank ?? 0) * games;
    }
  }
  return Array.from(map.values()).map(({ _rankSum, ...rest }) => ({
    ...rest,
    averageRank: rest.totalGames > 0 ? _rankSum / rest.totalGames : 0,
  }));
}

function selectRankings(
  data: (StatRow & { tier: string })[],
  requestedTier: string
): { rankings: CharacterRankingData[]; usedTier: string } {
  // 누적(+) tier 필터: 요청 tier 와 그 위 모든 tier row 를 합산.
  const cumulativeTiers = new Set(expandCumulativeTier(requestedTier));
  const rows = data.filter((r) => cumulativeTiers.has(r.tier));
  if (rows.length === 0) {
    return { rankings: [], usedTier: requestedTier };
  }
  // 같은 (characterNum, bestWeapon) 의 multiple tier row 합산.
  const merged = aggregateAcrossTiers(rows);
  return {
    rankings: buildRankings(collapseWeaponAgnosticRows(merged)),
    usedTier: requestedTier,
  };
}

export async function fetchRankingData(
  patchVersion: string,
  requestedTier: string
): Promise<RankingResponse> {
  const supabase = createServerClient();

  const { data: patches } = await supabase
    .from("PatchVersion")
    .select("version")
    .order("startDate", { ascending: false })
    .limit(50);

  const patchList = (patches ?? []).map((p: { version: string }) => p.version);
  const currentIndex = patchList.indexOf(patchVersion);
  const previousPatch =
    currentIndex >= 0 && currentIndex + 1 < patchList.length ? patchList[currentIndex + 1] : null;

  const patchVersions = previousPatch ? [patchVersion, previousPatch] : [patchVersion];

  const selectCols =
    "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier,patchVersion";
  const queryResult = await supabase
    .from("v2_CharacterStats")
    .select(selectCols)
    .in("patchVersion", patchVersions)
    .in("tier", TIER_FALLBACK_ORDER);
  const { error } = queryResult;
  let { data } = queryResult;

  // v2에 이전 패치 데이터 없으면 old 테이블 fallback 병합
  if (previousPatch && data) {
    const hasV2Prev = data.some((r: { patchVersion: string }) => r.patchVersion === previousPatch);
    if (!hasV2Prev) {
      const { data: oldData } = await supabase
        .from("CharacterStats")
        .select(selectCols)
        .eq("patchVersion", previousPatch)
        .in("tier", TIER_FALLBACK_ORDER);
      if (oldData && oldData.length > 0) {
        data = [...data, ...oldData];
      }
    }
  }

  if (error || !data) {
    return {
      rankings: [],
      previousRankings: [],
      patchVersion,
      previousPatch: null,
      tier: requestedTier,
    };
  }

  const typedData = data as (StatRow & { tier: string; patchVersion: string })[];
  const currentData = typedData.filter((r) => r.patchVersion === patchVersion);
  const prevData = previousPatch ? typedData.filter((r) => r.patchVersion === previousPatch) : [];

  const { rankings, usedTier } = selectRankings(currentData, requestedTier);
  const { rankings: previousRankings } =
    prevData.length > 0
      ? selectRankings(prevData, usedTier)
      : { rankings: [] as CharacterRankingData[] };

  return {
    rankings,
    previousRankings,
    patchVersion,
    previousPatch,
    tier: usedTier,
  };
}

export async function getCachedRankingData(
  patchVersion: string,
  requestedTier: string
): Promise<RankingResponse> {
  return unstable_cache(
    async () => fetchRankingData(patchVersion, requestedTier),
    ["character-rankings", patchVersion, requestedTier],
    {
      revalidate: 21600,
      tags: [
        "character-rankings",
        `character-rankings:${patchVersion}`,
        `character-rankings:tier:${requestedTier}`,
      ],
    }
  )();
}
