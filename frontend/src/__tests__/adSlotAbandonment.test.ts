import { describe, expect, it } from "vitest";
import {
  getAdSlotRequestAgeBucket,
  getDocumentVisibility,
  getObservedAdState,
  shouldTrackAdSlotAbandonment,
} from "@/lib/adSlotAbandonment";

function createAdElement(adStatus: string | null, hasIframe = false) {
  return {
    getAttribute: () => adStatus,
    querySelector: () => (hasIframe ? {} : null),
  } as unknown as HTMLElement;
}

describe("adSlotAbandonment", () => {
  describe("shouldTrackAdSlotAbandonment", () => {
    it("요청 전 슬롯은 이탈로 집계하지 않는다", () => {
      expect(shouldTrackAdSlotAbandonment(new Set(), false)).toBe(false);
    });

    it("요청 후 최종 상태가 없는 슬롯만 이탈로 집계한다", () => {
      expect(shouldTrackAdSlotAbandonment(new Set(["requested"]), false)).toBe(true);
    });

    it.each(["filled", "unfilled", "timeout"])("%s 상태는 이탈에서 제외한다", (status) => {
      expect(shouldTrackAdSlotAbandonment(new Set(["requested", status]), false)).toBe(false);
    });

    it("이미 집계한 슬롯은 중복 집계하지 않는다", () => {
      expect(shouldTrackAdSlotAbandonment(new Set(["requested"]), true)).toBe(false);
    });
  });

  describe("getObservedAdState", () => {
    it("광고 요소가 없으면 상태와 iframe 부재를 반환한다", () => {
      expect(getObservedAdState(null)).toEqual({
        hasIframe: false,
        observedAdStatus: "missing",
      });
    });

    it.each(["filled", "unfilled"] as const)("%s 상태를 그대로 분류한다", (status) => {
      expect(getObservedAdState(createAdElement(status)).observedAdStatus).toBe(status);
    });

    it("알 수 없는 상태와 iframe 존재 여부를 함께 반환한다", () => {
      expect(getObservedAdState(createAdElement("pending", true))).toEqual({
        hasIframe: true,
        observedAdStatus: "other",
      });
    });
  });

  it.each([
    [0, "under_3s"],
    [2_999, "under_3s"],
    [3_000, "3s_to_10s"],
    [9_999, "3s_to_10s"],
    [10_000, "10s_plus"],
  ] as const)("요청 경과 시간 %dms를 %s로 분류한다", (elapsedMs, bucket) => {
    expect(getAdSlotRequestAgeBucket(elapsedMs)).toBe(bucket);
  });

  it("지원하지 않는 document visibility는 unknown으로 정규화한다", () => {
    expect(getDocumentVisibility("unloaded")).toBe("unknown");
    expect(getDocumentVisibility("hidden")).toBe("hidden");
  });
});
