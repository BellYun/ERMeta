export type CachedTrioWeaponTuple = [
  character1: number,
  weapon1: number,
  character2: number,
  weapon2: number,
  character3: number,
  weapon3: number,
  totalGames: number,
  totalWins: number,
  totalRP: number,
  rankSum: number,
];

export interface TrioWeaponTupleMemberFilter {
  charCode: number;
  weaponCode: number | null;
}

export interface TrioWeaponTupleResult {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: null;
  mainCore2: null;
  mainCore3: null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

export interface TrioWeaponTupleBucket {
  version: 1;
  itemCount: number;
  items: CachedTrioWeaponTuple[];
}

export function parseTrioWeaponTuple(value: unknown): CachedTrioWeaponTuple {
  if (!Array.isArray(value) || value.length !== 10) {
    throw new Error("invalid_trio_weapon_member_bucket_tuple");
  }

  const numbers = value.map((part) => Number(part));
  if (numbers.some((part) => !Number.isFinite(part))) {
    throw new Error("invalid_trio_weapon_member_bucket_number");
  }

  return numbers as CachedTrioWeaponTuple;
}

export function parseTrioWeaponTupleBucket(value: unknown): TrioWeaponTupleBucket {
  if (value == null || typeof value !== "object") {
    throw new Error("invalid_trio_weapon_member_bucket_response");
  }

  const bucket = value as {
    version?: unknown;
    itemCount?: unknown;
    items?: unknown;
  };
  if (bucket.version !== 1 || !Array.isArray(bucket.items)) {
    throw new Error("invalid_trio_weapon_member_bucket_response");
  }

  const items = bucket.items.map(parseTrioWeaponTuple);
  if (Number(bucket.itemCount) !== items.length) {
    throw new Error("invalid_trio_weapon_member_bucket_count");
  }

  return {
    version: 1,
    itemCount: items.length,
    items,
  };
}

function tupleHasMember(
  tuple: CachedTrioWeaponTuple,
  filter: TrioWeaponTupleMemberFilter
): boolean {
  for (let index = 0; index < 6; index += 2) {
    if (tuple[index] !== filter.charCode) continue;
    if (filter.weaponCode == null || tuple[index + 1] === filter.weaponCode) return true;
  }
  return false;
}

export function filterTrioWeaponTuples(
  tuples: CachedTrioWeaponTuple[],
  filters: TrioWeaponTupleMemberFilter[]
): CachedTrioWeaponTuple[] {
  if (filters.length === 0) return tuples;
  return tuples.filter((tuple) => filters.every((filter) => tupleHasMember(tuple, filter)));
}

export function trioWeaponTupleToResult(tuple: CachedTrioWeaponTuple): TrioWeaponTupleResult {
  const [
    character1,
    weaponType1,
    character2,
    weaponType2,
    character3,
    weaponType3,
    totalGames,
    totalWins,
    totalRP,
    rankSum,
  ] = tuple;

  return {
    character1,
    weaponType1,
    character2,
    weaponType2,
    character3,
    weaponType3,
    mainCore1: null,
    mainCore2: null,
    mainCore3: null,
    totalGames,
    winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    averageRP: totalGames > 0 ? totalRP / totalGames / 3 : 0,
    averageRank: totalGames > 0 ? rankSum / totalGames : 0,
  };
}
