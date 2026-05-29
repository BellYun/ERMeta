import { describe, expect, it } from "vitest";
import {
  buildTrioLabDetailHref,
  buildTrioLabListHref,
  buildTrioLabSearchParams,
  normalizeTrioLabPool,
  parseTrioLabUrlState,
} from "@/components/features/trio-lab/urlState";

describe("trioLabUrlState", () => {
  it("normalizes pool order, deduplicates values, and caps at three", () => {
    expect(normalizeTrioLabPool([20, 3, 20, 2, 99])).toEqual([2, 3, 20]);
  });

  it("parses sort, pool, and search from search params", () => {
    const state = parseTrioLabUrlState(
      new URLSearchParams("pool=20,3,2&sort=winRate&q=%E3%85%8E%E3%85%87")
    );

    expect(state).toEqual({
      pool: [2, 3, 20],
      sort: "winRate",
      search: "ㅎㅇ",
    });
  });

  it("omits default values when building search params", () => {
    const params = buildTrioLabSearchParams({
      pool: [],
      sort: "averageRP",
      search: "   ",
    });

    expect(params.toString()).toBe("");
  });

  it("builds stateful list and detail hrefs", () => {
    const state = {
      pool: [20, 3],
      sort: "winRate" as const,
      search: "현우",
    };

    expect(buildTrioLabListHref(state)).toBe(
      "/trio-lab?pool=3%2C20&sort=winRate&q=%ED%98%84%EC%9A%B0"
    );
    expect(buildTrioLabDetailHref("3-9_20-3_87-24", state)).toBe(
      "/trio-lab/3-9_20-3_87-24?pool=3%2C20&sort=winRate&q=%ED%98%84%EC%9A%B0"
    );
  });
});
