import { describe, expect, it } from "vitest";
import {
  AD_PLACEMENT_STORAGE_KEY,
  getOrCreateAdPlacementVariant,
  resolveAdPlacementAssignment,
  resolveAdPlacementMode,
  type AdPlacementStorage,
} from "../lib/adPlacementExperiment";

class MemoryStorage implements AdPlacementStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("home ad placement experiment", () => {
  it("keeps a new visitor in the same 50/50 variant", () => {
    const beforeStorage = new MemoryStorage();
    expect(getOrCreateAdPlacementVariant(beforeStorage, 0.49)).toBe("before_forecast");
    expect(getOrCreateAdPlacementVariant(beforeStorage, 0.99)).toBe("before_forecast");

    const afterStorage = new MemoryStorage();
    expect(getOrCreateAdPlacementVariant(afterStorage, 0.5)).toBe("after_forecast");
    expect(getOrCreateAdPlacementVariant(afterStorage, 0.01)).toBe("after_forecast");
    expect(afterStorage.getItem(AD_PLACEMENT_STORAGE_KEY)).toBe("after_forecast");
  });

  it("supports production assignment, local preview, fallback, and winner lock", () => {
    expect(resolveAdPlacementMode(undefined, "production")).toBe("experiment");
    expect(resolveAdPlacementMode(undefined, "development")).toBe("before_forecast");
    expect(resolveAdPlacementMode("unexpected", "production")).toBe("off");

    const storage = new MemoryStorage();
    expect(resolveAdPlacementAssignment(storage, "off", 0.1)).toEqual({
      variant: "after_forecast",
      source: "off",
    });
    expect(resolveAdPlacementAssignment(storage, "before_forecast", 0.9)).toEqual({
      variant: "before_forecast",
      source: "forced",
    });
    expect(resolveAdPlacementAssignment(storage, "after_forecast", 0.1)).toEqual({
      variant: "after_forecast",
      source: "forced",
    });
  });
});
