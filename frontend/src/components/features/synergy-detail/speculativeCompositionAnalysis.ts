import { analytics } from "@/lib/analytics";
import type { CompositionAffinityEvidence } from "@/lib/characterAffinityComposition";
import {
  buildTrioCompositionInsight,
  getCachedTrioCompositionInsight,
  getCompositionInsightCacheKey,
  type CompositionMemberInput,
} from "@/lib/synergyComposition";

export const ENABLE_SPECULATIVE_ANALYSIS = true;
export const SPECULATION_BUDGET = 1;
export const SPECULATIVE_ANALYSIS_COMPLETED_MARK = "ermeta-speculative-analysis-completed";

const SPECULATION_DELAY_MS = 100;
const IDLE_TIMEOUT_MS = 1_500;
const SPECULATION_METADATA_LIMIT = 512;

export type CompositionAnalysisMembers = readonly [
  CompositionMemberInput,
  CompositionMemberInput,
  CompositionMemberInput,
];

export type SpeculationInvalidationReason = "selection_changed" | "unmounted" | "new_generation";

interface SpeculationMetadata {
  candidateRank: number;
  durationMs: number;
}

export interface SpeculationInstrumentation {
  scheduled(args: { candidateRank: number; cacheKey: string; source: string }): void;
  completed(args: { candidateRank: number; durationMs: number }): void;
  invalidated(args: { candidateRank: number; reason: SpeculationInvalidationReason }): void;
}

interface ScheduleSpeculativeCompositionAnalysisOptions {
  members: CompositionAnalysisMembers;
  affinityEvidence?: CompositionAffinityEvidence;
  candidateRank: number;
  source: string;
  generation: string;
  isCurrent: () => boolean;
  enabled?: boolean;
  scheduleIdle?: (callback: () => void) => () => void;
  now?: () => number;
  instrumentation?: SpeculationInstrumentation;
}

interface ScheduledSpeculation {
  cacheKey: string;
  scheduled: boolean;
  cancel(reason: SpeculationInvalidationReason): void;
}

const pendingSpeculations = new Map<string, symbol>();
const completedSpeculations = new Map<string, SpeculationMetadata>();

const defaultInstrumentation: SpeculationInstrumentation = {
  scheduled: (args) => analytics.speculativeAnalysisScheduled(args),
  completed: (args) => analytics.speculativeAnalysisCompleted(args),
  invalidated: (args) => analytics.speculativeAnalysisInvalidated(args),
};

function rememberCompletedSpeculation(cacheKey: string, metadata: SpeculationMetadata) {
  completedSpeculations.delete(cacheKey);
  completedSpeculations.set(cacheKey, metadata);
  while (completedSpeculations.size > SPECULATION_METADATA_LIMIT) {
    const oldestKey = completedSpeculations.keys().next().value;
    if (oldestKey === undefined) break;
    completedSpeculations.delete(oldestKey);
  }
}

/**
 * Keeps the existing post-commit scheduling boundary: a short grace period, then browser idle.
 * The fallback still runs after the current task and never during the result render itself.
 */
export function scheduleCompositionAnalysisIdle(callback: () => void): () => void {
  let cancelled = false;
  let idleCallbackId: number | null = null;
  let fallbackTimerId: number | null = null;
  const timerId = window.setTimeout(() => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    } else {
      fallbackTimerId = window.setTimeout(callback, 0);
    }
  }, SPECULATION_DELAY_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(timerId);
    if (idleCallbackId != null) window.cancelIdleCallback(idleCallbackId);
    if (fallbackTimerId != null) window.clearTimeout(fallbackTimerId);
  };
}

export function scheduleSpeculativeCompositionAnalysis({
  members,
  affinityEvidence,
  candidateRank,
  source,
  generation,
  isCurrent,
  enabled = ENABLE_SPECULATIVE_ANALYSIS,
  scheduleIdle = scheduleCompositionAnalysisIdle,
  now = () => performance.now(),
  instrumentation = defaultInstrumentation,
}: ScheduleSpeculativeCompositionAnalysisOptions): ScheduledSpeculation {
  const cacheKey = getCompositionInsightCacheKey(members, affinityEvidence);
  const pendingKey = cacheKey;
  const noOp = { cacheKey, scheduled: false, cancel: () => {} };

  if (!enabled || candidateRank > SPECULATION_BUDGET) return noOp;
  if (getCachedTrioCompositionInsight(members, affinityEvidence)) return noOp;
  if (pendingSpeculations.has(pendingKey)) return noOp;

  const token = Symbol(generation);
  let pending = true;
  pendingSpeculations.set(pendingKey, token);
  instrumentation.scheduled({ candidateRank, cacheKey, source });

  const finishPending = () => {
    if (pendingSpeculations.get(pendingKey) === token) pendingSpeculations.delete(pendingKey);
    pending = false;
  };

  const cancelIdle = scheduleIdle(() => {
    if (!pending) return;
    if (!isCurrent()) {
      finishPending();
      instrumentation.invalidated({ candidateRank, reason: "new_generation" });
      return;
    }

    // The normal click path may have populated the shared analysis cache while this was queued.
    if (getCachedTrioCompositionInsight(members, affinityEvidence)) {
      finishPending();
      return;
    }

    const startedAt = now();
    buildTrioCompositionInsight(members, affinityEvidence, { shouldCache: isCurrent });
    const durationMs = Math.max(0, now() - startedAt);
    if (!isCurrent()) {
      finishPending();
      instrumentation.invalidated({ candidateRank, reason: "new_generation" });
      return;
    }

    finishPending();
    rememberCompletedSpeculation(cacheKey, { candidateRank, durationMs });
    performance.mark(SPECULATIVE_ANALYSIS_COMPLETED_MARK);
    instrumentation.completed({ candidateRank, durationMs });
  });

  return {
    cacheKey,
    scheduled: true,
    cancel(reason) {
      if (!pending) return;
      cancelIdle();
      finishPending();
      instrumentation.invalidated({ candidateRank, reason });
    },
  };
}

/** Metadata only; the analysis result itself always lives in the existing shared cache. */
export function takeCompletedSpeculation(cacheKey: string): SpeculationMetadata | null {
  const metadata = completedSpeculations.get(cacheKey) ?? null;
  if (metadata) completedSpeculations.delete(cacheKey);
  return metadata;
}
