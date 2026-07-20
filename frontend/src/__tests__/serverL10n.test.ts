import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "@/lib/detectLanguage";
import { extractL10nSeed, loadL10nSeed } from "@/lib/serverL10n";

describe("l10n seed", () => {
  it("keeps only names required for the initial paint", () => {
    expect(
      extractL10nSeed({
        "Character/Name/1": "Jackie",
        "WeaponType/Axe": "Axe",
        "Trait/Name/7000201": "Vigor",
        "Item/Name/101101": "Scissors",
        "Skill/Name/1001000": "Chain Saw Murderer",
        "Trait/Description/7000201": "Ignored",
      })
    ).toEqual({
      "Character/Name/1": "Jackie",
      "WeaponType/Axe": "Axe",
      "Trait/Name/7000201": "Vigor",
    });
  });

  it.each(SUPPORTED_LANGUAGES)("loads a compact %s seed", (language) => {
    const seed = loadL10nSeed(language);

    expect(seed).toBeDefined();
    expect(Object.keys(seed ?? {})).not.toHaveLength(0);
    expect(Buffer.byteLength(JSON.stringify(seed))).toBeLessThan(20_000);
    expect(
      Object.keys(seed ?? {}).every((key) =>
        ["Character/Name/", "WeaponType/", "Trait/Name/"].some((prefix) => key.startsWith(prefix))
      )
    ).toBe(true);
  });
});
