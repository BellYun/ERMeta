import {
  DEFAULT_HOME_TIER,
  buildHomeFiltersQuery,
  normalizeHomePatch,
  normalizeHomeTier,
} from "@/lib/homeFilters";

describe("normalizeHomePatch", () => {
  const patches = ["10.7", "10.6", "10.5"];

  it("returns the latest patch when the query is absent", () => {
    expect(normalizeHomePatch(undefined, patches)).toBe("10.7");
  });

  it("keeps a valid patch query", () => {
    expect(normalizeHomePatch("10.6", patches)).toBe("10.6");
  });

  it("drops an invalid patch query back to the default patch", () => {
    expect(normalizeHomePatch("9.9", patches)).toBe("10.7");
  });
});

describe("normalizeHomeTier", () => {
  it("returns the default tier when the query is absent", () => {
    expect(normalizeHomeTier(undefined)).toBe(DEFAULT_HOME_TIER);
  });

  it("keeps a valid tier query", () => {
    expect(normalizeHomeTier("DIAMOND")).toBe("DIAMOND");
  });

  it("drops an invalid tier query back to the default tier", () => {
    expect(normalizeHomeTier("IRON")).toBe(DEFAULT_HOME_TIER);
  });
});

describe("buildHomeFiltersQuery", () => {
  it("omits default filter values from the URL", () => {
    expect(
      buildHomeFiltersQuery({
        currentQuery: "",
        patch: "10.7",
        tier: DEFAULT_HOME_TIER,
        defaultPatch: "10.7",
      })
    ).toBe("");
  });

  it("keeps non-filter query params while updating patch and tier", () => {
    expect(
      buildHomeFiltersQuery({
        currentQuery: "utm_source=discord",
        patch: "10.6",
        tier: "DIAMOND",
        defaultPatch: "10.7",
      })
    ).toBe("utm_source=discord&patch=10.6&tier=DIAMOND");
  });

  it("removes only the filter params when they return to defaults", () => {
    expect(
      buildHomeFiltersQuery({
        currentQuery: "utm_source=discord&patch=10.6&tier=DIAMOND",
        patch: "10.7",
        tier: DEFAULT_HOME_TIER,
        defaultPatch: "10.7",
      })
    ).toBe("utm_source=discord");
  });
});
