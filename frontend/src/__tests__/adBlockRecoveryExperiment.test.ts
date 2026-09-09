import { describe, expect, it } from "vitest";
import {
  DISMISS_COOLDOWN_MS,
  RECOVERY_ATTEMPT_TTL_MS,
  claimRecentAdBlockRecoveryMilestone,
  getOrCreateAdBlockRecoveryVariant,
  isAdBlockRecoveryPromptSuppressed,
  markAdBlockRecoveryAttempt,
  resolveAdBlockRecoveryVariant,
  suppressAdBlockRecoveryPrompt,
  type StorageLike,
} from "../lib/adBlockRecoveryExperiment";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("ad block recovery experiment", () => {
  it("splits new visitors into a stable 50/50 variant", () => {
    const contextStorage = new MemoryStorage();
    expect(getOrCreateAdBlockRecoveryVariant(contextStorage, 0.49)).toBe("context");
    expect(getOrCreateAdBlockRecoveryVariant(contextStorage, 0.99)).toBe("context");

    const directStorage = new MemoryStorage();
    expect(getOrCreateAdBlockRecoveryVariant(directStorage, 0.5)).toBe("direct");
    expect(getOrCreateAdBlockRecoveryVariant(directStorage, 0.01)).toBe("direct");
  });

  it("supports kill-switch and winner-lock modes", () => {
    const storage = new MemoryStorage();

    expect(resolveAdBlockRecoveryVariant(storage, "off", 0.1)).toBeNull();
    expect(resolveAdBlockRecoveryVariant(storage, "context", 0.9)).toBe("context");
    expect(resolveAdBlockRecoveryVariant(storage, "direct", 0.1)).toBe("direct");
    expect(resolveAdBlockRecoveryVariant(storage, "experiment", 0.49)).toBe("context");
    expect(resolveAdBlockRecoveryVariant(storage, "experiment", 0.99)).toBe("context");
  });

  it("suppresses a dismissed prompt for 24 hours", () => {
    const storage = new MemoryStorage();
    const now = Date.UTC(2026, 7, 18);

    suppressAdBlockRecoveryPrompt(storage, now);

    expect(isAdBlockRecoveryPromptSuppressed(storage, now + DISMISS_COOLDOWN_MS - 1)).toBe(true);
    expect(isAdBlockRecoveryPromptSuppressed(storage, now + DISMISS_COOLDOWN_MS)).toBe(false);
  });

  it("claims each recovery milestone once without consuming the attempt", () => {
    const storage = new MemoryStorage();
    const now = Date.UTC(2026, 7, 18);

    markAdBlockRecoveryAttempt(storage, {
      variant: "direct",
      attemptedAt: now,
      pagePath: "/ko/patches",
    });

    expect(claimRecentAdBlockRecoveryMilestone(storage, "ad_filled", now + 1000)).toEqual({
      variant: "direct",
      attemptedAt: now,
      pagePath: "/ko/patches",
    });
    expect(claimRecentAdBlockRecoveryMilestone(storage, "ad_filled", now + 1001)).toBeNull();
    expect(claimRecentAdBlockRecoveryMilestone(storage, "bait_passed", now + 3000)).toEqual({
      variant: "direct",
      attemptedAt: now,
      pagePath: "/ko/patches",
    });
    expect(claimRecentAdBlockRecoveryMilestone(storage, "ad_viewed", now + 4000)).toEqual({
      variant: "direct",
      attemptedAt: now,
      pagePath: "/ko/patches",
    });
  });

  it("rejects stale recovery attempts", () => {
    const storage = new MemoryStorage();
    const now = Date.UTC(2026, 7, 18);

    markAdBlockRecoveryAttempt(storage, {
      variant: "context",
      attemptedAt: now - RECOVERY_ATTEMPT_TTL_MS - 1,
      pagePath: "/",
    });

    expect(claimRecentAdBlockRecoveryMilestone(storage, "ad_filled", now)).toBeNull();
  });
});
