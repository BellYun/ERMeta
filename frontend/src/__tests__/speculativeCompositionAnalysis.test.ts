import { describe, expect, it, vi } from "vitest";
import {
  scheduleSpeculativeCompositionAnalysis,
  takeCompletedSpeculation,
  type SpeculationInstrumentation,
} from "@/components/features/synergy-detail/speculativeCompositionAnalysis";
import {
  buildTrioCompositionInsight,
  getCachedTrioCompositionInsight,
  getCompositionInsightCacheKey,
  type CompositionMemberInput,
} from "@/lib/synergyComposition";

type Members = readonly [CompositionMemberInput, CompositionMemberInput, CompositionMemberInput];

function members(seed: number): Members {
  return [
    { character: seed, weapon: seed + 1 },
    { character: seed + 100, weapon: seed + 2 },
    { character: seed + 200, weapon: seed + 3 },
  ];
}

function createIdleHarness() {
  let callback: (() => void) | null = null;
  let cancelled = false;
  return {
    scheduleIdle: vi.fn((next: () => void) => {
      callback = next;
      return () => {
        cancelled = true;
      };
    }),
    run() {
      if (!cancelled) (callback as (() => void) | null)?.();
    },
  };
}

function createInstrumentation() {
  return {
    scheduled: vi.fn(),
    completed: vi.fn(),
    invalidated: vi.fn(),
  } satisfies SpeculationInstrumentation;
}

describe("scheduleSpeculativeCompositionAnalysis", () => {
  it("Top-1 계산을 기존 cache에 저장해 normal path가 같은 객체를 재사용한다", () => {
    const input = members(1_001);
    const idle = createIdleHarness();
    const instrumentation = createInstrumentation();
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12.5);

    const task = scheduleSpeculativeCompositionAnalysis({
      members: input,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-1",
      isCurrent: () => true,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
      now,
    });

    expect(task.scheduled).toBe(true);
    expect(task.cacheKey).toBe(getCompositionInsightCacheKey(input));
    expect(getCachedTrioCompositionInsight(input)).toBeNull();
    idle.run();

    const speculativeResult = getCachedTrioCompositionInsight(input);
    expect(speculativeResult).not.toBeNull();
    expect(buildTrioCompositionInsight(input)).toBe(speculativeResult);
    expect(instrumentation.completed).toHaveBeenCalledWith({
      candidateRank: 1,
      durationMs: 2.5,
    });
    expect(takeCompletedSpeculation(task.cacheKey)).toEqual({
      candidateRank: 1,
      durationMs: 2.5,
    });
  });

  it("다른 후보 cache miss는 기존 on-demand 계산 경로로 정상 처리된다", () => {
    const topOne = members(2_001);
    const otherCandidate = members(3_001);
    const idle = createIdleHarness();

    scheduleSpeculativeCompositionAnalysis({
      members: topOne,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-2",
      isCurrent: () => true,
      scheduleIdle: idle.scheduleIdle,
      instrumentation: createInstrumentation(),
    });
    idle.run();

    expect(getCachedTrioCompositionInsight(otherCandidate)).toBeNull();
    const onDemandResult = buildTrioCompositionInsight(otherCandidate);
    expect(getCachedTrioCompositionInsight(otherCandidate)).toBe(onDemandResult);
    expect(takeCompletedSpeculation(getCompositionInsightCacheKey(otherCandidate))).toBeNull();
  });

  it("idle 실행 전 generation이 바뀌면 stale 결과를 cache에 저장하지 않는다", () => {
    const input = members(4_001);
    const idle = createIdleHarness();
    const instrumentation = createInstrumentation();
    let current = true;

    scheduleSpeculativeCompositionAnalysis({
      members: input,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-3",
      isCurrent: () => current,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
    });
    current = false;
    idle.run();

    expect(getCachedTrioCompositionInsight(input)).toBeNull();
    expect(instrumentation.invalidated).toHaveBeenCalledWith({
      candidateRank: 1,
      reason: "new_generation",
    });
  });

  it("계산 직후 generation 검증이 실패해도 stale 결과를 cache에 commit하지 않는다", () => {
    const input = members(4_501);
    const idle = createIdleHarness();
    const instrumentation = createInstrumentation();
    const isCurrent = vi.fn<() => boolean>().mockReturnValueOnce(true).mockReturnValue(false);

    scheduleSpeculativeCompositionAnalysis({
      members: input,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-3b",
      isCurrent,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
    });
    idle.run();

    expect(getCachedTrioCompositionInsight(input)).toBeNull();
    expect(instrumentation.invalidated).toHaveBeenCalledWith({
      candidateRank: 1,
      reason: "new_generation",
    });
  });

  it("selection 변경 cleanup은 예약을 취소하고 invalidated를 한 번 기록한다", () => {
    const input = members(5_001);
    const idle = createIdleHarness();
    const instrumentation = createInstrumentation();
    const task = scheduleSpeculativeCompositionAnalysis({
      members: input,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-4",
      isCurrent: () => true,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
    });

    task.cancel("selection_changed");
    idle.run();

    expect(getCachedTrioCompositionInsight(input)).toBeNull();
    expect(instrumentation.invalidated).toHaveBeenCalledTimes(1);
    expect(instrumentation.invalidated).toHaveBeenCalledWith({
      candidateRank: 1,
      reason: "selection_changed",
    });
  });

  it("feature flag off와 budget 밖 후보에서는 아무 것도 예약하지 않는다", () => {
    const disabledInput = members(6_001);
    const rankTwoInput = members(7_001);
    const idle = createIdleHarness();
    const instrumentation = createInstrumentation();

    const disabled = scheduleSpeculativeCompositionAnalysis({
      members: disabledInput,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-5",
      isCurrent: () => true,
      enabled: false,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
    });
    const overBudget = scheduleSpeculativeCompositionAnalysis({
      members: rankTwoInput,
      candidateRank: 2,
      source: "synergy_detail",
      generation: "generation-5",
      isCurrent: () => true,
      scheduleIdle: idle.scheduleIdle,
      instrumentation,
    });

    expect(disabled.scheduled).toBe(false);
    expect(overBudget.scheduled).toBe(false);
    expect(idle.scheduleIdle).not.toHaveBeenCalled();
    expect(instrumentation.scheduled).not.toHaveBeenCalled();

    const normalResult = buildTrioCompositionInsight(disabledInput);
    expect(getCachedTrioCompositionInsight(disabledInput)).toBe(normalResult);
  });

  it("같은 generation/key가 이미 예약 중이면 중복 scheduling하지 않는다", () => {
    const input = members(8_001);
    const firstIdle = createIdleHarness();
    const secondIdle = createIdleHarness();
    const instrumentation = createInstrumentation();
    const common = {
      members: input,
      candidateRank: 1,
      source: "synergy_detail",
      generation: "generation-6",
      isCurrent: () => true,
      instrumentation,
    } as const;

    const first = scheduleSpeculativeCompositionAnalysis({
      ...common,
      scheduleIdle: firstIdle.scheduleIdle,
    });
    const duplicate = scheduleSpeculativeCompositionAnalysis({
      ...common,
      scheduleIdle: secondIdle.scheduleIdle,
    });

    expect(first.scheduled).toBe(true);
    expect(duplicate.scheduled).toBe(false);
    expect(secondIdle.scheduleIdle).not.toHaveBeenCalled();
    first.cancel("new_generation");
  });
});
