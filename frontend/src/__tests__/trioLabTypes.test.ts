import { describe, expect, it } from "vitest";
import { mergeApiRowsByComboId, type ApiTrioWeaponRow } from "@/components/features/trio-lab/types";

function makeRow(overrides: Partial<ApiTrioWeaponRow>): ApiTrioWeaponRow {
  return {
    character1: 21,
    weaponType1: 9,
    character2: 76,
    weaponType2: 3,
    character3: 87,
    weaponType3: 24,
    mainCore1: 7000001,
    mainCore2: 7100001,
    mainCore3: 7200001,
    totalGames: 2,
    winRate: 50,
    averageRP: 12,
    averageRank: 3,
    ...overrides,
  };
}

describe("mergeApiRowsByComboId", () => {
  it("merges core variants of the same trio-weapon combo", () => {
    const merged = mergeApiRowsByComboId([
      makeRow({ totalGames: 2, winRate: 50, averageRP: 12, averageRank: 3, mainCore1: 7000001 }),
      makeRow({ totalGames: 8, winRate: 25, averageRP: 6, averageRank: 4, mainCore1: 7000002 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("21-9_76-3_87-24");
    expect(merged[0]?.totalGames).toBe(10);
    expect(merged[0]?.winRate).toBeCloseTo(30);
    expect(merged[0]?.averageRP).toBeCloseTo(7.2);
    expect(merged[0]?.averageRank).toBeCloseTo(3.8);
  });

  it("keeps different trio-weapon combos separate", () => {
    const merged = mergeApiRowsByComboId([
      makeRow({}),
      makeRow({ character3: 99, weaponType3: 1 }),
    ]);

    expect(merged).toHaveLength(2);
  });
});
