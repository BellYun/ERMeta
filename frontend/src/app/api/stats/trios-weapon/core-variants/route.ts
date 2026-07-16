import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders, SERVER_ERROR_HEADERS, withCacheObservability } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase";

const TRIO_WEAPON_PAIR_LOOKUP_SOURCE_TABLE = "v2_CharacterTrioWeaponPairLookup_all_next";
const CORE_VARIANTS_LIMIT = 200;

interface TrioWeaponMember {
  character: number;
  weapon: number;
  mainCore: number | null;
}

interface TrioWeaponSearchRow {
  ally1_char: number;
  ally1_weapon: number;
  ally1_core: number | null;
  ally2_char: number;
  ally2_weapon: number;
  ally2_core: number | null;
  third_char: number;
  third_weapon: number;
  third_core: number | null;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

interface AggregatedTrioWeapon {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

function parseIntOrNull(param: string | null): number | null {
  if (param == null) return null;
  const n = parseInt(param, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeCharacterWeaponPair(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number
): [number, number, number, number] {
  return char1 <= char2 ? [char1, weapon1, char2, weapon2] : [char2, weapon2, char1, weapon1];
}

function normalizeTrioMembersByCharacter(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember]
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return [...members].sort(
    (a, b) =>
      a.character - b.character || a.weapon - b.weapon || (a.mainCore ?? 0) - (b.mainCore ?? 0)
  ) as [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember];
}

function pairWeaponLookupKey(
  char1: number,
  weapon1: number,
  char2: number,
  weapon2: number
): string {
  const [c1, w1, c2, w2] = normalizeCharacterWeaponPair(char1, weapon1, char2, weapon2);
  return `${c1}:${w1}|${c2}:${w2}`;
}

function trioWeaponKeyFromMembers(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember]
): string {
  return members
    .map((member) => [member.character, member.weapon, member.mainCore ?? 0].join(":"))
    .join("|");
}

function buildNormalizedMembersFromSearchRow(
  row: Pick<
    TrioWeaponSearchRow,
    | "ally1_char"
    | "ally1_weapon"
    | "ally1_core"
    | "ally2_char"
    | "ally2_weapon"
    | "ally2_core"
    | "third_char"
    | "third_weapon"
    | "third_core"
  >
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return normalizeTrioMembersByCharacter([
    { character: row.ally1_char, weapon: row.ally1_weapon, mainCore: row.ally1_core },
    { character: row.ally2_char, weapon: row.ally2_weapon, mainCore: row.ally2_core },
    { character: row.third_char, weapon: row.third_weapon, mainCore: row.third_core },
  ]);
}

function mapSearchRowToAggregated(row: TrioWeaponSearchRow): AggregatedTrioWeapon {
  const [m1, m2, m3] = buildNormalizedMembersFromSearchRow(row);

  return {
    character1: m1.character,
    weaponType1: m1.weapon,
    character2: m2.character,
    weaponType2: m2.weapon,
    character3: m3.character,
    weaponType3: m3.weapon,
    mainCore1: m1.mainCore,
    mainCore2: m2.mainCore,
    mainCore3: m3.mainCore,
    totalGames: row.total_games,
    winRate: row.total_games > 0 ? (row.total_wins / row.total_games) * 100 : 0,
    averageRP: row.total_games > 0 ? row.total_rp / row.total_games / 3 : 0,
    averageRank: row.total_games > 0 ? row.rank_sum / row.total_games : 0,
  };
}

function aggregateSearchRows(rows: TrioWeaponSearchRow[]): AggregatedTrioWeapon[] {
  const grouped = new Map<string, TrioWeaponSearchRow>();
  for (const row of rows) {
    const key = trioWeaponKeyFromMembers(buildNormalizedMembersFromSearchRow(row));
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...row });
      continue;
    }

    existing.total_games += row.total_games;
    existing.total_wins += row.total_wins;
    existing.total_rp += row.total_rp;
    existing.rank_sum += row.rank_sum;
  }

  return Array.from(grouped.values()).map(mapSearchRowToAggregated);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const pairCharacter1 = parseIntOrNull(searchParams.get("pairCharacter1"));
  const pairWeapon1 = parseIntOrNull(searchParams.get("pairWeapon1"));
  const pairCharacter2 = parseIntOrNull(searchParams.get("pairCharacter2"));
  const pairWeapon2 = parseIntOrNull(searchParams.get("pairWeapon2"));
  const trioCharacter1 = parseIntOrNull(searchParams.get("trioCharacter1"));
  const trioWeapon1 = parseIntOrNull(searchParams.get("trioWeapon1"));
  const trioCharacter2 = parseIntOrNull(searchParams.get("trioCharacter2"));
  const trioWeapon2 = parseIntOrNull(searchParams.get("trioWeapon2"));
  const trioCharacter3 = parseIntOrNull(searchParams.get("trioCharacter3"));
  const trioWeapon3 = parseIntOrNull(searchParams.get("trioWeapon3"));

  if (
    pairCharacter1 == null ||
    pairWeapon1 == null ||
    pairCharacter2 == null ||
    pairWeapon2 == null ||
    trioCharacter1 == null ||
    trioWeapon1 == null ||
    trioCharacter2 == null ||
    trioWeapon2 == null ||
    trioCharacter3 == null ||
    trioWeapon3 == null
  ) {
    return NextResponse.json({ error: "missing_required_params" }, { status: 400 });
  }

  const pairWeaponKey = pairWeaponLookupKey(
    pairCharacter1,
    pairWeapon1,
    pairCharacter2,
    pairWeapon2
  );
  const [m1, m2, m3] = normalizeTrioMembersByCharacter([
    { character: trioCharacter1, weapon: trioWeapon1, mainCore: null },
    { character: trioCharacter2, weapon: trioWeapon2, mainCore: null },
    { character: trioCharacter3, weapon: trioWeapon3, mainCore: null },
  ]);

  try {
    const t0 = Date.now();
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(TRIO_WEAPON_PAIR_LOOKUP_SOURCE_TABLE)
      .select(
        "ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum"
      )
      .eq("pair_weapon_key", pairWeaponKey)
      .eq("ally1_char", m1.character)
      .eq("ally1_weapon", m1.weapon)
      .eq("ally2_char", m2.character)
      .eq("ally2_weapon", m2.weapon)
      .eq("third_char", m3.character)
      .eq("third_weapon", m3.weapon)
      .order("total_games", { ascending: false })
      .limit(CORE_VARIANTS_LIMIT);

    if (error) throw error;

    const results = aggregateSearchRows((data ?? []) as TrioWeaponSearchRow[]).sort(
      (a, b) => b.averageRP - a.averageRP
    );
    const latencyMs = Date.now() - t0;

    return NextResponse.json(
      { results },
      { headers: withCacheObservability(getCacheHeaders("stats-long"), latencyMs) }
    );
  } catch (err) {
    console.error("[stats/trios-weapon/core-variants] request failed:", err);
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: SERVER_ERROR_HEADERS }
    );
  }
}
