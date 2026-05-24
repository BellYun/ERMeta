export interface ComboEntry {
  multiset: string;
  delta: number;
  games: number;
}

export interface LabCharacter {
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  totalGames: number;
  ownMeanRP: number;
  groupId: number | null;
  strong: ComboEntry[];
  weak: ComboEntry[];
}

export interface LabGroup {
  id: number;
  label: string;
  curated: boolean;
  topPartnerRoles?: string[];
  characterKeys: string[];
}

export interface LabData {
  role: string;
  roleSlug: string;
  groupK: number;
  minGames: number;
  cumulative: boolean;
  generatedFrom?: string;
  generatedAt: string;
  groups: LabGroup[];
  characters: LabCharacter[];
}
