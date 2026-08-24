import { getWeaponIconSpritePosition, WEAPON_ICON_SPRITE_URL } from "@/generated/weaponIconSprite";
import { getCharacterMiniWebpUrl, getVersionedCharacterMiniWebpUrl } from "@/lib/characterMap";
import { getVersionedStaticGameAssetUrl, STATIC_GAME_ASSET_VERSION } from "@/lib/staticGameAssets";

describe("versioned static game assets", () => {
  it("adds the shared version to cacheable public assets", () => {
    expect(getVersionedStaticGameAssetUrl("/characters/mini/1.webp")).toBe(
      `/characters/mini/1.webp?v=${STATIC_GAME_ASSET_VERSION}`
    );
    expect(getVersionedStaticGameAssetUrl("/asset.webp?locale=ko")).toBe(
      `/asset.webp?locale=ko&v=${STATIC_GAME_ASSET_VERSION}`
    );
  });

  it("versions direct character minis but leaves optimizer sources and placeholders unchanged", () => {
    expect(getCharacterMiniWebpUrl(1)).toBe("/characters/mini/1.webp");
    expect(getVersionedCharacterMiniWebpUrl(1)).toBe(
      `/characters/mini/1.webp?v=${STATIC_GAME_ASSET_VERSION}`
    );
    expect(getVersionedCharacterMiniWebpUrl(999)).toBe("/characters/placeholder.png");
  });
});

describe("weapon icon sprite", () => {
  it("uses a content-hashed URL and maps supported weapon codes", () => {
    expect(WEAPON_ICON_SPRITE_URL).toMatch(/^\/sprites\/weapon-icons\.[a-f0-9]{12}\.webp$/);
    expect(getWeaponIconSpritePosition(1)).toEqual({ column: 0, row: 0 });
    expect(getWeaponIconSpritePosition(25)).not.toBeNull();
    expect(getWeaponIconSpritePosition(12)).toBeNull();
  });
});
