import { describe, it, expect } from "vitest";
import {
  TierGroup,
  getTierFromMMR,
  normalizeTier,
  getTierGroupFromMMR,
  getAllTierGroupsFromMMR,
  isTierGroupMatch,
  parseTierGroup,
} from "@/utils/tier";

describe("getTierFromMMR", () => {
  it("null/undefined 입력 시 null 반환", () => {
    expect(getTierFromMMR(null)).toBeNull();
    expect(getTierFromMMR(undefined)).toBeNull();
  });

  it("음수 MMR은 null 반환", () => {
    expect(getTierFromMMR(-100)).toBeNull();
  });

  it("각 티어 경계값 매핑", () => {
    expect(getTierFromMMR(100)).toBe("IRON");
    expect(getTierFromMMR(599)).toBe("IRON");
    expect(getTierFromMMR(600)).toBe("BRONZE");
    expect(getTierFromMMR(1400)).toBe("SILVER");
    expect(getTierFromMMR(2400)).toBe("GOLD");
    expect(getTierFromMMR(3600)).toBe("PLATINUM");
    expect(getTierFromMMR(5000)).toBe("DIAMOND");
    expect(getTierFromMMR(6400)).toBe("METEORITE");
    expect(getTierFromMMR(7200)).toBe("MITHRIL");
  });

  it("최대값 초과 시 MITHRIL", () => {
    expect(getTierFromMMR(999999)).toBe("MITHRIL");
    expect(getTierFromMMR(1000000)).toBe("MITHRIL");
  });
});

describe("normalizeTier", () => {
  it("null/undefined/빈 문자열은 null", () => {
    expect(normalizeTier(null)).toBeNull();
    expect(normalizeTier(undefined)).toBeNull();
    expect(normalizeTier("")).toBeNull();
  });

  it("대소문자 정규화", () => {
    expect(normalizeTier("diamond")).toBe("DIAMOND");
    expect(normalizeTier("Diamond")).toBe("DIAMOND");
    expect(normalizeTier("MITHRIL")).toBe("MITHRIL");
  });

  it("잘못된 티어 이름은 null", () => {
    expect(normalizeTier("INVALID")).toBeNull();
    expect(normalizeTier("MASTER")).toBeNull();
  });
});

describe("getTierGroupFromMMR", () => {
  it("null/undefined 입력 시 null", () => {
    expect(getTierGroupFromMMR(null)).toBeNull();
    expect(getTierGroupFromMMR(undefined)).toBeNull();
  });

  it("음수 MMR은 null", () => {
    expect(getTierGroupFromMMR(-1)).toBeNull();
  });

  it("DIAMOND_BELOW: MMR < 5000", () => {
    expect(getTierGroupFromMMR(0)).toBe(TierGroup.DIAMOND_BELOW);
    expect(getTierGroupFromMMR(4999)).toBe(TierGroup.DIAMOND_BELOW);
  });

  it("DIAMOND: 5000 <= MMR < 6400", () => {
    expect(getTierGroupFromMMR(5000)).toBe(TierGroup.DIAMOND);
    expect(getTierGroupFromMMR(6399)).toBe(TierGroup.DIAMOND);
  });

  it("METEORITE: 6400 <= MMR < 7200", () => {
    expect(getTierGroupFromMMR(6400)).toBe(TierGroup.METEORITE);
    expect(getTierGroupFromMMR(7199)).toBe(TierGroup.METEORITE);
  });

  it("MITHRIL: MMR >= 7200", () => {
    expect(getTierGroupFromMMR(7200)).toBe(TierGroup.MITHRIL);
    expect(getTierGroupFromMMR(10000)).toBe(TierGroup.MITHRIL);
  });
});

describe("getAllTierGroupsFromMMR", () => {
  it("null 입력 시 빈 배열", () => {
    expect(getAllTierGroupsFromMMR(null)).toEqual([]);
  });

  it("rank1000MMR 없으면 IN1000 미포함", () => {
    const groups = getAllTierGroupsFromMMR(8000);
    expect(groups).toContain(TierGroup.MITHRIL);
    expect(groups).not.toContain(TierGroup.IN1000);
  });

  it("rank1000MMR 이상이면 IN1000 포함", () => {
    const groups = getAllTierGroupsFromMMR(8000, 7500);
    expect(groups).toContain(TierGroup.IN1000);
    expect(groups).toContain(TierGroup.MITHRIL);
  });

  it("rank1000MMR 미만이면 IN1000 미포함", () => {
    const groups = getAllTierGroupsFromMMR(7300, 7500);
    expect(groups).toContain(TierGroup.MITHRIL);
    expect(groups).not.toContain(TierGroup.IN1000);
  });
});

describe("isTierGroupMatch", () => {
  it("null MMR은 false", () => {
    expect(isTierGroupMatch(TierGroup.DIAMOND, null)).toBe(false);
  });

  it("각 티어 그룹 매칭", () => {
    expect(isTierGroupMatch(TierGroup.DIAMOND_BELOW, 3000)).toBe(true);
    expect(isTierGroupMatch(TierGroup.DIAMOND, 5500)).toBe(true);
    expect(isTierGroupMatch(TierGroup.METEORITE, 6500)).toBe(true);
    expect(isTierGroupMatch(TierGroup.MITHRIL, 7500)).toBe(true);
  });

  it("경계값 불일치", () => {
    expect(isTierGroupMatch(TierGroup.DIAMOND, 4999)).toBe(false);
    expect(isTierGroupMatch(TierGroup.DIAMOND, 6400)).toBe(false);
    expect(isTierGroupMatch(TierGroup.METEORITE, 7200)).toBe(false);
  });

  it("IN1000은 rank1000MMR 필요", () => {
    expect(isTierGroupMatch(TierGroup.IN1000, 8000)).toBe(false);
    expect(isTierGroupMatch(TierGroup.IN1000, 8000, 7500)).toBe(true);
    expect(isTierGroupMatch(TierGroup.IN1000, 7000, 7500)).toBe(false);
  });
});

describe("parseTierGroup", () => {
  it("null/undefined/빈 문자열은 null", () => {
    expect(parseTierGroup(null)).toBeNull();
    expect(parseTierGroup(undefined)).toBeNull();
    expect(parseTierGroup("")).toBeNull();
  });

  it("유효한 티어 그룹 파싱", () => {
    expect(parseTierGroup("DIAMOND")).toBe(TierGroup.DIAMOND);
    expect(parseTierGroup("MITHRIL")).toBe(TierGroup.MITHRIL);
    expect(parseTierGroup("IN1000")).toBe(TierGroup.IN1000);
  });

  it("DIAMOND_BELOW는 null (지표에서 제외)", () => {
    expect(parseTierGroup("DIAMOND_BELOW")).toBeNull();
  });

  it("잘못된 값은 null", () => {
    expect(parseTierGroup("INVALID")).toBeNull();
  });
});
