import { describe, it, expect } from "vitest";
import {
  computeNextAllies,
  parseAllyFromParams,
  type AllySelection,
} from "@/components/features/synergy-detail/WeaponAllySelector";

const item = (charCode: number, weaponCode: number) => ({
  charCode,
  weaponCode,
  weaponLabel: "",
});

describe("parseAllyFromParams", () => {
  it("returns null when the key is absent", () => {
    const params = new URLSearchParams();
    expect(parseAllyFromParams(params, "ally1", "w1")).toBeNull();
  });

  it("parses charCode without weapon", () => {
    const params = new URLSearchParams("ally1=5");
    expect(parseAllyFromParams(params, "ally1", "w1")).toEqual({
      charCode: 5,
      weaponCode: null,
    });
  });

  it("parses charCode + weaponCode", () => {
    const params = new URLSearchParams("ally1=5&w1=3");
    expect(parseAllyFromParams(params, "ally1", "w1")).toEqual({
      charCode: 5,
      weaponCode: 3,
    });
  });

  it("returns null when charCode is not a valid integer", () => {
    const params = new URLSearchParams("ally1=notanumber");
    expect(parseAllyFromParams(params, "ally1", "w1")).toBeNull();
  });
});

describe("computeNextAllies", () => {
  it("fills ally1 slot when no allies are selected", () => {
    const next = computeNextAllies(null, null, item(10, 2));
    expect(next).toEqual([{ charCode: 10, weaponCode: 2 }, null]);
  });

  it("fills ally2 slot when ally1 is occupied", () => {
    const a1: AllySelection = { charCode: 10, weaponCode: 2 };
    const next = computeNextAllies(a1, null, item(20, 5));
    expect(next).toEqual([a1, { charCode: 20, weaponCode: 5 }]);
  });

  it("treats weaponCode 0 as null in selection", () => {
    const next = computeNextAllies(null, null, item(30, 0));
    expect(next).toEqual([{ charCode: 30, weaponCode: null }, null]);
  });

  it("returns null (no change) when both slots are full", () => {
    const a1: AllySelection = { charCode: 1, weaponCode: 1 };
    const a2: AllySelection = { charCode: 2, weaponCode: 2 };
    expect(computeNextAllies(a1, a2, item(3, 3))).toBeNull();
  });

  it("removes ally1 when tapping the already-selected ally1 item", () => {
    const a1: AllySelection = { charCode: 10, weaponCode: 2 };
    const a2: AllySelection = { charCode: 20, weaponCode: 5 };
    const next = computeNextAllies(a1, a2, item(10, 2));
    expect(next).toEqual([a2, null]);
  });

  it("removes ally2 when tapping the already-selected ally2 item", () => {
    const a1: AllySelection = { charCode: 10, weaponCode: 2 };
    const a2: AllySelection = { charCode: 20, weaponCode: 5 };
    const next = computeNextAllies(a1, a2, item(20, 5));
    expect(next).toEqual([a1, null]);
  });

  it("matches already-selected when stored weaponCode is null but item weaponCode is 0", () => {
    const a1: AllySelection = { charCode: 27, weaponCode: null };
    const next = computeNextAllies(a1, null, item(27, 0));
    // same char+weapon → remove
    expect(next).toEqual([null, null]);
  });
});

describe("handleSelect callback stability (integration)", () => {
  /**
   * This test documents the invariant that the callback dependency set
   * of handleSelect must NOT include ally1/ally2/selectedAllies/isSelected.
   * The actual stability is enforced by computeNextAllies being a pure
   * external function + allyRef carrying the latest values.
   *
   * If a future refactor adds those deps back, the callback identity
   * would change on every selection, breaking CharWeaponCell's React.memo
   * and causing the 2nd-tap touch delay to return.
   */
  it("computeNextAllies is a free-standing pure function independent of React state", () => {
    // Smoke check: import points to a function, not a hook
    expect(typeof computeNextAllies).toBe("function");
    // Calling twice with the same inputs yields structurally equal outputs
    const [a, b] = [
      computeNextAllies(null, null, item(1, 1)),
      computeNextAllies(null, null, item(1, 1)),
    ];
    expect(a).toEqual(b);
  });
});
