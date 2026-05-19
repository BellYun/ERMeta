import { isWeaponAgnosticCharacter } from "@/lib/characterMap";

/** 무기 무관 캐릭터를 단일 row로 합산했을 때 쓰는 bestWeapon 센티넬. resolveWeaponName(0) → "전체 무기". */
export const WEAPON_AGNOSTIC_SENTINEL = 0;

interface CollapsibleRow {
  characterNum: number;
  bestWeapon: number | null;
  totalGames?: number | null;
  totalWins?: number | null;
  totalRP?: number | null;
  totalTop3?: number | null;
  averageRank?: number | null;
}

/**
 * 무기 무관 캐릭터(알렉스 등)의 (characterNum, bestWeapon) 분리 row를 하나로 합산한다.
 * 일반 캐릭터 row는 그대로 통과. 합산 row는 bestWeapon=센티넬, 게임 수 가중 평균 순위.
 *
 * @param extraKey 같은 캐릭터라도 분리 보존해야 하는 축(예: tier, patchVersion)을 키로.
 */
export function collapseWeaponAgnosticRows<T extends CollapsibleRow>(
  rows: T[],
  extraKey: (row: T) => string = () => ""
): T[] {
  const passthrough: T[] = [];
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    if (!isWeaponAgnosticCharacter(row.characterNum)) {
      passthrough.push(row);
      continue;
    }
    const key = `${row.characterNum}|${extraKey(row)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const merged: T[] = [];
  for (const group of groups.values()) {
    const games = group.reduce((s, r) => s + (r.totalGames ?? 0), 0);
    const base = group.reduce((a, b) => ((b.totalGames ?? 0) > (a.totalGames ?? 0) ? b : a));
    const sum = (pick: (r: T) => number | null | undefined) =>
      group.reduce((s, r) => s + (pick(r) ?? 0), 0);

    const collapsed = { ...base, bestWeapon: WEAPON_AGNOSTIC_SENTINEL } as T;
    collapsed.totalGames = games;
    if ("totalWins" in base) collapsed.totalWins = sum((r) => r.totalWins);
    if ("totalRP" in base) collapsed.totalRP = sum((r) => r.totalRP);
    if ("totalTop3" in base) collapsed.totalTop3 = sum((r) => r.totalTop3);
    if ("averageRank" in base) {
      collapsed.averageRank =
        games > 0 ? sum((r) => (r.averageRank ?? 0) * (r.totalGames ?? 0)) / games : 0;
    }
    merged.push(collapsed);
  }

  return [...passthrough, ...merged];
}
