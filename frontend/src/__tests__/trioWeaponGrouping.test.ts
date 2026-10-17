import { describe, expect, it } from "vitest";
import type { TrioWeaponResult } from "@/components/features/synergy-detail/types";
import { groupTrioCoreVariants, groupTrioWeaponResults } from "@/lib/trioWeaponGrouping";

function result(alexWeapon: number, games: number, wins: number, rp: number): TrioWeaponResult {
  return {
    character1: 1,
    weaponType1: 15,
    character2: 27,
    weaponType2: alexWeapon,
    character3: 40,
    weaponType3: 7,
    mainCore1: null,
    mainCore2: null,
    mainCore3: null,
    totalGames: games,
    winRate: (wins / games) * 100,
    averageRP: rp,
    averageRank: 2,
  };
}

describe("trio weapon recommendation grouping", () => {
  it("combines Alex weapons with game weighted metrics and keeps exact source rows", () => {
    const tonfa = result(2, 10, 2, 30);
    const pistol = result(9, 30, 9, 50);
    const differentPartnerWeapon = { ...result(16, 5, 1, 20), weaponType3: 8 };
    const groups = groupTrioWeaponResults([tonfa, pistol, differentPartnerWeapon]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      character2: 27,
      weaponType2: 0,
      totalGames: 40,
      averageRP: 45,
      averageRank: 2,
      traitVariants: [tonfa, pistol],
    });
    expect(groups[0].winRate).toBeCloseTo(27.5);
    expect(groups[1].weaponType3).toBe(8);
  });

  it("combines identical core builds across Alex weapons", () => {
    const tonfa = { ...result(2, 10, 2, 30), mainCore2: 7001 };
    const pistol = { ...result(9, 30, 9, 50), mainCore2: 7001 };
    const otherCore = { ...result(16, 5, 1, 20), mainCore2: 7002 };

    const variants = groupTrioCoreVariants([tonfa, pistol, otherCore]);
    expect(variants).toMatchObject([
      { weaponType2: 0, mainCore2: 7001, totalGames: 40, averageRP: 45 },
      { weaponType2: 0, mainCore2: 7002, totalGames: 5 },
    ]);
    expect(variants[0].winRate).toBeCloseTo(27.5);
  });
});
