import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getCharacterSkillIconUrl, type CharacterSkillIconSlot } from "@/lib/characterSkillIcons";

const SLOTS: CharacterSkillIconSlot[] = ["T", "Q", "W", "E", "R"];

function localAssetPath(url: string): string {
  const pathname = decodeURIComponent(url.split("?")[0]).replace(/^\//, "");
  return join(process.cwd(), "public", pathname);
}

describe("character skill icons", () => {
  it("maps every current character and base skill slot to a local fan-kit PNG", () => {
    for (let characterCode = 1; characterCode <= 90; characterCode += 1) {
      for (const slot of SLOTS) {
        const url = getCharacterSkillIconUrl(characterCode, slot);
        expect(url, `${characterCode} ${slot}`).not.toBeNull();
        expect(existsSync(localAssetPath(url!)), `${characterCode} ${slot}`).toBe(true);
      }
    }
  });

  it("uses the current Lucia icons", () => {
    expect(getCharacterSkillIconUrl(90, "Q")).toContain("Lucia_Q1.png");
    expect(getCharacterSkillIconUrl(90, "T")).toContain("Lucia_P.png");
  });

  it("selects Alex skill form from weapon type", () => {
    expect(getCharacterSkillIconUrl(27, "Q", 2)).toContain("Alex_Melee%20Q.png");
    expect(getCharacterSkillIconUrl(27, "Q", 9)).toContain("Alex_Range%20Q.png");
  });
});
