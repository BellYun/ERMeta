import { describe, expect, it } from "vitest";
import {
  buildEquipmentStats,
  type EquipmentRow,
  type EquipmentStatsOptions,
} from "@/domain/equipmentStats";

const options: EquipmentStatsOptions = {
  patchVersion: "12.3",
  tier: "DIAMOND",
  bestWeapon: null,
  legendOnly: false,
  itemGrades: {
    "1": "Legend",
    "2": "Legend",
    "3": "Legend",
    "4": "Legend",
    "5": "Legend",
    "6": "Epic",
  },
  weaponItemTypes: { "1": 10, "6": 20 },
};
const empty = {
  topBuilds: [],
  slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
  coreItems: [],
};
function row(overrides: Partial<EquipmentRow> = {}): EquipmentRow {
  return {
    mainCore: 100,
    weapon: 1,
    chest: 2,
    head: 3,
    arm: 4,
    leg: 5,
    totalGames: 10,
    totalWins: 2,
    rankSum: 40,
    totalRP: 100,
    ...overrides,
  };
}

describe("buildEquipmentStats", () => {
  it("빈 입력은 모든 배열이 빈 결과를 반환한다", () => {
    expect(buildEquipmentStats([], options)).toEqual(empty);
  });
  it("동일 빌드를 먼저 합산한 뒤 가중 통계를 계산한다", () => {
    const result = buildEquipmentStats(
      [row(), row({ totalGames: 30, totalWins: 18, rankSum: 60, totalRP: 900 })],
      options
    );
    expect(result.topBuilds).toEqual([
      {
        mainCore: 100,
        weapon: 1,
        chest: 2,
        head: 3,
        arm: 4,
        leg: 5,
        totalGames: 40,
        pickRate: 100,
        winRate: 50,
        averageRank: 2.5,
        averageRP: 25,
      },
    ]);
    expect(result.slotPopularity.weapon).toEqual([
      { code: 1, totalGames: 40, pickRate: 100, winRate: 50 },
    ]);
  });
  it("메인 코어가 다르면 빌드는 분리하고 슬롯·핵심 아이템은 합산한다", () => {
    const result = buildEquipmentStats([row(), row({ mainCore: null })], options);
    expect(result.topBuilds).toHaveLength(2);
    expect(result.topBuilds.map((b) => b.pickRate)).toEqual([50, 50]);
    expect(result.coreItems).toEqual(
      [1, 2, 3, 4, 5].map((code) => ({ code, totalGames: 20, pickRate: 100, winRate: 20 }))
    );
  });
  it("무기 타입으로 필터링한 뒤 남은 경기 수를 분모로 사용한다", () => {
    const result = buildEquipmentStats([row(), row({ weapon: 6, totalGames: 90 })], {
      ...options,
      bestWeapon: 10,
    });
    expect(result.topBuilds).toHaveLength(1);
    expect(result.topBuilds[0]).toMatchObject({ weapon: 1, totalGames: 10, pickRate: 100 });
    expect(result.slotPopularity.chest[0].pickRate).toBe(100);
    expect(result.coreItems[0].pickRate).toBe(100);
  });
  it.each([null, 99])("무기 타입 필터는 null/매핑 없는 무기 %s를 제외한다", (weapon) => {
    expect(buildEquipmentStats([row({ weapon })], { ...options, bestWeapon: 10 })).toEqual(empty);
  });
  it("잘못된 숫자 무기 필터도 기존처럼 빈 결과를 반환한다", () => {
    expect(buildEquipmentStats([row()], { ...options, bestWeapon: Number.NaN })).toEqual(empty);
  });
  it.each(["weapon", "chest", "head", "arm", "leg"] as const)(
    "전설 필터는 %s 슬롯도 검사한다",
    (slot) => {
      const result = buildEquipmentStats(
        [row(), row({ [slot]: 6 }), row({ [slot]: null }), row({ [slot]: 99 })],
        { ...options, legendOnly: true }
      );
      expect(result.topBuilds).toHaveLength(1);
      expect(result.topBuilds[0].totalGames).toBe(10);
      expect(result.topBuilds[0].pickRate).toBe(100);
    }
  );
  it("무기와 전설 조건을 모두 만족해야 한다", () => {
    expect(
      buildEquipmentStats([row(), row({ weapon: 6 })], {
        ...options,
        bestWeapon: 20,
        legendOnly: true,
      })
    ).toEqual(empty);
  });
  it("슬롯 선택률에서는 null 슬롯의 경기를 분모에서 제외한다", () => {
    const result = buildEquipmentStats([row(), row({ chest: null, totalGames: 30 })], options);
    expect(result.slotPopularity.chest).toEqual([
      { code: 2, totalGames: 10, pickRate: 100, winRate: 20 },
    ]);
    expect(result.coreItems.find((item) => item.code === 2)?.pickRate).toBe(25);
  });
  it("모든 슬롯이 null이어도 빌드 통계는 남긴다", () => {
    const result = buildEquipmentStats(
      [row({ weapon: null, chest: null, head: null, arm: null, leg: null })],
      options
    );
    expect(result.topBuilds).toHaveLength(1);
    expect(result.slotPopularity).toEqual(empty.slotPopularity);
    expect(result.coreItems).toEqual([]);
  });
  it("0판은 비율과 평균을 모두 0으로 반환한다", () => {
    const result = buildEquipmentStats(
      [row({ totalGames: 0, totalWins: 0, rankSum: 0, totalRP: 0 })],
      { ...options, patchVersion: "12.4" }
    );
    expect(result.topBuilds[0]).toMatchObject({
      totalGames: 0,
      pickRate: 0,
      winRate: 0,
      averageRank: 0,
      averageRP: 0,
    });
    expect(result.slotPopularity.weapon[0]).toMatchObject({ pickRate: 0, winRate: 0 });
    expect(result.coreItems[0]).toMatchObject({ pickRate: 0, winRate: 0 });
  });
  it("상위 5개는 합산 게임 수 순이며 선택률 분모에는 잘린 빌드도 포함한다", () => {
    const rows = Array.from({ length: 7 }, (_, i) => row({ weapon: i + 1, totalGames: i + 1 }));
    const result = buildEquipmentStats(rows, options);
    expect(result.topBuilds.map((b) => b.weapon)).toEqual([7, 6, 5, 4, 3]);
    expect(result.topBuilds[0].pickRate).toBe(25);
    expect(result.slotPopularity.weapon.map((item) => item.code)).toEqual([7, 6, 5, 4, 3]);
    expect(result.slotPopularity.weapon[0].pickRate).toBe(25);
    expect(result.coreItems).toHaveLength(5);
  });
  it("동점이면 최초 등장 순서를 유지한다", () => {
    const result = buildEquipmentStats(
      [9, 8, 7, 6, 5, 4].map((weapon) =>
        row({ weapon, chest: null, head: null, arm: null, leg: null })
      ),
      options
    );
    expect(result.topBuilds.map((b) => b.weapon)).toEqual([9, 8, 7, 6, 5]);
    expect(result.coreItems.map((item) => item.code)).toEqual([9, 8, 7, 6, 5]);
  });
  it.each([
    ["12.3", "DIAMOND", 25],
    ["12.4", "DIAMOND", -20],
    ["12.4", "MITHRIL_PLUS", -33],
  ])("%s/%s RP 보정을 합산 후 한 번 적용한다", (patchVersion, tier, expected) => {
    const result = buildEquipmentStats([row(), row({ totalGames: 30, totalRP: 900 })], {
      ...options,
      patchVersion,
      tier,
    });
    expect(result.topBuilds[0].averageRP).toBe(expected);
  });
  it("호출마다 전달된 매핑을 사용한다", () => {
    expect(buildEquipmentStats([row()], { ...options, bestWeapon: 20 }).topBuilds).toEqual([]);
    expect(
      buildEquipmentStats([row()], { ...options, bestWeapon: 20, weaponItemTypes: { "1": 20 } })
        .topBuilds
    ).toHaveLength(1);
    expect(buildEquipmentStats([row()], { ...options, legendOnly: true, itemGrades: {} })).toEqual(
      empty
    );
  });
  it("입력 배열·행·옵션을 변경하지 않고 반복 호출 결과가 같다", () => {
    const rows = Object.freeze([
      Object.freeze(row({ totalGames: 1 })),
      Object.freeze(row({ mainCore: 200, totalGames: 10 })),
    ]);
    const frozen = Object.freeze({
      ...options,
      itemGrades: Object.freeze({ ...options.itemGrades }),
      weaponItemTypes: Object.freeze({ ...options.weaponItemTypes }),
    });
    const before = structuredClone({ rows, frozen });
    const result = buildEquipmentStats(rows, frozen);
    expect({ rows, frozen }).toEqual(before);
    expect(buildEquipmentStats(rows, frozen)).toEqual(result);
    result.topBuilds[0].weapon = 999;
    expect(buildEquipmentStats(rows, frozen).topBuilds[0].weapon).toBe(1);
  });
});
