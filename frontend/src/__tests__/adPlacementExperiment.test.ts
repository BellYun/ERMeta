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

describe("ad placement experiment", () => {
  it("splits new visitors into a stable 50/50 variant", () => {
    const controlStorage = new MemoryStorage();
    expect(getOrCreateAdPlacementVariant(controlStorage, 0.49)).toBe("control");
    expect(getOrCreateAdPlacementVariant(controlStorage, 0.99)).toBe("control");

    const optimizedStorage = new MemoryStorage();
    expect(getOrCreateAdPlacementVariant(optimizedStorage, 0.5)).toBe("optimized");
    expect(getOrCreateAdPlacementVariant(optimizedStorage, 0.01)).toBe("optimized");
    expect(optimizedStorage.getItem(AD_PLACEMENT_STORAGE_KEY)).toBe("optimized");
  });

  it("supports production experiment, local preview, kill switch, and winner lock", () => {
    expect(resolveAdPlacementMode(undefined, "production")).toBe("experiment");
    expect(resolveAdPlacementMode(undefined, "development")).toBe("optimized");
    expect(resolveAdPlacementMode("unexpected", "production")).toBe("off");

    const storage = new MemoryStorage();
    expect(resolveAdPlacementAssignment(storage, "off", 0.9)).toEqual({
      variant: "control",
      source: "off",
    });
    expect(resolveAdPlacementAssignment(storage, "control", 0.9)).toEqual({
      variant: "control",
      source: "forced",
    });
    expect(resolveAdPlacementAssignment(storage, "optimized", 0.1)).toEqual({
      variant: "optimized",
      source: "forced",
    });
  });
});
