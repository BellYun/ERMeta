import { NextRequest, NextResponse } from "next/server";
import {
  mergeApiRowsByComboId,
  sortTrioWeaponCombos,
  type ApiTrioWeaponRow,
  type TrioWeaponCombo,
} from "@/components/features/team-combos/types";
import { isMultiSearchEnabled } from "@/lib/featureFlags";

const TEAM_SIZE = 3;
const MAX_POOL_SIZE = 3;
const TRIO_WEAPON_LIMIT = "5000";
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

interface TeamCombosBody {
  pools?: unknown;
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
              .catch((err) => {
                console.error(`[multi-search/team-combos] stats fetch failed ${pairKey}:`, err);
                return [];
              })
          );
        }
      }
    }
  }

  const settled = await Promise.all(requests);
  return settled.flat();
}

export async function POST(request: NextRequest) {
  if (!isMultiSearchEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  let body: TeamCombosBody;
  try {
    body = (await request.json()) as TeamCombosBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_request_body" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const pools = normalizePools(body.pools);
  if (!pools) {
    return NextResponse.json(
      { error: "invalid_character_pools" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const rows = await fetchTeamComboRows(request.nextUrl.origin, pools);
    const results = sortTrioWeaponCombos(
      mergeApiRowsByComboId(rows).filter((combo) => comboMatchesTeamPools(combo, pools)),
      "recommended"
    );

    return NextResponse.json({ results }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("[multi-search/team-combos] request failed:", err);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
