import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignAdBlockRecoveryPilot,
  claimAdBlockRecoveryPilotCoreUse,
  getAdBlockRecoveryPilotChannel,
  resolveAdBlockRecoveryPilotConfig,
} from "../lib/adBlockRecoveryPilot";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-11-10T00:00:00+09:00");
const CONFIG = resolveAdBlockRecoveryPilotConfig("2026-11-10T00:00:00+09:00", "101,102,201,202")!;
const ELIGIBLE = () => true;

describe("ad block recovery pilot", () => {
  let saved: Map<string, string>;
  let bucket: number;

  beforeEach(() => {
    saved = new Map();
    bucket = 0;
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => saved.set(key, value),
      },
    });
    let pending: Promise<unknown> = Promise.resolve();
    vi.stubGlobal("navigator", {
      locks: {
        request<T>(_name: string, callback: () => T) {
          const next = pending.then(callback);
          pending = next.catch(() => undefined);
          return next;
        },
      },
    });
    vi.stubGlobal("crypto", {
      randomUUID: () => "assignment-1",
      getRandomValues(values: Uint32Array) {
        values[0] = bucket;
        return values;
      },
    });
    vi.spyOn(Date, "now").mockReturnValue(START);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requires four unique numeric channels and a time zone", () => {
    expect(
      resolveAdBlockRecoveryPilotConfig("2026-11-10T00:00:00", "101,102,201,202")
    ).toBeUndefined();
    expect(
      resolveAdBlockRecoveryPilotConfig("2026-11-10T00:00:00Z", "101,101,201,202")
    ).toBeUndefined();
    expect(
      resolveAdBlockRecoveryPilotConfig("2026-11-10T00:00:00Z", "101,,201,202")
    ).toBeUndefined();
  });

  it("allocates once across tabs and keeps the original arm and half", async () => {
    expect(getAdBlockRecoveryPilotChannel(CONFIG)).toBeUndefined();
    const [first, second] = await Promise.all([
      assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE),
      assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE),
    ]);
    expect(first).toMatchObject({ assignment: { variant: "context", half: "first" }, isNew: true });
    expect(second).toEqual({ assignment: first?.assignment, isNew: false });
    bucket = 2 ** 31;
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toEqual(second);
    expect(getAdBlockRecoveryPilotChannel(CONFIG)).toBe("101");
    saved.clear();
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toMatchObject({
      assignment: { variant: "holdout", half: "first" },
    });
    expect(getAdBlockRecoveryPilotChannel(CONFIG)).toBe("102");
  });

  it("uses the second half at day 15 and closes enrollment at day 30", async () => {
    vi.mocked(Date.now).mockReturnValue(START - 1);
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toBeUndefined();
    vi.mocked(Date.now).mockReturnValue(START + 15 * DAY_MS);
    bucket = 2 ** 31;
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toMatchObject({
      assignment: { variant: "holdout", half: "second" },
    });
    expect(getAdBlockRecoveryPilotChannel(CONFIG)).toBe("202");
    saved.clear();
    bucket = 0;
    vi.mocked(Date.now).mockReturnValue(START + 30 * DAY_MS - 1);
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toMatchObject({
      assignment: { variant: "context", half: "second" },
    });
    expect(getAdBlockRecoveryPilotChannel(CONFIG, Date.now() + 7 * DAY_MS - 1)).toBe("201");
    expect(getAdBlockRecoveryPilotChannel(CONFIG, Date.now() + 7 * DAY_MS)).toBeUndefined();
    vi.mocked(Date.now).mockReturnValue(START + 30 * DAY_MS);
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toMatchObject({ isNew: false });
    saved.clear();
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toBeUndefined();
  });

  it("tracks a single qualifying core use across tabs within 24 hours", async () => {
    const result = await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE);
    expect(await claimAdBlockRecoveryPilotCoreUse(CONFIG, START - 1)).toBeUndefined();
    expect(await claimAdBlockRecoveryPilotCoreUse(CONFIG, START + DAY_MS)).toBeUndefined();

    const events = await Promise.all([
      claimAdBlockRecoveryPilotCoreUse(CONFIG, START + DAY_MS - 1),
      claimAdBlockRecoveryPilotCoreUse(CONFIG, START + DAY_MS - 1),
    ]);
    expect(events).toEqual([result?.assignment, undefined]);
  });

  it("does not re-enroll expired browsers or enroll after eligibility changes", async () => {
    expect(await assignAdBlockRecoveryPilot(CONFIG, () => false)).toBeUndefined();
    expect(saved.size).toBe(0);
    await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE);
    vi.mocked(Date.now).mockReturnValue(START + 7 * DAY_MS);
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toBeUndefined();
  });

  it("fails closed when durable assignment is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    expect(await assignAdBlockRecoveryPilot(CONFIG, ELIGIBLE)).toBeUndefined();
    expect(saved.size).toBe(0);
  });
});
