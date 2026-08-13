import { describe, it, expect } from "vitest";
import {
  getTraitGroup,
  hasTraitIcon,
  TRAIT_CORES,
  TRAIT_SUBS_SLOT1,
  TRAIT_SUBS_SLOT2,
} from "@/utils/traitCodes";

describe("getTraitGroup", () => {
  it("null이면 unknown", () => {
    expect(getTraitGroup(null)).toBe("unknown");
  });

  it("벽력(7000501)은 chaos 특수 케이스", () => {
    expect(getTraitGroup(7000501)).toBe("chaos");
  });

  it("havoc 메인 특성 (prefix 70)", () => {
    expect(getTraitGroup(7000201)).toBe("havoc");
    expect(getTraitGroup(7000401)).toBe("havoc");
    expect(getTraitGroup(7000601)).toBe("havoc");
    expect(getTraitGroup(7000701)).toBe("havoc");
  });

  it("fortification 메인 특성 (prefix 71)", () => {
    expect(getTraitGroup(7100101)).toBe("fortification");
    expect(getTraitGroup(7100201)).toBe("fortification");
  });

  it("support 메인 특성 (prefix 72)", () => {
    expect(getTraitGroup(7211301)).toBe("support");
    expect(getTraitGroup(7200301)).toBe("support");
  });

  it("패치 후 폭발 선인장과 초재생의 지원 슬롯을 반영", () => {
    expect(TRAIT_CORES.support).toEqual([7211301, 7200201, 7200301, 7200501]);
    expect(TRAIT_SUBS_SLOT1.support).toEqual([7211001, 7210101, 7211401, 7200101]);
  });

  it("chaos 메인 특성 (prefix 73)", () => {
    expect(getTraitGroup(7300101)).toBe("chaos");
    expect(getTraitGroup(7300201)).toBe("chaos");
  });

  it("천상의 수집품은 chaos 보조 2슬롯에 포함", () => {
    expect(TRAIT_SUBS_SLOT2.chaos).toContain(7310701);
    expect(hasTraitIcon(7310701)).toBe(true);
    expect(hasTraitIcon(7310501)).toBe(true);
  });

  it("sub 70107xx는 chaos 오버라이드 (havoc prefix지만 chaos)", () => {
    expect(getTraitGroup(7010701)).toBe("chaos");
    expect(getTraitGroup(7010799)).toBe("chaos");
  });

  it("sub 71108xx는 support 오버라이드 (fortification prefix지만 support)", () => {
    expect(getTraitGroup(7110801)).toBe("support");
    expect(getTraitGroup(7110899)).toBe("support");
  });

  it("알 수 없는 코드는 unknown", () => {
    expect(getTraitGroup(9999999)).toBe("unknown");
    expect(getTraitGroup(1000000)).toBe("unknown");
  });
});
