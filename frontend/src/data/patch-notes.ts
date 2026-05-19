import { PATCH_NOTES as PATCH_10_1 } from "./10.1";
import type { ChangeType, CharacterPatchNote } from "./10.1";
import { PATCH_NOTES as PATCH_10_2 } from "./10.2";
import { PATCH_NOTES as PATCH_10_3 } from "./10.3";
import { PATCH_NOTES as PATCH_10_4 } from "./10.4";
import { PATCH_NOTES as PATCH_10_5 } from "./10.5";
import { PATCH_NOTES as PATCH_10_6 } from "./10.6";
import { PATCH_NOTES as PATCH_10_7 } from "./10.7";
import { PATCH_NOTES as PATCH_11_0 } from "./11.0";
import { PATCH_NOTES as PATCH_11_1 } from "./11.1";
import { PATCH_NOTES as PATCH_11_2 } from "./11.2";

export type { ChangeType, PatchChange, CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  ...PATCH_10_1,
  ...PATCH_10_2,
  ...PATCH_10_3,
  ...PATCH_10_4,
  ...PATCH_10_5,
  ...PATCH_10_6,
  ...PATCH_10_7,
  ...PATCH_11_0,
  ...PATCH_11_1,
  ...PATCH_11_2,
];

export function getCharacterPatchNote(
  characterCode: number,
  patch: string
): CharacterPatchNote | undefined {
  return PATCH_NOTES.find((note) => note.characterCode === characterCode && note.patch === patch);
}

// 최신 패치 우선 정렬 ("10.7" > "10.6" > ... > "10.1"). semver-major.minor 형태 가정.
function compareVersionDesc(a: string, b: string): number {
  const [a1, a2] = a.split(".").map(Number);
  const [b1, b2] = b.split(".").map(Number);
  if (a1 !== b1) return b1 - a1;
  return b2 - a2;
}

export function getAllPatchVersions(): string[] {
  const set = new Set(PATCH_NOTES.map((n) => n.patch));
  return [...set].sort(compareVersionDesc);
}

export interface PatchSummary {
  patch: string;
  totalChanges: number;
  buffs: number;
  nerfs: number;
  reworks: number;
  characterCount: number;
}

export function getPatchSummary(patch: string): PatchSummary {
  const notes = PATCH_NOTES.filter((n) => n.patch === patch);
  const tally: Record<ChangeType, number> = { buff: 0, nerf: 0, rework: 0 };
  let totalChanges = 0;
  for (const note of notes) {
    for (const change of note.changes) {
      tally[change.changeType] += 1;
      totalChanges += 1;
    }
  }
  return {
    patch,
    totalChanges,
    buffs: tally.buff,
    nerfs: tally.nerf,
    reworks: tally.rework,
    characterCount: notes.length,
  };
}

export function getNotesByPatch(patch: string): CharacterPatchNote[] {
  return PATCH_NOTES.filter((n) => n.patch === patch).sort(
    (a, b) => a.characterCode - b.characterCode
  );
}
