import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { seasonSnapshot, seasonSnapshotPath, type SnapshotStatRow } from "@/lib/seasonSnapshot";

export async function readSeasonSnapshot<T>(file: string): Promise<T> {
  const buffer = await readFile(join(process.cwd(), "public", seasonSnapshotPath(file)));
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(buffer) : buffer).toString("utf8"));
}

const patchRequests = new Map<string, Promise<SnapshotStatRow[]>>();

export function readSnapshotStatRows(patch: string): Promise<SnapshotStatRow[]> {
  if (!seasonSnapshot.statsPatches.includes(patch)) return Promise.resolve([]);
  const cached = patchRequests.get(patch);
  if (cached) return cached;

  const request = readSeasonSnapshot<SnapshotStatRow[]>("stats/" + patch + ".json").catch(
    (error) => {
      patchRequests.delete(patch);
      throw error;
    }
  );
  patchRequests.set(patch, request);
  return request;
}
