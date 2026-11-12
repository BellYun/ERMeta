import manifest from "@/data/season-stats-snapshot.json";
import { fetchStaticJson } from "@/lib/staticJson";

export interface SnapshotStatRow {
  characterNum: number;
  bestWeapon: number | null;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
  tier: string;
  patchVersion: string;
}

export const seasonSnapshot = manifest;

export function seasonSnapshotPath(file: string): string {
  return "/data/season-stats/" + manifest.version + "/" + file;
}

export async function fetchSeasonSnapshot<T>(
  file: string,
  signal?: AbortSignal
): Promise<T | null> {
  return fetchStaticJson<T>(seasonSnapshotPath(file), signal);
}

const patchRequests = new Map<string, Promise<SnapshotStatRow[]>>();

export function fetchSnapshotStatRows(patch: string): Promise<SnapshotStatRow[]> {
  if (!manifest.statsPatches.includes(patch)) return Promise.resolve([]);
  const cached = patchRequests.get(patch);
  if (cached) return cached;

  const request = fetchSeasonSnapshot<SnapshotStatRow[]>("stats/" + patch + ".json")
    .then((rows) => {
      if (!rows) throw new Error("statistics_snapshot_missing_patch");
      return rows;
    })
    .catch((error) => {
      patchRequests.delete(patch);
      throw error;
    });
  patchRequests.set(patch, request);
  return request;
}
