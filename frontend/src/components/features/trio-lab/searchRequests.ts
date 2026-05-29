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

function getCharacterWeapons(characterCode: number): number[] {
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

function buildExactPairWeaponRequests(charA: number, charB: number): TrioWeaponSearchRequest[] {
  const weaponsA = getCharacterWeapons(charA);
  const weaponsB = getCharacterWeapons(charB);
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

function pickSmallestExactPair(pool: number[]): [number, number] | null {
  const pairs: Array<[number, number]> = [
    [pool[0], pool[1]],
    [pool[0], pool[2]],
    [pool[1], pool[2]],
  ];

  let best: { pair: [number, number]; count: number } | null = null;
  for (const [charA, charB] of pairs) {
    const count = getCharacterWeapons(charA).length * getCharacterWeapons(charB).length;
    if (count === 0 || count > EXACT_FANOUT_LIMIT) continue;
    if (!best || count < best.count) best = { pair: [charA, charB], count };
  }
  return best?.pair ?? null;
}

export function filterRowsByPool(rows: ApiTrioWeaponRow[], pool: number[]) {
  if (pool.length === 0) return rows;

  return rows.filter((row) => {
    const chars = new Set([row.character1, row.character2, row.character3]);
    return pool.every((character) => chars.has(character));
  });
}

export function buildTrioWeaponSearchRequests(pool: number[]): TrioWeaponSearchRequest[] {
  const base = { sortBy: CANONICAL_SORT_BY, limit: REQUEST_LIMIT };
  if (pool.length === 0) return [base];
  if (pool.length === 1) return [{ ...base, character1: String(pool[0]) }];

  if (pool.length === 2) {
    const exactRequests = buildExactPairWeaponRequests(pool[0], pool[1]);
    return exactRequests.length > 0 ? exactRequests : [buildPairRequest(pool[0], pool[1])];
  }

  const exactPair = pickSmallestExactPair(pool);
  if (exactPair) {
    return buildExactPairWeaponRequests(exactPair[0], exactPair[1]);
  }

  return [
    buildPairRequest(pool[0], pool[1]),
    buildPairRequest(pool[0], pool[2]),
    buildPairRequest(pool[1], pool[2]),
  ];
}
