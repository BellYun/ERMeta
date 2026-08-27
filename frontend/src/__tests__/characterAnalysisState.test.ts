import { describe, expect, it } from "vitest";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { mergeSuccessfulPatchStats } from "@/components/features/character-analysis/utils";

function stats(id: string) {
  return { patchVersion: id } as CharacterStatsResponse;
}

describe("mergeSuccessfulPatchStats", () => {
  it("실패한 요청 결과만 있으면 기존 배열 참조를 유지한다", () => {
    const current: (CharacterStatsResponse | null)[] = [];

    const result = mergeSuccessfulPatchStats(current, 2, 0, null, null, true);

    expect(result).toBe(current);
    expect(result).toEqual([]);
  });

  it("성공한 요청 결과만 정해진 패치 위치에 저장한다", () => {
    const current: (CharacterStatsResponse | null)[] = [];
    const selected = stats("12.1");

    const result = mergeSuccessfulPatchStats(current, 2, 0, selected, null, true);

    expect(result).not.toBe(current);
    expect(result).toEqual([selected, null]);
  });

  it("이미 저장된 동일 결과에는 새 배열을 만들지 않는다", () => {
    const selected = stats("12.1");
    const current = [selected, null];

    const result = mergeSuccessfulPatchStats(current, 2, 0, selected, null, true);

    expect(result).toBe(current);
  });
});
