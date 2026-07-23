import { describe, expect, it } from "vitest";
import {
  getAllPatchVersions,
  getCharacterPatchNote,
  getNotesByPatch,
  getPatchSummary,
} from "@/data/patch-notes";

describe("11.7 patch notes", () => {
  it("11.7을 최신 패치로 노출한다", () => {
    expect(getAllPatchVersions()[0]).toBe("11.7");
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
