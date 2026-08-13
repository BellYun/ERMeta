import { describe, expect, it } from "vitest";
import {
  getAllPatchVersions,
  getCharacterPatchNote,
  getNotesByPatch,
  getPatchSummary,
  getStatsPatchVersions,
  getVisibleStatsPatchVersions,
} from "@/data/patch-notes";

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
    expect(getStatsPatchVersions()[0]).toBe("12.1");
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
  it("12.1을 최신 패치 및 통계 패치로 노출한다", () => {
    expect(getAllPatchVersions()[0]).toBe("12.1");
    expect(getStatsPatchVersions()[0]).toBe("12.1");
  });

  it("공식 실험체 변경 수와 유형을 보존한다", () => {
    expect(getNotesByPatch("12.1")).toHaveLength(20);
    expect(getPatchSummary("12.1")).toEqual({
      patch: "12.1",
      totalChanges: 26,
      buffs: 12,
      nerfs: 13,
      reworks: 1,
      characterCount: 20,
    });
  });

  it("상향과 하향이 함께 있는 엘레나 변경을 각각 기록한다", () => {
    const elena = getCharacterPatchNote(50, "12.1");

    expect(elena?.changes.map((change) => change.changeType)).toEqual(["buff", "nerf"]);
  });
});
