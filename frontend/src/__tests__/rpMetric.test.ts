import { describe, expect, it } from "vitest";
import { getAverageRP, hasComparableRP } from "@/lib/rpMetric";

describe("12.4+ fixed entry cost metric", () => {
  it.each([
    ["DIAMOND_PLUS", 15],
    ["METEORITE_PLUS", 7],
    ["MITHRIL_PLUS", 2],
  ])("subtracts the %s scope fee once after averaging", (tier, expected) => {
    expect(getAverageRP(600, 10, "12.4", tier)).toBe(expected);
    expect(getAverageRP(1800, 10, "12.4", tier, 3)).toBe(expected);
  });

  it("keeps pre-12.4 net RP without another fee deduction", () => {
    expect(getAverageRP(60, 10, "12.3", "DIAMOND_PLUS")).toBe(6);
  });

  it("does not compare the two different RP formulas", () => {
    expect(hasComparableRP("12.4", "12.3")).toBe(false);
    expect(hasComparableRP("12.5", "12.4")).toBe(true);
    expect(hasComparableRP("12.3", "12.2")).toBe(true);
  });
});
