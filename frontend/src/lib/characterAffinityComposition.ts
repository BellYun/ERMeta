export interface CompositionAffinityMemberInput {
  characterCode: number;
  weapon: number;
}

export interface CompositionAffinityTrendEvidence {
  roleComposition: string;
  games: number;
  adjustedResidual: number;
}

export interface CompositionAffinityMemberEvidence extends CompositionAffinityMemberInput {
  characterName: string;
  weaponName: string;
  classification: {
    role: string;
    groupName: string;
    subtype: string;
    firstOrderType: string;
  } | null;
  trend: CompositionAffinityTrendEvidence | null;
}

export interface GoodCompositionPrototypeMember {
  role: string;
  type: string;
}

export interface GoodCompositionPrototypeMemberMatch extends GoodCompositionPrototypeMember {
  characterCode: number;
  weapon: number;
  sourceType: string;
  similarity: number;
}

export interface GoodCompositionPrototypeEvidence {
  match: "exact" | "nearest";
  key: string;
  roleComposition: string;
  members: GoodCompositionPrototypeMember[];
  memberMatches: GoodCompositionPrototypeMemberMatch[];
  similarity: number;
  minimumSimilarity: number;
  observations: number;
  supportingProfiles: number;
  reliableObservations: number;
  reliableRate: number;
  contextGames: number;
  adjustedResidual: number;
}

export interface CompositionAffinityEvidence {
  key: string;
  classifiedMembers: number;
  matchedMembers: number;
  members: CompositionAffinityMemberEvidence[];
  prototype: GoodCompositionPrototypeEvidence | null;
}

export interface CompositionAffinityBatchResponse {
  snapshotId: string;
  results: Record<string, CompositionAffinityEvidence>;
}

export function buildCompositionAffinityKey(members: CompositionAffinityMemberInput[]) {
  return [...members]
    .sort((left, right) => left.characterCode - right.characterCode || left.weapon - right.weapon)
    .map((member) => `${member.characterCode}:${member.weapon}`)
    .join("|");
}
