import type { PatchItemExposure } from "./12.4-item-exposure";
import snapshot from "./12.5-prepatch-exposure.json";
import { getCharacterPatchNote } from "./patch-notes";

// 2026-10-01 15:01 KST: 12.4 Diamond+ final-equipment and main-trait snapshot.
// Item pick rate uses games with a non-null item in that slot as denominator.
const profiles = new Map(
  snapshot.profiles.map((profile) => [`${profile.characterCode}:${profile.weaponCode}`, profile])
);

export function get12_5ItemExposure(
  characterCode: number,
  weaponCode: number
): readonly PatchItemExposure[] {
  const profile = profiles.get(`${characterCode}:${weaponCode}`);
  if (!profile) return [];
  const direct = getCharacterPatchNote(characterCode, "12.5")?.changes.some(
    (change) => change.weaponMasteryCode === undefined || change.weaponMasteryCode === weaponCode
  );
  const minimumRate = direct ? 5 : 20;
  return profile.items
    .filter((item) => item.pickRate >= minimumRate)
    .map(({ itemCode, pickRate }) => ({ itemCode, pickRate }));
}

export function get12_5TraitExposure(characterCode: number, weaponCode: number) {
  return profiles.get(`${characterCode}:${weaponCode}`)?.traits ?? [];
}

export const PATCH_12_5_EXPOSURE_CAPTURED_AT = snapshot.capturedAt;
