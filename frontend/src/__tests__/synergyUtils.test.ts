import { describe, it, expect } from "vitest";
import type { TrioResult } from "@/components/features/synergy/types";
import {
  getChosung,
  isChosung,
  matchesChosungSearch,
  getSortValue,
  getThirdCharacter,
  deduplicateResults,
} from "@/components/features/synergy/utils";

// ─── 초성 검색 ─────────────────────────────────────────────────────────────────

describe("getChosung", () => {
  it("한글 음절에서 초성 추출", () => {
    expect(getChosung("가")).toBe("ㄱ");
    expect(getChosung("나")).toBe("ㄴ");
    expect(getChosung("하")).toBe("ㅎ");
  });

  it("한글이 아닌 문자는 null", () => {
    expect(getChosung("a")).toBeNull();
    expect(getChosung("1")).toBeNull();
    expect(getChosung("!")).toBeNull();
  });

  it("초성 문자 자체는 null (음절 범위 밖)", () => {
    expect(getChosung("ㄱ")).toBeNull();
  });
});

describe("isChosung", () => {
  it("초성 문자 판별", () => {
    expect(isChosung("ㄱ")).toBe(true);
    expect(isChosung("ㅎ")).toBe(true);
    expect(isChosung("ㄲ")).toBe(true);
  });

  it("비초성 문자", () => {
    expect(isChosung("가")).toBe(false);
    expect(isChosung("a")).toBe(false);
  });
});

describe("matchesChosungSearch", () => {
  it("일반 부분 문자열 검색", () => {
    expect(matchesChosungSearch("아이솔", "아이")).toBe(true);
    expect(matchesChosungSearch("아이솔", "이솔")).toBe(true);
    expect(matchesChosungSearch("아이솔", "xyz")).toBe(false);
  });

  it("대소문자 무시", () => {
    expect(matchesChosungSearch("Aya", "aya")).toBe(true);
    expect(matchesChosungSearch("Aya", "AYA")).toBe(true);
  });

  it("초성 검색", () => {
    expect(matchesChosungSearch("아이솔", "ㅇㅇㅅ")).toBe(true);
    expect(matchesChosungSearch("아이솔", "ㅇㅅ")).toBe(true); // "이솔"의 초성 ㅇㅅ 매칭
    expect(matchesChosungSearch("하트", "ㅎㅌ")).toBe(true);
  });

  it("공백 무시", () => {
    expect(matchesChosungSearch("아이 솔", "아이솔")).toBe(true);
    expect(matchesChosungSearch("아이솔", "아이 솔")).toBe(true);
  });

  it("빈 쿼리", () => {
    expect(matchesChosungSearch("아이솔", "")).toBe(true);
  });
});

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

function makeTrio(overrides: Partial<TrioResult> = {}): TrioResult {
  return {
    character1: 1,
    character2: 2,
    character3: 3,
    winRate: 15,
    averageRP: 10,
    totalGames: 100,
    averageRank: 4,
    ...overrides,
  };
}

describe("getSortValue", () => {
  const rec = makeTrio({ averageRP: 10, winRate: 15, totalGames: 200 });

  it("averageRP 정렬", () => {
    expect(getSortValue(rec, "averageRP")).toBe(10);
  });

  it("winRate 정렬", () => {
    expect(getSortValue(rec, "winRate")).toBe(15);
  });

  it("totalGames 정렬", () => {
    expect(getSortValue(rec, "totalGames")).toBe(200);
  });

  it("recommended: serverIndex 있으면 음수 인덱스", () => {
    expect(getSortValue(rec, "recommended", 3)).toBe(-3);
  });

  it("recommended: serverIndex 없으면 averageRP 폴백", () => {
    expect(getSortValue(rec, "recommended")).toBe(10);
  });
});

describe("getThirdCharacter", () => {
  it("두 아군 제외한 세 번째 캐릭터 반환", () => {
    const rec = makeTrio({ character1: 10, character2: 20, character3: 30 });
    expect(getThirdCharacter(rec, 10, 20)).toBe(30);
    expect(getThirdCharacter(rec, 10, 30)).toBe(20);
    expect(getThirdCharacter(rec, 20, 30)).toBe(10);
  });

  it("매칭되는 아군이 없으면 null", () => {
    const rec = makeTrio({ character1: 10, character2: 20, character3: 30 });
    expect(getThirdCharacter(rec, 99, 98)).toBeNull();
  });

  it("하나만 매칭되면 2명 남아서 null", () => {
    const rec = makeTrio({ character1: 10, character2: 20, character3: 30 });
    expect(getThirdCharacter(rec, 10, 99)).toBeNull();
  });
});

describe("deduplicateResults", () => {
  it("아군 0명이면 그대로 반환", () => {
    const results = [makeTrio(), makeTrio()];
    expect(deduplicateResults(results, [], "averageRP")).toEqual(results);
  });

  it("아군 2명: 3번째 캐릭터 기준 중복 제거, 높은 스코어 유지", () => {
    const results = [
      makeTrio({ character1: 1, character2: 2, character3: 10, averageRP: 5 }),
      makeTrio({ character1: 1, character2: 2, character3: 10, averageRP: 15 }),
      makeTrio({ character1: 1, character2: 2, character3: 20, averageRP: 8 }),
    ];
    const deduped = deduplicateResults(results, [1, 2], "averageRP");
    expect(deduped).toHaveLength(2);
    // character3=10인 것 중 averageRP 15인 것만 남아야 함
    const char10 = deduped.find((r) => r.character3 === 10);
    expect(char10?.averageRP).toBe(15);
  });

  it("아군 1명: 나머지 쌍 기준 중복 제거", () => {
    const results = [
      makeTrio({ character1: 1, character2: 5, character3: 10, averageRP: 20 }),
      makeTrio({ character1: 1, character2: 5, character3: 10, averageRP: 10 }),
      makeTrio({ character1: 1, character2: 7, character3: 8, averageRP: 12 }),
    ];
    const deduped = deduplicateResults(results, [1], "averageRP");
    expect(deduped).toHaveLength(2);
  });

  it("결과가 sortBy 기준 내림차순 정렬", () => {
    const results = [
      makeTrio({ character1: 1, character2: 2, character3: 10, averageRP: 5 }),
      makeTrio({ character1: 1, character2: 2, character3: 20, averageRP: 15 }),
      makeTrio({ character1: 1, character2: 2, character3: 30, averageRP: 10 }),
    ];
    const deduped = deduplicateResults(results, [1, 2], "averageRP");
    expect(deduped[0].averageRP).toBe(15);
    expect(deduped[1].averageRP).toBe(10);
    expect(deduped[2].averageRP).toBe(5);
  });
});
