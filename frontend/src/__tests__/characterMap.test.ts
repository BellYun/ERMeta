import { describe, expect, it } from "vitest";
import {
  getCharacterImageUrl,
  getCharacterMiniWebpUrl,
  getCharacterName,
  getComboRoles,
  isKnownCharacterCode,
} from "@/lib/characterMap";

describe("current character roster", () => {
  it("registers Lucia with her static name and portraits", () => {
    expect(getCharacterName(90)).toBe("루치아");
    expect(isKnownCharacterCode(90)).toBe(true);
    expect(getCharacterImageUrl(90)).toBe("/CharactER/090.%20Lucia/02.%20Default/Mini.png");
    expect(getCharacterMiniWebpUrl(90)).toBe("/characters/mini/90.webp");
  });
});

describe("character role overrides", () => {
  it.each([
    [58, 10, "헤이즈"],
    [89, 9, "크레이버"],
    [90, 11, "루치아"],
  ])("classifies %s_%s %s as a skill dealer", (characterCode, weaponCode) => {
    expect(getComboRoles(characterCode, weaponCode)).toEqual(["스킬딜러"]);
  });
});
