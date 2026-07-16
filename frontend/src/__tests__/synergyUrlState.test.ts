import { describe, expect, it } from "vitest";
import { parseMinimumGamesParam } from "@/lib/synergyUrlState";

describe("synergy URL state", () => {
  it("accepts only supported minimum-game thresholds", () => {
    expect(parseMinimumGamesParam(null)).toBe(0);
    expect(parseMinimumGamesParam("0")).toBe(0);
    expect(parseMinimumGamesParam("30")).toBe(30);
    expect(parseMinimumGamesParam("29")).toBe(0);
    expect(parseMinimumGamesParam("30games")).toBe(0);
    expect(parseMinimumGamesParam("invalid")).toBe(0);
  });
});
