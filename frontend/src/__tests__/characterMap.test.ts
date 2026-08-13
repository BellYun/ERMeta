import { describe, expect, it } from "vitest";
import { getComboRoles } from "@/lib/characterMap";

describe("character role overrides", () => {
  it.each([
    [58, 10, "헤이즈"],
    [89, 9, "크레이버"],
  ])("classifies %s_%s %s as a skill dealer", (characterCode, weaponCode) => {
    expect(getComboRoles(characterCode, weaponCode)).toEqual(["스킬딜러"]);
  });
});
