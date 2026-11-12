import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { seasonSnapshot, type SnapshotStatRow } from "@/lib/seasonSnapshot";

// Next.js 파일 추적이 public 전체를 포함하지 않도록 파일 경로를 용도별로 지정한다.
export async function readOgSeasonSnapshot<T>(): Promise<T> {
  const buffer = await readFile(
    join(process.cwd(), "public/data/season-stats", seasonSnapshot.version, "og.json.gz")
  );
  return JSON.parse(gunzipSync(buffer).toString("utf8"));
}

const patchRequests = new Map<string, Promise<SnapshotStatRow[]>>();

export function readSnapshotStatRows(patch: string): Promise<SnapshotStatRow[]> {
  if (!seasonSnapshot.statsPatches.includes(patch)) return Promise.resolve([]);
  const cached = patchRequests.get(patch);
  if (cached) return cached;

  const request = readFile(
    join(
      process.cwd(),
      "public/data/season-stats",
      seasonSnapshot.version,
      "stats",
      patch + ".json"
    ),
    "utf8"
  )
    .then((source): SnapshotStatRow[] => JSON.parse(source))
    .catch((error) => {
      patchRequests.delete(patch);
      throw error;
    });
  patchRequests.set(patch, request);
  return request;
}
