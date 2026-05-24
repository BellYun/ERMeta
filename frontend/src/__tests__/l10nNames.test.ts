import { describe, expect, it } from "vitest";
import { extractPrefixedNames } from "@/lib/l10nNames";

describe("extractPrefixedNames", () => {
  it("extracts only matching numeric codes", () => {
    const source = {
      "Item/Name/101": "Steel Sword",
      "Item/Name/102": "Leather Shield",
      "Item/Desc/101": "ignored",
      "Item/Name/not-a-number": "ignored",
      "Trait/Name/201": "Support",
    };

    expect(extractPrefixedNames(source, "Item/Name/")).toEqual({
      101: "Steel Sword",
      102: "Leather Shield",
    });
  });

  it("returns an empty object when no matching keys exist", () => {
    expect(extractPrefixedNames({ "Trait/Name/1": "Amp" }, "Item/Name/")).toEqual({});
  });
});
