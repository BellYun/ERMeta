import type { PatchItemExposure } from "./12.4-item-exposure";
import snapshot from "./12.6-prepatch-exposure.json";
import { getCharacterPatchNote } from "./patch-notes";

// 12.5 Diamond+ build snapshot taken before the 12.6 maintenance ended.
// Rates use all recorded character games for the matching weapon as denominator.
const profiles = new Map(
  snapshot.profiles.map((profile) => [`${profile.characterCode}:${profile.weaponCode}`, profile])
);

export function get12_6ItemExposure(
  characterCode: number,
  weaponCode: number
): readonly PatchItemExposure[] {
  const profile = profiles.get(`${characterCode}:${weaponCode}`);
  if (!profile) return [];
  const direct = getCharacterPatchNote(characterCode, "12.6")?.changes.some(
    (entry) => entry.weaponMasteryCode === undefined || entry.weaponMasteryCode === weaponCode
  );
  const minimumRate = direct ? 5 : 20;
  return profile.items
    .filter((item) => item.pickRate >= minimumRate)
    .map(({ itemCode, pickRate }) => ({ itemCode, pickRate }));
}

export function get12_6TraitExposure(characterCode: number, weaponCode: number) {
  return profiles.get(`${characterCode}:${weaponCode}`)?.traits ?? [];
}

export const PATCH_12_6_EXPOSURE_CAPTURED_AT = snapshot.capturedAt;
