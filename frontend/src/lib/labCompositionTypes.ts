export interface LabPartnerType {
  role: string;
  fitRole: string;
}

export interface LabSeasonAffinitySignal {
  season: number;
  games: number;
  rawResidual: number | null;
  adjustedResidual: number | null;
  direction: "positive" | "negative" | "neutral" | "unobserved";
  reliable: boolean;
}

export interface LabCharacterRecommendation {
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  games: number;
  fitGames: number;
  fitResidual: number | null;
  adjustedFit: number | null;
  fitReliable: boolean;
  trendOwnSimilarity?: number | null;
  trendOwnSharedPairs?: number;
  trendRefinedOwnSimilarity?: number | null;
  trendRefinedOwnSharedPairs?: number;
  trendAlternativeSimilarity?: number | null;
  trendAlternativeMinimum?: number | null;
  trendAlternativeSharedPairs?: number;
  trendAssignmentMargin?: number | null;
  trendAmbiguous?: boolean;
  trendRefinedAlternativeSimilarity?: number | null;
  trendRefinedAlternativeMinimum?: number | null;
  trendRefinedAlternativeSharedPairs?: number;
  trendRefinedAssignmentMargin?: number | null;
  trendRefinedAmbiguous?: boolean;
  trendRefinedAlternativeCharacters?: Array<{
    characterCode: number;
    characterName: string;
    weapon: number;
    weaponName: string;
  }>;
  trendAlternativeCharacters?: Array<{
    characterCode: number;
    characterName: string;
    weapon: number;
    weaponName: string;
  }>;
  bestPartnerTypes?: LabPartnerType[];
}

export interface LabConditionalType {
  role: string;
  fitRole: string;
  baseFitRole: string;
  conditionalSplit: boolean;
  roleIsolated?: boolean;
  roleIsolationReason?: string;
  classificationBasis?:
    | "full-composition-trend-profile"
    | "conditional-sign-profile"
    | "first-order-composition-affinity-profile";
  trendCohesion?: number | null;
  trendMinimum?: number | null;
  trendSharedPairs?: number;
  trendRefinedCohesion?: number | null;
  trendRefinedMinimum?: number | null;
  trendRefinedSharedPairs?: number;
  trendReferenceCohesion?: number | null;
  trendReferenceMinimum?: number | null;
  trendReferenceSharedPairs?: number;
  trendContextMinGames?: number;
  trendContexts?: Array<{
    partnerTypes: LabPartnerType[];
    games: number;
    rawResidual: number;
    adjustedResidual: number;
    sampleScore: number;
    direction: "positive" | "negative" | "neutral";
    groupGames?: number;
    groupRawResidual?: number | null;
    groupAdjustedResidual?: number | null;
    positiveCharacterCount?: number;
    negativeCharacterCount?: number;
    tendencyAgreement?: number | null;
    characters?: Array<{
      characterCode: number;
      characterName: string;
      weapon: number;
      weaponName: string;
      games: number;
      rawResidual: number;
      adjustedResidual: number;
      sampleScore: number;
      direction: "positive" | "negative" | "neutral";
      seasonSignals?: LabSeasonAffinitySignal[];
      seasonConsistency?: "both-positive" | "both-negative" | "mixed" | "insufficient";
    }>;
  }>;
  exactPartnerContexts?: Array<{
    partnerTypes: LabPartnerType[];
    games: number;
    rawResidual: number;
    adjustedResidual: number;
    sampleScore: number;
    direction: "positive" | "negative" | "neutral";
    groupGames: number;
    groupRawResidual: number | null;
    groupAdjustedResidual: number | null;
    positiveCharacterCount: number;
    negativeCharacterCount: number;
    tendencyAgreement: number | null;
    characters: Array<{
      characterCode: number;
      characterName: string;
      weapon: number;
      weaponName: string;
      games: number;
      rawResidual: number;
      adjustedResidual: number;
      sampleScore: number;
      direction: "positive" | "negative" | "neutral";
      seasonSignals?: LabSeasonAffinitySignal[];
      seasonConsistency?: "both-positive" | "both-negative" | "mixed" | "insufficient";
    }>;
  }>;
  affinityGroups?: Array<{
    partnerRoles: string[];
    anchorType: LabPartnerType;
    games: number;
    rawResidual: number;
    adjustedResidual: number;
    groupGames: number;
    groupRawResidual: number | null;
    groupAdjustedResidual: number | null;
    positiveCharacterCount: number;
    negativeCharacterCount: number;
    tendencyAgreement: number | null;
    characters: Array<{
      characterCode: number;
      characterName: string;
      weapon: number;
      weaponName: string;
      games: number;
      rawResidual: number;
      adjustedResidual: number;
      sampleScore: number;
      direction: "positive" | "negative" | "neutral";
      seasonSignals?: LabSeasonAffinitySignal[];
      seasonConsistency?: "both-positive" | "both-negative" | "mixed" | "insufficient";
    }>;
    secondaryContexts: Array<{
      partnerTypes: LabPartnerType[];
      games: number;
      rawResidual: number;
      adjustedResidual: number;
      sampleScore: number;
      direction: "positive" | "negative" | "neutral";
    }>;
  }>;
  bestPartnerTypes: LabPartnerType[];
  bestPartnerGames: number;
  bestPartnerResidual: number | null;
  characters: LabCharacterRecommendation[];
}

export interface LabTypeCombination {
  combinationKey?: string;
  types: LabPartnerType[];
  games: number;
  share: number;
  avgRp: number;
  rawLift: number;
  adjustedLift: number;
  sampleScore?: number;
  seasonSignals?: Array<{ season: number; games: number; rawLift: number | null }>;
  seasonConsistency?: "both-positive" | "both-negative" | "mixed" | "insufficient";
  confidence: string;
  characterMinGames: number;
  characterCombinations?: LabActualCharacterCombination[];
}

export type LabValidationDirection = "positive" | "negative" | "neutral";
export type LabValidationEvidence = "insufficient" | "reference" | "checked" | "strong";

export interface LabActualCharacterMember extends LabPartnerType {
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
}

export interface LabActualCharacterCombination {
  members: LabActualCharacterMember[];
  games: number;
  avgRp: number;
  rawLift: number;
  adjustedLift: number;
  sampleScore?: number;
  direction?: LabValidationDirection;
  aligned?: boolean | null;
  evidence?: LabValidationEvidence;
  confidence?: string;
}

export interface LabValidationMember {
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  games: number;
  rawLift: number | null;
  adjustedLift: number | null;
  direction: LabValidationDirection | "unobserved";
  aligned: boolean | null;
  evidence: LabValidationEvidence;
}

export interface LabValidationGroupCheck extends LabPartnerType {
  slots: number;
  expectedMembers: number;
  observedMembers: number;
  checkedMembers: number;
  strongMembers: number;
  alignedMembers: number;
  exceptionMembers: number;
  directionAgreement: number | null;
  weightedDirectionAgreement: number | null;
  status: "consistent" | "mixed" | "insufficient";
  members: LabValidationMember[];
}

export interface LabCombinationValidation {
  combinationKey: string;
  combinationDirection: LabValidationDirection;
  referenceGames: number;
  checkGames: number;
  strongGames: number;
  exactCombinationCount: number;
  actualCombinations: LabActualCharacterCombination[];
  groupChecks: LabValidationGroupCheck[];
}

export interface LabRecommendationOption {
  partners: LabPartnerType[];
  games: number;
  conditionalShare: number;
  rawLift: number;
  adjustedLift: number;
  confidence: string;
  combinationKey?: string;
  characterMinGames: number;
  characterCombinations: LabActualCharacterCombination[];
}

export interface LabTypeRecommendation {
  focal: LabPartnerType;
  totalGames: number;
  options: LabRecommendationOption[];
}

export interface LabRoleComposition {
  roleComposition: string;
  totalGames: number;
  minGames: number;
  observedTypeCombinations: number;
  reliableTypeCombinations: number;
  conditionalSplitBaseTypes: number;
  topCombinations: LabTypeCombination[];
  sampleRankedCombinations?: LabTypeCombination[];
  recommendations?: LabTypeRecommendation[];
  validations?: LabCombinationValidation[];
  typeCatalog: LabConditionalType[];
}

export interface LabCompositionData {
  method: string;
  displayedSimilarityMode?: "refined-second-order-only" | "fixed-first-order-context-lift";
  displayedSimilarityMinGames?: number;
  compositionAffinityMinLift?: number;
  secondOrderScope?: "global";
  combinationGroupingBasis?:
    | "fixed-first-order-partner-types"
    | "fixed-first-order-composition-contexts";
  globalSecondOrderIterations?: number;
  globalSecondOrderRelocationIterations?: number;
  globalSecondOrderConverged?: boolean;
  globalSecondOrderCycleDetected?: boolean;
  globalSecondOrderFinalValidationIterations?: number;
  globalSecondOrderFinalValidationConverged?: boolean;
  globalSecondOrderFinalValidationSplitCount?: number;
  globalSecondOrderMergeAverage?: number;
  globalSecondOrderMergeMinimum?: number;
  globalSecondOrderRefinedContextWeight?: number;
  globalSecondOrderAmbiguousAverage?: number;
  globalSecondOrderAmbiguousMargin?: number;
  globalSecondOrderRoleValidation?: Array<{
    role: string;
    types: number;
    iterations: number;
    converged: boolean;
  }>;
  globalSecondOrderTypeCatalog?: LabConditionalType[];
  seasons: number[];
  minGamesFloor: number;
  roleCompositionCount: number;
  reliableTypeCombinationCount: number;
  validationReferenceGames?: number;
  validationCheckGames?: number;
  validationStrongGames?: number;
  roleCompositions: LabRoleComposition[];
}

export interface LabCompositionAffinitySignature {
  key: string;
  roleComposition: string;
  partnerTypes: LabPartnerType[];
  positiveMembers: number;
  memberCount: number;
  coverage: number;
  games: number;
  adjustedResidual: number;
  seasonSignals: Array<{
    season: number;
    games: number;
    positiveMembers: number;
    observedMembers: number;
    positiveRate: number | null;
  }>;
  seasonConsistency: "both-positive" | "mixed" | "insufficient";
}

export interface LabCompositionAffinityMembership {
  profileKey: string;
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  role: string;
  firstOrderType: string;
  membership: "primary" | "auxiliary";
  similarity: number | null;
  minimumSimilarity: number | null;
  sharedContexts: number;
}

export interface LabCompositionAffinityGroup {
  id: string;
  role: string;
  label: string;
  kind: "core" | "independent";
  threshold: number;
  cohesion: number | null;
  minimumSimilarity: number | null;
  primaryMembers: LabCompositionAffinityMembership[];
  auxiliaryMembers: LabCompositionAffinityMembership[];
  signatureContexts: LabCompositionAffinitySignature[];
  seasonConsistency: "both-positive" | "mixed" | "insufficient";
}

export interface LabCompositionAffinityGroupData {
  method: string;
  contextUnit: "exact-two-partner-first-order-types";
  contextMinGames: number;
  sourceMetric: "entry-sample-confidence";
  seasons: number[];
  generatedAt: string;
  similarity: {
    directionWeight: number;
    magnitudeWeight: number;
    overlapWeight: number;
    rolePercentile: number;
    mergeAverageMargin: number;
    relocationMargin: number;
    maxRefinementIterations: number;
    auxiliaryRatio: number;
  };
  roles: Array<{
    role: string;
    profiles: number;
    observedThreshold: number | null;
    threshold: number;
    minimumSharedContexts: number;
    coreGroups: number;
    independentProfiles: number;
    initialGroups: number;
    iterations: number;
    converged: boolean;
    cycleDetected: boolean;
    isolatedProfiles: number;
    relocatedProfiles: number;
  }>;
  groups: LabCompositionAffinityGroup[];
}

export interface LabConsensusCharacter {
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  totalGames: number;
  compositionAppearances: number;
  groupAgreement: number | null;
  trendOwnSimilarity?: number | null;
  trendOwnSharedPairs?: number;
  trendAlternativeSimilarity?: number | null;
  trendAlternativeMinimum?: number | null;
  trendAlternativeSharedPairs?: number;
  trendAssignmentMargin?: number | null;
  trendAmbiguous?: boolean;
  trendAlternativeCharacters?: Array<{
    characterCode: number;
    characterName: string;
    weapon: number;
    weaponName: string;
  }>;
}

export interface LabConsensusContext {
  label: string;
  occurrences: number;
  games: number;
  avgResidual: number;
}

export interface LabConsensusType {
  id: string;
  label: string;
  cohesion: number | null;
  separation: number | null;
  roleIsolated?: boolean;
  roleIsolationReason?: string;
  classificationBasis?:
    | "full-composition-trend-profile"
    | "conditional-sign-profile"
    | "first-order-composition-affinity-profile";
  trendSharedPairs?: number;
  confidence: string;
  contexts: LabConsensusContext[];
  characters: LabConsensusCharacter[];
}

export interface LabConsensusGroup {
  role: string;
  baseFitRole: string;
  relevantCompositions: number;
  reliablePairCount: number;
  conflictPairCount: number;
  split: boolean;
  types: LabConsensusType[];
}

export interface LabConsensusData {
  method: string;
  seasons: number[];
  roleCompositionCount: number;
  minSharedCompositions: number;
  summary: {
    baseTypeCount: number;
    splitBaseTypes: number;
    consensusTypeCount: number;
    characterProfiles: number;
  };
  groups: LabConsensusGroup[];
}
