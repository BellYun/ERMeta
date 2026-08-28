import { getCharacterImageUrl } from "@/lib/characterMap";
import { getVersionedStaticGameAssetUrl } from "@/lib/staticGameAssets";
import characterSkillIconFiles from "../../const/characterSkillIconFiles.json";

export type CharacterSkillIconSlot = "T" | "Q" | "W" | "E" | "R";

type CharacterSkillIconFileSet = Record<CharacterSkillIconSlot, string>;

const CHARACTER_SKILL_ICON_FILES = characterSkillIconFiles as Record<
  string,
  CharacterSkillIconFileSet
>;

const ALEX_MELEE_ICON_FILES: Partial<CharacterSkillIconFileSet> = {
  Q: "05. Alex_Melee Q.png",
  W: "06. Alex_Melee W.png",
  E: "07. Alex_Melee E.png",
};

function getCharacterAssetFolderUrl(characterCode: number): string | null {
  const portraitUrl = getCharacterImageUrl(characterCode);
  if (portraitUrl === "/characters/placeholder.png") return null;

  const defaultFolderIndex = portraitUrl.indexOf("/02.");
  return defaultFolderIndex >= 0
    ? portraitUrl.slice(0, defaultFolderIndex)
    : portraitUrl.slice(0, portraitUrl.lastIndexOf("/"));
}

function getSkillIconFileName(
  characterCode: number,
  slot: CharacterSkillIconSlot,
  bestWeapon?: number | null
): string | null {
  if (characterCode === 27 && (bestWeapon === 2 || bestWeapon === 16)) {
    return ALEX_MELEE_ICON_FILES[slot] ?? CHARACTER_SKILL_ICON_FILES[characterCode]?.[slot] ?? null;
  }
  return CHARACTER_SKILL_ICON_FILES[characterCode]?.[slot] ?? null;
}

export function getCharacterSkillIconUrl(
  characterCode: number,
  slot: CharacterSkillIconSlot,
  bestWeapon?: number | null
): string | null {
  const folderUrl = getCharacterAssetFolderUrl(characterCode);
  const fileName = getSkillIconFileName(characterCode, slot, bestWeapon);
  if (!folderUrl || !fileName) return null;

  const pathname = `${folderUrl}/03.%20skill%20Icon/${encodeURIComponent(fileName)}`;
  return getVersionedStaticGameAssetUrl(pathname);
}
