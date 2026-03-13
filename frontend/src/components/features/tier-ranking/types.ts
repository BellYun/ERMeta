import type { CharacterRole } from "@/lib/characterMap"
import type { Tier } from "@/lib/design-tokens"
import type { CharacterPatchNote } from "@/data/patch-notes"

export interface PrevStats {
  pickRate: number
  winRate: number
  averageRP: number
}

export interface DisplayRow {
  rank: number
  code: number
  roles: CharacterRole[]
  weaponCode: number
  name: string
  weaponName: string
  imageUrl: string
  tier: Tier
  pickRate: number
  winRate: number
  averageRP: number
  prev: PrevStats | null
  patchNote: CharacterPatchNote | null
}
