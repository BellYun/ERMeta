export const PROFILE_LAYER_AXES = {
  function: ["engage", "frontline", "chase", "disrupt", "finish", "zone", "peel"],
  damage: ["burst", "sustainedDps"],
  combat: ["mobility", "crowdControl", "selfSustain", "rangePressure"],
} as const;

export type CharacterProfileLayer = keyof typeof PROFILE_LAYER_AXES;
export type CharacterProfileAxis = (typeof PROFILE_LAYER_AXES)[CharacterProfileLayer][number];
export type CharacterProfileVector = Record<CharacterProfileAxis, number>;

export interface CharacterProfileVectorEvidence {
  source: "officialSkillText" | "roleTypeFallback";
  skillCount: number;
}

export const PROFILE_AXES = Object.values(PROFILE_LAYER_AXES).flat() as CharacterProfileAxis[];

export function getCharacterProfileLayer(axis: CharacterProfileAxis): CharacterProfileLayer {
  return (
    Object.entries(PROFILE_LAYER_AXES) as Array<
      [CharacterProfileLayer, readonly CharacterProfileAxis[]]
    >
  ).find(([, axes]) => axes.includes(axis))?.[0] as CharacterProfileLayer;
}
