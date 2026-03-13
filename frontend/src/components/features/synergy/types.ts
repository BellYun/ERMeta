export interface TrioResult {
  character1: number
  character2: number
  character3: number
  winRate: number
  averageRP: number
  totalGames: number
  averageRank: number
}

export type SortBy = "averageRP" | "winRate" | "totalGames" | "recommended"
