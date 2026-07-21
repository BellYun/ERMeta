import { describe, expect, it } from "vitest";
import { l10nReducer } from "@/components/L10nProvider";

describe("l10nReducer", () => {
  it("keeps the current dictionary while the next language starts loading", () => {
    const currentL10n = new Map([
      ["Character/Name/1", "재키"],
      ["WeaponType/Axe", "도끼"],
    ]);

    const nextState = l10nReducer(
      { l10n: currentL10n, loading: false, error: "previous error" },
      { type: "FETCH_START" }
    );

    expect(nextState).toEqual({
      l10n: currentL10n,
      loading: true,
      error: null,
    });
    expect(nextState.l10n).toBe(currentL10n);
  });
});
