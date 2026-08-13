import { describe, expect, it } from "vitest";
import type { LabData } from "@/components/features/lab/types";
import {
  compareCharacterStatisticalProfiles,
  findCrossGroupStatisticalPairs,
} from "@/lib/labStatisticalSimilarity";
import warriorsJson from "../../public/data/lab/warriors.json";

const warriors = warriorsJson as LabData;

function character(name: string, weaponName: string) {
  const found = warriors.characters.find(
    (entry) => entry.characterName === name && entry.weaponName === weaponName
  );
  if (!found) throw new Error(`${name} ${weaponName} profile not found`);
  return found;
}

describe("cross-group statistical similarity", () => {
  it("keeps Laura and rapier Fiora separate despite the same combat function", () => {
    const comparison = compareCharacterStatisticalProfiles(
      character("라우라", "채찍"),
      character("피오라", "레이피어")
    );

    expect(comparison.sharedCompositions).toBe(12);
    expect(comparison.signAgreement).toBeCloseTo(0.5);
    expect(comparison.shareGap).toBeGreaterThan(0.65);
    expect(comparison.compatible).toBe(false);
  });

  it("finds similar profiles across different first-stage groups", () => {
    const pairs = findCrossGroupStatisticalPairs(warriors);
    const includesPair = (leftName: string, rightName: string) =>
      pairs.some(
        (pair) =>
          [pair.left.characterName, pair.right.characterName].includes(leftName) &&
          [pair.left.characterName, pair.right.characterName].includes(rightName)
      );

    expect(includesPair("라우라", "루크")).toBe(true);
    expect(includesPair("라우라", "피오라")).toBe(false);
  });
});
