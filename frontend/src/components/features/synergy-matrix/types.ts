export type SynergyMatrixMetric = "rpLift" | "winRateLift" | "avgRP" | "winRate" | "games";

export type SynergyMatrixSort = "code" | "name" | "outgoingRpLift" | "incomingRpLift" | "games";

export interface MatrixCharacter {
  code: number;
  name: string;
  games: number;
  weaponCount: number;
  winRate: number;
  avgRP: number;
  avgRank: number;
}

export interface MatrixCell {
  rowCode: number;
  rowName: string;
  colCode: number;
  colName: string;
  games: number;
  winRate: number;
  avgRP: number;
  avgRank: number;
  rpLift: number;
  winRateLift: number;
}

export interface CharacterMatrixPayload {
  schemaVersion: number;
  builtAt: string;
  generatedAt: string;
  patchScope: string;
  tierScope: string;
  minSampleGames: number;
  characterCount: number;
  cellCount: number;
  characters: MatrixCharacter[];
  cells: MatrixCell[];
}

export type CharacterMatrixModel = Omit<CharacterMatrixPayload, "cells">;

/**
 * Dense, row-major rendering model sent from the Worker with transferable buffers.
 * A zero game count represents a missing cell.
 */
export interface MatrixGrid {
  size: number;
  games: Uint32Array;
  winRate: Float32Array;
  avgRP: Float32Array;
  avgRank: Float32Array;
  rpLift: Float32Array;
  winRateLift: Float32Array;
}

export interface MatrixWorkerTiming {
  fetchMs: number;
  parseMs: number;
  gridBuildMs: number;
}

export interface MatrixViewSettings {
  metric: SynergyMatrixMetric;
  minGames: number;
  sort: SynergyMatrixSort;
}

export interface MatrixViewSummary {
  order: number[];
  topPositive: MatrixCell[];
  topNegative: MatrixCell[];
  visibleCellCount: number;
  maxGames: number;
  maxAbs: number;
}

export interface MatrixSelection {
  rowCode: number;
  colCode: number;
}

export interface MatrixCopy {
  title: string;
  metadataTitle: string;
  description: string;
  kicker: string;
  subtitle: string;
  body: string;
  loading: string;
  loadFailed: string;
  controls: {
    metric: string;
    minGames: string;
    sort: string;
    focus: string;
  };
  metrics: Record<SynergyMatrixMetric, string>;
  sortOptions: Record<SynergyMatrixSort, string>;
  selectedPair: string;
  hoverHelp: string;
  noCell: string;
  topPositive: string;
  topNegative: string;
  games: string;
  winRate: string;
  averageRp: string;
  averageRank: string;
  rpLift: string;
  winRateLift: string;
  sample: string;
  openTeamData: string;
  copyLink: string;
  copied: string;
  accessibilityTitle: string;
}
