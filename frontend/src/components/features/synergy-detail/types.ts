import type { OperationProfile } from "@/lib/synergyInsights";

export interface TrioWeaponResult {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
  operationProfile?: OperationProfile | null;
}

export type SortBy = "tierScore" | "averageRP" | "winRate" | "averageRank" | "totalGames";
