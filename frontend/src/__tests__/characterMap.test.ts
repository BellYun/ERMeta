import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import {
  getCharacterImageUrl,
  getCharacterMiniWebpUrl,
  getCharacterName,
  getComboRoles,
  isKnownCharacterCode,
} from "@/lib/characterMap";
import { selectCharacterPatches } from "@/lib/getPatches";

describe("current character roster", () => {
  it("registers Lucia with her static name and portraits", () => {
    expect(getCharacterName(90)).toBe("루치아");
    expect(isKnownCharacterCode(90)).toBe(true);
    expect(getCharacterImageUrl(90)).toBe("/CharactER/090.%20Lucia/02.%20Default/Mini.png");
    expect(getCharacterMiniWebpUrl(90)).toBe("/characters/mini/90.webp");
  });

  it("includes Seres in the statically generated character pages", () => {
    expect(CHARACTER_CODES).toContain(91);
    expect(getCharacterName(91)).toBe("세레스");
    expect(getCharacterImageUrl(91)).toBe("/characters/91.png");
    expect(getCharacterMiniWebpUrl(91)).toBe("/characters/mini/91.webp");
    expect(getComboRoles(91, 16)).toEqual(["탱커", "지원가"]);
    expect(sitemap().some((entry) => entry.url.endsWith("/character/91"))).toBe(true);
    expect(selectCharacterPatches(91, ["12.4", "12.3"])).toEqual(["12.5"]);
    expect(selectCharacterPatches(91, ["12.6", "12.5", "12.4"])).toEqual(["12.6", "12.5"]);
    expect(selectCharacterPatches(90, ["12.4", "12.3"])).toEqual(["12.4", "12.3"]);
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
