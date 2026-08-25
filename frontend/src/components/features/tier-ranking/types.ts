import type { CharacterPatchNote } from "@/data/patch-notes";
import type { CharacterRole } from "@/lib/characterMap";
import type { Tier } from "@/lib/design-tokens";

export interface PrevStats {
  pickRate: number;
  winRate: number;
  averageRP: number;
}

export interface DisplayRow {
  rank: number;
  rankChange: number | "new" | null;
  code: number;
  roles: CharacterRole[];
  weaponCode: number;
  hasWeaponIcon: boolean;
  name: string;
  weaponName: string;
  imageUrl: string;
  tier: Tier;
  pickRate: number;
  winRate: number;
  averageRP: number;
  prev: PrevStats | null;
  patchNote: CharacterPatchNote | null;
}
