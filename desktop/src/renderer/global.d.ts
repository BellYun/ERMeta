import {
  AuthUpdateEvent,
  LogSnapshot,
  RecommendationRequest,
  TrioRecommendation,
} from "../shared/types";

declare global {
  interface Window {
    ermeta: {
      auth: {
        login: () => Promise<{ ok: boolean }>;
        logout: () => Promise<{ ok: boolean }>;
        me: () => Promise<{
          steamId: string;
          personaName: string;
          expiresAt: number;
        } | null>;
        onUpdate: (listener: (event: AuthUpdateEvent) => void) => () => void;
      };
      logs: {
        start: () => Promise<{ ok: boolean; path: string; running: boolean }>;
        stop: () => Promise<{ ok: boolean }>;
        onSnapshot: (listener: (snapshot: LogSnapshot) => void) => () => void;
        onError: (listener: (message: string) => void) => () => void;
      };
      recommendation: {
        get: (input: RecommendationRequest) => Promise<TrioRecommendation[]>;
      };
    };
  }
}

export {};
