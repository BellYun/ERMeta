import type { CharacterPatchNote } from "./10.1"
import { PATCH_NOTES as PATCH_10_1 } from "./10.1"
import { PATCH_NOTES as PATCH_10_2 } from "./10.2"
import { PATCH_NOTES as PATCH_10_3 } from "./10.3"
import { PATCH_NOTES as PATCH_10_4 } from "./10.4"
import { PATCH_NOTES as PATCH_10_5 } from "./10.5"

export type { ChangeType, PatchChange, CharacterPatchNote } from "./10.1"

export const PATCH_NOTES: CharacterPatchNote[] = [
  ...PATCH_10_1,
  ...PATCH_10_2,
  ...PATCH_10_3,
  ...PATCH_10_4,
  ...PATCH_10_5,
]

export function getCharacterPatchNote(
  characterCode: number,
  patch: string
): CharacterPatchNote | undefined {
  return PATCH_NOTES.find(
    (note) => note.characterCode === characterCode && note.patch === patch
  )
}
