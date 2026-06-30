import characterBestWeapons from "@/../const/characterBestWeapons.json";
import type { ApiTrioWeaponRow } from "./types";

const EXACT_FANOUT_LIMIT = 12;
const REQUEST_LIMIT = "5000";
const CANONICAL_SORT_BY = "totalGames";

const weaponData = characterBestWeapons as Record<
  string,
  { weaponCode: number; label: string; isDefault: boolean }[]
>;

type TrioWeaponSearchRequest = Record<string, string>;
type WeaponFilters = Record<number, number>;

export function getCharacterWeaponOptions(characterCode: number) {
  return weaponData[String(characterCode)] ?? [];
}

function getCharacterWeapons(characterCode: number, weaponFilters: WeaponFilters = {}): number[] {
  const selectedWeapon = weaponFilters[characterCode];
  if (selectedWeapon != null && selectedWeapon > 0) return [selectedWeapon];
  const weapons = weaponData[String(characterCode)] ?? [];
  return weapons.map((weapon) => weapon.weaponCode).filter((weaponCode) => weaponCode > 0);
}

function buildPairRequest(charA: number, charB: number): TrioWeaponSearchRequest {
  return {
    sortBy: CANONICAL_SORT_BY,
    limit: REQUEST_LIMIT,
    character1: String(Math.min(charA, charB)),
    character2: String(Math.max(charA, charB)),
  };
}

function buildExactPairWeaponRequests(
  charA: number,
  charB: number,
  weaponFilters: WeaponFilters
): TrioWeaponSearchRequest[] {
  const weaponsA = getCharacterWeapons(charA, weaponFilters);
  const weaponsB = getCharacterWeapons(charB, weaponFilters);
  if (weaponsA.length === 0 || weaponsB.length === 0) return [];
  if (weaponsA.length * weaponsB.length > EXACT_FANOUT_LIMIT) return [];

  const [char1, char2, weaponList1, weaponList2] =
    charA < charB ? [charA, charB, weaponsA, weaponsB] : [charB, charA, weaponsB, weaponsA];

  const requests: TrioWeaponSearchRequest[] = [];
  for (const weapon1 of weaponList1) {
    for (const weapon2 of weaponList2) {
      requests.push({
        sortBy: CANONICAL_SORT_BY,
        limit: REQUEST_LIMIT,
        character1: String(char1),
        weapon1: String(weapon1),
        character2: String(char2),
        weapon2: String(weapon2),
      });
    }
  }
  return requests;
}

function pickSmallestExactPair(
  pool: number[],
  weaponFilters: WeaponFilters
): [number, number] | null {
  const pairs: Array<[number, number]> = [
    [pool[0], pool[1]],
    [pool[0], pool[2]],
    [pool[1], pool[2]],
  ];

  let best: { pair: [number, number]; count: number } | null = null;
  for (const [charA, charB] of pairs) {
    const count =
      getCharacterWeapons(charA, weaponFilters).length *
      getCharacterWeapons(charB, weaponFilters).length;
    if (count === 0 || count > EXACT_FANOUT_LIMIT) continue;
    if (!best || count < best.count) best = { pair: [charA, charB], count };
  }
  return best?.pair ?? null;
}

function rowHasCharacterWeapon(row: ApiTrioWeaponRow, character: number, weapon: number): boolean {
  return (
    (row.character1 === character && row.weaponType1 === weapon) ||
    (row.character2 === character && row.weaponType2 === weapon) ||
    (row.character3 === character && row.weaponType3 === weapon)
  );
}

export function filterRowsByPool(
  rows: ApiTrioWeaponRow[],
  pool: number[],
  weaponFilters: WeaponFilters = {}
) {
  if (pool.length === 0) return rows;

  return rows.filter((row) => {
    const chars = new Set([row.character1, row.character2, row.character3]);
    return pool.every((character) => {
      if (!chars.has(character)) return false;
      const weapon = weaponFilters[character];
      return weapon == null || rowHasCharacterWeapon(row, character, weapon);
    });
  });
}

export function buildTrioWeaponSearchRequests(
  pool: number[],
  weaponFilters: WeaponFilters = {}
): TrioWeaponSearchRequest[] {
  const base = { sortBy: CANONICAL_SORT_BY, limit: REQUEST_LIMIT };
  if (pool.length === 0) return [base];
  if (pool.length === 1) {
    const weapon = weaponFilters[pool[0]];
    return [
      {
        ...base,
        character1: String(pool[0]),
        ...(weapon ? { weapon1: String(weapon) } : {}),
      },
    ];
  }

  if (pool.length === 2) {
    const exactRequests = buildExactPairWeaponRequests(pool[0], pool[1], weaponFilters);
    return exactRequests.length > 0 ? exactRequests : [buildPairRequest(pool[0], pool[1])];
  }

  const exactPair = pickSmallestExactPair(pool, weaponFilters);
  if (exactPair) {
    return buildExactPairWeaponRequests(exactPair[0], exactPair[1], weaponFilters);
  }

  return [
    buildPairRequest(pool[0], pool[1]),
    buildPairRequest(pool[0], pool[2]),
    buildPairRequest(pool[1], pool[2]),
  ];
}
