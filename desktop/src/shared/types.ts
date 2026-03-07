export type SortBy = "averageRP" | "winRate" | "totalGames";

export interface TrioRecommendation {
  character1: number;
  character2: number;
  character3: number;
  winRate: number;
  averageRP: number;
  totalGames: number;
  averageRank: number;
}

export interface RecommendationRequest {
  character1: number;
  character2?: number;
  sortBy?: SortBy;
  limit?: number;
}

export type MatchState = "idle" | "searching" | "found" | "in_match";

export interface LogSnapshot {
  myCharacterCode: number | null;
  partyCharacterCodes: number[];
  matchState: MatchState;
  updatedAt: number;
  sourceLine?: string;
}

export interface AuthUser {
  steamId: string;
  personaName: string;
  expiresAt: number;
}

export type AuthStatus = "authenticated" | "logged_out" | "error";

export interface AuthUpdateEvent {
  status: AuthStatus;
  user?: AuthUser;
  error?: string;
}

export interface OcrSnapshot {
  nicknames: string[];
  rawText: string;
  capturedAt: number;
}

export interface ApiAuthMeResponse {
  ok: boolean;
  user?: {
    steamId: string;
    personaName: string;
  };
  expiresAt?: number;
  error?: string;
}
