import { describe, it, expect } from "vitest";
import {
  calculateMetaChanges,
  calculateTrendScore,
  getTrendStatus,
  isSignificantChange,
} from "@/utils/metaAnalysis";

describe("calculateMetaChanges", () => {
  it("변화량 + 변화율 계산", () => {
    const changes = calculateMetaChanges(
      { winRate: 15, pickRate: 10, averageRP: 50 },
      { winRate: 10, pickRate: 8, averageRP: 40 }
    );

    expect(changes.winRate.delta).toBe(5);
    expect(changes.winRate.percentChange).toBe(50); // 5/10 * 100
    expect(changes.pickRate.delta).toBe(2);
    expect(changes.pickRate.percentChange).toBe(25); // 2/8 * 100
    expect(changes.averageRP.delta).toBe(10);
    expect(changes.averageRP.percentChange).toBe(25); // 10/40 * 100
  });

  it("이전 값이 0이면 변화율 0", () => {
    const changes = calculateMetaChanges(
      { winRate: 10, pickRate: 5, averageRP: 20 },
      { winRate: 0, pickRate: 0, averageRP: 0 }
    );

    expect(changes.winRate.percentChange).toBe(0);
    expect(changes.pickRate.percentChange).toBe(0);
    expect(changes.averageRP.percentChange).toBe(0);
  });

  it("감소하면 음수 delta", () => {
    const changes = calculateMetaChanges(
      { winRate: 8, pickRate: 3, averageRP: 30 },
      { winRate: 12, pickRate: 7, averageRP: 50 }
    );

    expect(changes.winRate.delta).toBe(-4);
    expect(changes.pickRate.delta).toBe(-4);
    expect(changes.averageRP.delta).toBe(-20);
  });
});

describe("calculateTrendScore", () => {
  it("모든 지표 상승 시 양수 스코어", () => {
    const changes = calculateMetaChanges(
      { winRate: 15, pickRate: 8, averageRP: 50 },
      { winRate: 10, pickRate: 5, averageRP: 40 }
    );
    const score = calculateTrendScore(changes);
    expect(score).toBeGreaterThan(0);
  });

  it("모든 지표 하락 시 음수 스코어", () => {
    const changes = calculateMetaChanges(
      { winRate: 8, pickRate: 3, averageRP: 30 },
      { winRate: 12, pickRate: 7, averageRP: 50 }
    );
    const score = calculateTrendScore(changes);
    expect(score).toBeLessThan(0);
  });

  it("-100 ~ 100 범위로 클램핑", () => {
    const extremeChanges = calculateMetaChanges(
      { winRate: 50, pickRate: 30, averageRP: 200 },
      { winRate: 5, pickRate: 1, averageRP: 10 }
    );
    const score = calculateTrendScore(extremeChanges);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(-100);
  });

  it("변화 없으면 스코어 0", () => {
    const changes = calculateMetaChanges(
      { winRate: 12, pickRate: 5, averageRP: 40 },
      { winRate: 12, pickRate: 5, averageRP: 40 }
    );
    expect(calculateTrendScore(changes)).toBe(0);
  });

  it("pickRate가 0이면 가중치 재분배 (winRate 55%, RP 45%)", () => {
    const changes = calculateMetaChanges(
      { winRate: 15, pickRate: 0, averageRP: 50 },
      { winRate: 10, pickRate: 0, averageRP: 40 }
    );
    const score = calculateTrendScore(changes);
    // pickRate 기여분 없이 winRate + RP로만 계산
    expect(score).toBeGreaterThan(0);
  });
});

describe("getTrendStatus", () => {
  it("score > 5 → rising", () => {
    expect(getTrendStatus(10)).toBe("rising");
    expect(getTrendStatus(5.1)).toBe("rising");
  });

  it("score < -5 → falling", () => {
    expect(getTrendStatus(-10)).toBe("falling");
    expect(getTrendStatus(-5.1)).toBe("falling");
  });

  it("-5 <= score <= 5 → stable", () => {
    expect(getTrendStatus(0)).toBe("stable");
    expect(getTrendStatus(5)).toBe("stable");
    expect(getTrendStatus(-5)).toBe("stable");
  });
});

describe("isSignificantChange", () => {
  it("기본 임계값 20", () => {
    expect(isSignificantChange(20)).toBe(true);
    expect(isSignificantChange(-20)).toBe(true);
    expect(isSignificantChange(19)).toBe(false);
    expect(isSignificantChange(-19)).toBe(false);
  });

  it("커스텀 임계값", () => {
    expect(isSignificantChange(10, 10)).toBe(true);
    expect(isSignificantChange(9, 10)).toBe(false);
  });
});
