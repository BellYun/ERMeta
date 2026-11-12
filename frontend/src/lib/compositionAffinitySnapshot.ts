import manifest from "@/data/composition-affinity-snapshot.json";
import {
  buildCompositionAffinityKey,
  type CompositionAffinityEvidence,
  type CompositionAffinityMemberInput,
} from "@/lib/characterAffinityComposition";
import type {
  CompositionAffinitySnapshot,
  createCompositionAffinityReader,
} from "@/lib/compositionAffinityReader";
import { fetchStaticJson } from "@/lib/staticJson";

let readerRequest: Promise<ReturnType<typeof createCompositionAffinityReader>> | undefined;
const evidenceCache = new Map<string, CompositionAffinityEvidence>();
const MAX_CACHED_COMBOS = 512;

function loadReader() {
  readerRequest ??= Promise.all([
    fetchStaticJson<CompositionAffinitySnapshot>(
      "/data/composition-affinity/" + manifest.version + ".json.gz"
    ),
    import("@/lib/compositionAffinityReader"),
  ])
    .then(([snapshot, { createCompositionAffinityReader }]) => {
      if (!snapshot) throw new Error("composition_affinity_snapshot_missing");
      return createCompositionAffinityReader(snapshot);
    })
    .catch((error: unknown) => {
      readerRequest = undefined;
      throw error;
    });
  return readerRequest;
}

export async function loadCompositionAffinity(
  combos: CompositionAffinityMemberInput[][],
  locale: string,
  signal: AbortSignal
): Promise<Record<string, CompositionAffinityEvidence>> {
  const read = await loadReader();
  signal.throwIfAborted();

  const requestedLocale = locale === "en" || locale === "ja" ? locale : "ko";
  const results: Record<string, CompositionAffinityEvidence> = {};
  for (const members of combos) {
    const key = buildCompositionAffinityKey(members);
    const cacheKey = requestedLocale + ":" + key;
    const cached = evidenceCache.get(cacheKey);
    if (cached) evidenceCache.delete(cacheKey);
    const evidence = cached ?? read(members, requestedLocale);
    evidenceCache.set(cacheKey, evidence);
    results[key] = evidence;

    if (evidenceCache.size > MAX_CACHED_COMBOS) {
      const oldest = evidenceCache.keys().next().value;
      if (oldest != null) evidenceCache.delete(oldest);
    }
  }
  return results;
}
