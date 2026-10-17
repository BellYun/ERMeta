import type { GroupedCombo } from "@/components/features/synergy-detail/ComboWeaponCard";
import type { TrioWeaponResult } from "@/components/features/synergy-detail/types";
import { isWeaponAgnosticCharacter } from "@/lib/characterMap";

export function recommendationWeapon(characterCode: number, weaponCode: number): number {
  return isWeaponAgnosticCharacter(characterCode) ? 0 : weaponCode;
}

interface WeightedGroup {
  representative: TrioWeaponResult;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  rankSum: number;
  variants: TrioWeaponResult[];
}

function addRow(group: WeightedGroup, row: TrioWeaponResult) {
  const games = row.totalGames;
  group.totalGames += games;
  group.totalWins += (row.winRate * games) / 100;
  group.totalRP += row.averageRP * games * 3;
  group.rankSum += row.averageRank * games;
  group.variants.push(row);
}

function makeGroup(row: TrioWeaponResult): WeightedGroup {
  const group: WeightedGroup = {
    representative: row,
    totalGames: 0,
    totalWins: 0,
    totalRP: 0,
    rankSum: 0,
    variants: [],
  };
  addRow(group, row);
  return group;
}

function aggregate(group: WeightedGroup): TrioWeaponResult {
  const row = group.representative;
  const games = group.totalGames;
  return {
    ...row,
    weaponType1: recommendationWeapon(row.character1, row.weaponType1),
    weaponType2: recommendationWeapon(row.character2, row.weaponType2),
    weaponType3: recommendationWeapon(row.character3, row.weaponType3),
    totalGames: games,
    winRate: games > 0 ? (group.totalWins / games) * 100 : 0,
    averageRP: games > 0 ? group.totalRP / games / 3 : 0,
    averageRank: games > 0 ? group.rankSum / games : 0,
  };
}

/** 무기 무관 실험체는 모든 무기를 한 추천 카드로 합산한다. */
export function groupTrioWeaponResults(results: TrioWeaponResult[]): GroupedCombo[] {
  const groups = new Map<string, WeightedGroup>();
  for (const row of results) {
    const key = [
      `${row.character1}:${recommendationWeapon(row.character1, row.weaponType1)}`,
      `${row.character2}:${recommendationWeapon(row.character2, row.weaponType2)}`,
      `${row.character3}:${recommendationWeapon(row.character3, row.weaponType3)}`,
    ].join("-");
    const group = groups.get(key);
    if (group) addRow(group, row);
    else groups.set(key, makeGroup(row));
  }

  return Array.from(groups.values(), (group) => ({
    ...aggregate(group),
    // 상세 조회에는 원래 무기 코드가 필요하므로 원본 row를 보존한다.
    traitVariants: group.variants,
  }));
}

/** 펼친 카드에서는 무기만 다른 동일 메인 특성 조합도 한 행으로 합산한다. */
export function groupTrioCoreVariants(results: TrioWeaponResult[]): TrioWeaponResult[] {
  const groups = new Map<string, WeightedGroup>();
  for (const row of results) {
    const key = [row.mainCore1 ?? 0, row.mainCore2 ?? 0, row.mainCore3 ?? 0].join(":");
    const group = groups.get(key);
    if (group) addRow(group, row);
    else groups.set(key, makeGroup(row));
  }
  return Array.from(groups.values(), aggregate);
}
