export interface ComboEntry {
  multiset: string;
  delta: number;
  games: number;
  trend?: ComboTrend;
}

export interface ComboTrendPattern {
  games: number;
  avgRp: number;
  adjustedLift: number;
  confidence: "high" | "medium" | "low";
  characterMinGames: number;
  partnerGroups: Array<{
    role: string;
    fitRole: string;
    characters: string[];
  }>;
  actualCombinations: Array<{
    characters: string[];
    games: number;
    avgRp: number;
    adjustedLift: number;
  }>;
}

export interface ComboTrend {
  focalLabel: string;
  compositionLabel: string;
  minGames: number;
  patterns: ComboTrendPattern[];
}

export interface LabCharacter {
  characterCode: number;
  characterName: string;
  weapon: number | null;
  weaponName: string;
  totalGames: number;
  ownMeanRP: number;
  groupId: number | null;
  classification?: {
    method: string;
    archetype: string;
    roles: string[];
    traits: string[];
    partnerRoles: string[];
    fitRole: string;
    fitReason: string;
    metricRole: string;
    metricGroupKey?: string;
    metricSummary: string;
    metricCohesion: number | null;
    metricClusterSize: number;
    partnerDelta: number | null;
    partnerGames: number;
    partnerGameShare: number;
    confidence: "high" | "medium" | "low";
  };
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
  internalGroupK?: number;
  minGames: number;
  cumulative: boolean;
  generatedFrom?: string;
  scoreMode?: "observed-rp" | "tier-entry-cost-adjusted" | "sample-confidence";
  entryCosts?: Partial<Record<"DIAMOND" | "METEORITE" | "MITHRIL", number>>;
  seasons?: number[];
  classificationMethod?: string;
  primaryRoleOnly?: boolean;
  generatedAt: string;
  groups: LabGroup[];
  characters: LabCharacter[];
}
