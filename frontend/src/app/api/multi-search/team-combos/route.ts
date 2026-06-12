import { NextRequest, NextResponse } from "next/server";
import {
  mergeApiRowsByComboId,
  recommendationScore,
  sortTrioWeaponCombos,
  type ApiTrioWeaponRow,
  type TrioWeaponMember,
  type TrioWeaponCombo,
} from "@/components/features/trio-lab/types";

const TEAM_SIZE = 3;
const MAX_POOL_SIZE = 3;
const TRIO_WEAPON_LIMIT = "5000";
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

interface TeamCombosBody {
  pools?: unknown;
}

interface PickRanking {
  character: number;
  weapon: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
  bestComboIds: string[];
}

function normalizePools(pools: unknown): number[][] | null {
  if (!Array.isArray(pools) || pools.length !== TEAM_SIZE) return null;

  const normalized = pools.map((pool) => {
    if (!Array.isArray(pool)) return null;
    const unique = Array.from(
      new Set(
        pool.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      )
    ).slice(0, MAX_POOL_SIZE);
    return unique.length > 0 ? unique : null;
  });

  if (normalized.some((pool) => pool == null)) return null;
  return normalized as number[][];
}

function comboMatchesTeamPools(combo: TrioWeaponCombo, pools: number[][]): boolean {
  const usedCharacters = new Set<number>();

  function visit(teamIndex: number): boolean {
    if (teamIndex >= pools.length) return true;

    for (const character of pools[teamIndex]) {
      if (usedCharacters.has(character)) continue;
      if (!combo.members.some((member) => member.character === character)) continue;

      usedCharacters.add(character);
      if (visit(teamIndex + 1)) return true;
      usedCharacters.delete(character);
    }

    return false;
  }

  return visit(0);
}

async function fetchTeamComboRows(origin: string, pools: number[][]): Promise<ApiTrioWeaponRow[]> {
  const requests: Promise<ApiTrioWeaponRow[]>[] = [];
  const requestedPairs = new Set<string>();

  for (let leftIndex = 0; leftIndex < pools.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < pools.length; rightIndex += 1) {
      for (const charA of pools[leftIndex]) {
        for (const charB of pools[rightIndex]) {
          if (charA === charB) continue;

          const character1 = Math.min(charA, charB);
          const character2 = Math.max(charA, charB);
          const pairKey = `${character1}:${character2}`;
          if (requestedPairs.has(pairKey)) continue;
          requestedPairs.add(pairKey);

          const params = new URLSearchParams({
            sortBy: "totalGames",
            limit: TRIO_WEAPON_LIMIT,
            character1: String(character1),
            character2: String(character2),
          });

          requests.push(
            fetch(`${origin}/api/stats/trios-weapon?${params.toString()}`, {
              cache: "no-store",
            })
              .then((response) => (response.ok ? response.json() : { results: [] }))
              .then((payload: { results?: ApiTrioWeaponRow[] }) => payload.results ?? [])
          );
        }
      }
    }
  }

  const settled = await Promise.all(requests);
  return settled.flat();
}

function findMyMember(combo: TrioWeaponCombo, myPool: number[]): TrioWeaponMember | null {
  return combo.members.find((member) => myPool.includes(member.character)) ?? null;
}

function buildPickRankings(combos: TrioWeaponCombo[], myPool: number[]): PickRanking[] {
  const rankings = new Map<
    string,
    PickRanking & { rpSum: number; rankSum: number; winSum: number }
  >();

  for (const combo of combos) {
    const myMember = findMyMember(combo, myPool);
    if (!myMember) continue;

    const key = `${myMember.character}:${myMember.weapon}`;
    const current = rankings.get(key) ?? {
      character: myMember.character,
      weapon: myMember.weapon,
      totalGames: 0,
      winRate: 0,
      averageRP: 0,
      averageRank: 0,
      bestComboIds: [],
      rpSum: 0,
      rankSum: 0,
      winSum: 0,
    };

    current.totalGames += combo.totalGames;
    current.rpSum += combo.averageRP * combo.totalGames;
    current.rankSum += combo.averageRank * combo.totalGames;
    current.winSum += combo.winRate * combo.totalGames;
    rankings.set(key, current);
  }

  return Array.from(rankings.values())
    .map((ranking) => {
      const bestComboIds = combos
        .filter((combo) =>
          combo.members.some(
            (member) => member.character === ranking.character && member.weapon === ranking.weapon
          )
        )
        .sort(
          (a, b) =>
            b.averageRP - a.averageRP || b.totalGames - a.totalGames || b.winRate - a.winRate
        )
        .map((combo) => combo.id);

      return {
        character: ranking.character,
        weapon: ranking.weapon,
        totalGames: ranking.totalGames,
        winRate: ranking.totalGames > 0 ? ranking.winSum / ranking.totalGames : 0,
        averageRP: ranking.totalGames > 0 ? ranking.rpSum / ranking.totalGames : 0,
        averageRank: ranking.totalGames > 0 ? ranking.rankSum / ranking.totalGames : 0,
        bestComboIds,
      };
    })
    .sort(
      (a, b) =>
        recommendationScore({
          id: `${b.character}-${b.weapon}`,
          members: [
            { character: b.character, weapon: b.weapon, mainCore: null },
            { character: 0, weapon: 0, mainCore: null },
            { character: 0, weapon: 0, mainCore: null },
          ],
          totalGames: b.totalGames,
          winRate: b.winRate,
          averageRP: b.averageRP,
          averageRank: b.averageRank,
        }) -
        recommendationScore({
          id: `${a.character}-${a.weapon}`,
          members: [
            { character: a.character, weapon: a.weapon, mainCore: null },
            { character: 0, weapon: 0, mainCore: null },
            { character: 0, weapon: 0, mainCore: null },
          ],
          totalGames: a.totalGames,
          winRate: a.winRate,
          averageRP: a.averageRP,
          averageRank: a.averageRank,
        })
    );
}

export async function POST(request: NextRequest) {
  let body: TeamCombosBody;
  try {
    body = (await request.json()) as TeamCombosBody;
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 확인해주세요." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const pools = normalizePools(body.pools);
  if (!pools) {
    return NextResponse.json(
      { error: "팀원별 주력 캐릭터 1~3개를 전달해주세요." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const rows = await fetchTeamComboRows(request.nextUrl.origin, pools);
    const results = sortTrioWeaponCombos(
      mergeApiRowsByComboId(rows).filter((combo) => comboMatchesTeamPools(combo, pools)),
      "recommended"
    );
    const pickRankings = buildPickRankings(results, pools[0]);

    return NextResponse.json({ pickRankings, results }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("[multi-search/team-combos] 예외:", err);
    return NextResponse.json(
      { error: "팀 조합 추천 데이터를 불러오지 못했습니다." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
