import { describe, expect, it } from "vitest";
import { PATCH_12_4_BALANCE_CONTEXT, PATCH_12_4_SOURCE } from "@/data/12.4-balance-context";
import { get12_4ItemExposure, PATCH_12_4_ITEM_EXPOSURE } from "@/data/12.4-item-exposure";
import { getForecastItemChanges } from "@/data/patch-indirect-changes";
import {
  getAllPatchVersions,
  getCharacterPatchNote,
  getNotesByPatch,
  getPatchSummary,
  getStatsPatchVersions,
  getVisibleStatsPatchVersions,
} from "@/data/patch-notes";
import {
  getCharacterTierForecasts,
  getPatchTierForecasts,
  getPatchTierForecastVersions,
} from "@/data/patch-tier-forecasts";

describe("11.7 patch notes", () => {
  it("11.7을 패치 목록에 노출한다", () => {
    expect(getAllPatchVersions()).toContain("11.7");
  });

  it("메인과 실험체 분석에서 11.1부터 노출한다", () => {
    expect(getVisibleStatsPatchVersions()).toContain("11.7");
    expect(getVisibleStatsPatchVersions()).toContain("11.1");
    expect(getVisibleStatsPatchVersions()).not.toContain("11.0");
    expect(getVisibleStatsPatchVersions()).not.toContain("10.7");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("11.7")).toHaveLength(25);
    expect(getPatchSummary("11.7")).toEqual({
      patch: "11.7",
      totalChanges: 27,
      buffs: 12,
      nerfs: 15,
      reworks: 0,
      characterCount: 25,
    });
  });

  it("상향과 하향이 함께 있는 리오 변경을 각각 기록한다", () => {
    const rio = getCharacterPatchNote(31, "11.7");

    expect(rio?.changes.map((change) => change.changeType)).toEqual(["buff", "nerf"]);
  });
});

describe("12.0 patch notes", () => {
  it("12.0 핫픽스 변경까지 보존한다", () => {
    expect(getAllPatchVersions()).toContain("12.0");
  });

  it("프리시즌 12.0을 통계 패치 목록에서는 제외한다", () => {
    expect(getStatsPatchVersions()).not.toContain("12.0");
    expect(getStatsPatchVersions()).toContain("12.1");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("12.0")).toHaveLength(25);
    expect(getPatchSummary("12.0")).toEqual({
      patch: "12.0",
      totalChanges: 74,
      buffs: 35,
      nerfs: 29,
      reworks: 10,
      characterCount: 25,
    });
  });

  it("상향과 하향이 함께 있는 다니엘 변경을 각각 기록한다", () => {
    const daniel = getCharacterPatchNote(37, "12.0");

    expect(daniel?.changes.map((change) => change.changeType)).toEqual(["buff", "nerf", "nerf"]);
  });
});

describe("12.1 patch notes", () => {
  it("12.1을 패치 및 통계 이력에 보존한다", () => {
    expect(getAllPatchVersions()).toContain("12.1");
    expect(getStatsPatchVersions()).toContain("12.1");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("12.1")).toHaveLength(23);
    expect(getPatchSummary("12.1")).toEqual({
      patch: "12.1",
      totalChanges: 34,
      buffs: 12,
      nerfs: 21,
      reworks: 1,
      characterCount: 23,
    });
  });

  it("12.1b 핫픽스 실험체 변경을 누적한다", () => {
    expect(getCharacterPatchNote(47, "12.1")?.changes).toHaveLength(2);
    expect(getCharacterPatchNote(28, "12.1")?.changes).toHaveLength(4);
    expect(getCharacterPatchNote(1, "12.1")?.changes).toHaveLength(2);
    expect(getCharacterPatchNote(54, "12.1")?.changes).toHaveLength(1);
  });

  it("상향과 하향이 함께 있는 엘레나 변경을 각각 기록한다", () => {
    const elena = getCharacterPatchNote(50, "12.1");

    expect(elena?.changes.map((change) => change.changeType)).toEqual(["buff", "nerf"]);
  });
});

describe("12.2 patch notes", () => {
  it("12.2를 패치 및 통계 이력에 유지한다", () => {
    expect(getAllPatchVersions()).toContain("12.2");
    expect(getStatsPatchVersions()).toContain("12.2");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("12.2")).toHaveLength(39);
    expect(getPatchSummary("12.2")).toEqual({
      patch: "12.2",
      totalChanges: 57,
      buffs: 34,
      nerfs: 22,
      reworks: 1,
      characterCount: 39,
    });
  });

  it("12.2b 핫픽스 실험체 변경을 누적한다", () => {
    expect(getCharacterPatchNote(90, "12.2")?.changes).toHaveLength(3);
    expect(getCharacterPatchNote(1, "12.2")?.changes).toHaveLength(4);
    expect(getCharacterPatchNote(89, "12.2")?.changes).toHaveLength(1);
  });

  it("무기별 상향과 하향 및 핫픽스가 함께 있는 재키 변경을 각각 기록한다", () => {
    expect(getCharacterPatchNote(1, "12.2")?.changes.map((change) => change.changeType)).toEqual([
      "nerf",
      "nerf",
      "buff",
      "nerf",
    ]);
  });
});

describe("12.3 patch notes", () => {
  it("12.3을 이전 패치 및 통계 후보로 유지한다", () => {
    expect(getAllPatchVersions()).toContain("12.3");
    expect(getStatsPatchVersions()).toContain("12.3");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("12.3")).toHaveLength(39);
    expect(getPatchSummary("12.3")).toEqual({
      patch: "12.3",
      totalChanges: 60,
      buffs: 37,
      nerfs: 23,
      reworks: 0,
      characterCount: 39,
    });
  });

  it("상향과 하향이 함께 있는 재키와 크레이버 변경을 각각 기록한다", () => {
    expect(getCharacterPatchNote(1, "12.3")?.changes.map((change) => change.changeType)).toEqual([
      "nerf",
      "nerf",
      "buff",
      "buff",
      "buff",
      "nerf",
      "nerf",
    ]);
    expect(getCharacterPatchNote(89, "12.3")?.changes.map((change) => change.changeType)).toEqual([
      "nerf",
      "buff",
      "buff",
      "nerf",
      "buff",
    ]);
  });
});

describe("12.4 patch notes", () => {
  it("12.4를 최신 패치로 노출하고 12.3 이력을 유지한다", () => {
    expect(getAllPatchVersions().slice(0, 2)).toEqual(["12.4", "12.3"]);
    expect(getStatsPatchVersions().slice(0, 2)).toEqual(["12.4", "12.3"]);
  });

  it("공식 실험체 35명의 변경 방향을 보존한다", () => {
    expect(getNotesByPatch("12.4")).toHaveLength(35);
    expect(getPatchSummary("12.4")).toEqual({
      patch: "12.4",
      totalChanges: 45,
      buffs: 24,
      nerfs: 21,
      reworks: 0,
      characterCount: 35,
    });
  });

  it("무기별 조정과 전체 VF 의수 개선을 혼합 변경으로 유지한다", () => {
    expect(
      getCharacterPatchNote(15, "12.4")?.changes.map((change) => [
        change.weaponMasteryCode,
        change.changeType,
      ])
    ).toEqual([
      [5, "nerf"],
      [6, "buff"],
    ]);
    expect(getCharacterPatchNote(44, "12.4")?.changes.map((change) => change.changeType)).toEqual([
      "nerf",
      "buff",
    ]);
    expect(getCharacterPatchNote(9, "12.4")?.changes[0].weaponMasteryCode).toBe(9);
  });

  it("시스템·특성·장비 변경과 공식 출처를 별도로 보존한다", () => {
    expect(PATCH_12_4_SOURCE).toContain("/news/3838");
    expect(PATCH_12_4_BALANCE_CONTEXT.map((section) => section.title)).toEqual([
      "맵·경제·무기 스킬",
      "특성",
      "무기",
      "방어구·강화",
    ]);
    expect(PATCH_12_4_BALANCE_CONTEXT.flatMap((section) => section.entries)).toHaveLength(43);
  });

  it("직접 조정 35명과 장비 간접 영향 조합의 무기별 예상 티어를 제공한다", () => {
    const forecasts = getPatchTierForecasts("12.4");
    const tierOrder = { D: 0, C: 1, B: 2, A: 3, S: 4 };
    const directCharacters = new Set(
      getNotesByPatch("12.4").map(({ characterCode }) => characterCode)
    );

    expect(getPatchTierForecastVersions()[0]).toBe("12.4");
    expect(forecasts).toHaveLength(60);
    expect(directCharacters.size).toBe(35);
    expect(
      [...directCharacters].every((code) =>
        forecasts.some(({ characterCode }) => code === characterCode)
      )
    ).toBe(true);
    expect(
      new Set(forecasts.map(({ characterCode, weaponCode }) => `${characterCode}:${weaponCode}`))
        .size
    ).toBe(forecasts.length);
    const itemOnlyForecasts = forecasts.filter(({ characterCode, weaponCode }) => {
      const note = getCharacterPatchNote(characterCode, "12.4");
      return !note?.changes.some(
        (change) =>
          change.weaponMasteryCode === undefined || change.weaponMasteryCode === weaponCode
      );
    });
    expect(itemOnlyForecasts).toHaveLength(17);
    for (const { characterCode, weaponCode } of itemOnlyForecasts) {
      expect(get12_4ItemExposure(characterCode, weaponCode).length).toBeGreaterThan(0);
    }
    for (const forecast of forecasts) {
      expect(forecast.reason.length).toBeGreaterThan(20);
      expect(tierOrder[forecast.tierLow]).toBeLessThanOrEqual(tierOrder[forecast.tierMid]);
      expect(tierOrder[forecast.tierMid]).toBeLessThanOrEqual(tierOrder[forecast.tierHigh]);
      if (!directCharacters.has(forecast.characterCode)) {
        expect(
          get12_4ItemExposure(forecast.characterCode, forecast.weaponCode).length
        ).toBeGreaterThan(0);
      }
    }
  });

  it("실험체 직접 변경과 장비만의 간접 변경을 무기별로 구분한다", () => {
    expect(
      getCharacterTierForecasts("12.4", 9).map(({ weaponCode, currentTier, tierMid }) => [
        weaponCode,
        currentTier,
        tierMid,
      ])
    ).toEqual([
      [9, "C", "B"],
      [10, "A", "A"],
    ]);
    expect(getCharacterTierForecasts("12.4", 9)[1]?.reason).toContain(
      "권총 전용 R 상향은 적용되지"
    );
    expect(
      getCharacterTierForecasts("12.4", 15).map(({ weaponCode, tierMid }) => [weaponCode, tierMid])
    ).toEqual([
      [5, "B"],
      [6, "A"],
    ]);
    expect(getCharacterTierForecasts("12.4", 25).map(({ weaponCode }) => weaponCode)).toEqual([11]);
  });

  it("12.3 장비 사용률이 확인된 조합에만 관련 12.4 아이템 패치를 연결한다", () => {
    const linkedKeys = Object.keys(PATCH_12_4_ITEM_EXPOSURE);
    expect(linkedKeys.length).toBeGreaterThan(30);

    for (const key of linkedKeys) {
      const [characterCode, weaponCode] = key.split(":").map(Number);
      const exposure = get12_4ItemExposure(characterCode, weaponCode);
      const changes = getForecastItemChanges("12.4", characterCode, weaponCode);
      expect(changes).toHaveLength(exposure.length);
      for (const { pickRate } of exposure) {
        expect(pickRate).toBeGreaterThan(0);
        expect(pickRate).toBeLessThanOrEqual(100);
        expect(changes.some(({ target }) => target.includes(`12.3 사용 ${pickRate}%`))).toBe(true);
      }
    }

    expect(getForecastItemChanges("12.4", 25, 11).map(({ changeType }) => changeType)).toEqual([
      "buff",
      "nerf",
    ]);
    expect(getForecastItemChanges("12.4", 44, 25)[0]?.changeType).toBe("nerf");
    expect(getForecastItemChanges("12.4", 31, 7)[0]?.target).toContain("갤럭시 스텝");
    expect(getForecastItemChanges("12.4", 9, 9)).toHaveLength(1);
    expect(getForecastItemChanges("12.4", 9, 10)[0]?.target).toContain("화령장");
    expect(getForecastItemChanges("12.4", 62, 11)).toEqual([]);
    expect(
      Object.values(PATCH_12_4_ITEM_EXPOSURE)
        .flat()
        .map(({ itemCode }) => itemCode)
    ).not.toContain(205305);
    expect(
      Object.values(PATCH_12_4_ITEM_EXPOSURE)
        .flat()
        .map(({ itemCode }) => itemCode)
    ).not.toContain(705619);
  });
});
