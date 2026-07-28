import { describe, expect, it } from "vitest";
import {
  filterTrioWeaponTuples,
  parseTrioWeaponTuple,
  parseTrioWeaponTupleBucket,
  trioWeaponTupleToResult,
  type CachedTrioWeaponTuple,
} from "@/lib/trioWeaponTuple";

const FIRST_TUPLE: CachedTrioWeaponTuple = [6, 8, 10, 1, 22, 3, 120, 30, 3240, 420];
const SECOND_TUPLE: CachedTrioWeaponTuple = [6, 8, 11, 2, 23, 4, 80, 16, 1680, 320];

describe("trioWeaponTuple", () => {
  it("bucket JSON tuple을 검증하고 숫자로 정규화한다", () => {
    expect(parseTrioWeaponTuple(["6", 8, 10, 1, 22, 3, 120, 30, 3240, 420])).toEqual(FIRST_TUPLE);
    expect(() => parseTrioWeaponTuple([6, 8])).toThrow("invalid_trio_weapon_member_bucket_tuple");
    expect(() => parseTrioWeaponTuple([6, 8, 10, 1, 22, 3, 120, 30, "not-a-number", 420])).toThrow(
      "invalid_trio_weapon_member_bucket_number"
    );
  });

  it("버전과 itemCount가 일치하는 bucket만 허용한다", () => {
    expect(
      parseTrioWeaponTupleBucket({
        version: 1,
        itemCount: 2,
        items: [FIRST_TUPLE, SECOND_TUPLE],
      }).items
    ).toEqual([FIRST_TUPLE, SECOND_TUPLE]);

    expect(() =>
      parseTrioWeaponTupleBucket({
        version: 1,
        itemCount: 1,
        items: [FIRST_TUPLE, SECOND_TUPLE],
      })
    ).toThrow("invalid_trio_weapon_member_bucket_count");
  });

  it("선택 순서와 무관하게 모든 캐릭터+무기 조건을 브라우저에서 필터링한다", () => {
    const tuples = [FIRST_TUPLE, SECOND_TUPLE];
    const selected = [
      { charCode: 22, weaponCode: 3 },
      { charCode: 6, weaponCode: 8 },
    ];

    expect(filterTrioWeaponTuples(tuples, selected)).toEqual([FIRST_TUPLE]);
    expect(filterTrioWeaponTuples(tuples, [...selected].reverse())).toEqual([FIRST_TUPLE]);
    expect(filterTrioWeaponTuples(tuples, [{ charCode: 6, weaponCode: null }])).toEqual(tuples);
  });

  it("합계 tuple을 UI 통계 단위로 변환한다", () => {
    expect(trioWeaponTupleToResult(FIRST_TUPLE)).toEqual({
      character1: 6,
      weaponType1: 8,
      character2: 10,
      weaponType2: 1,
      character3: 22,
      weaponType3: 3,
      mainCore1: null,
      mainCore2: null,
      mainCore3: null,
      totalGames: 120,
      winRate: 25,
      averageRP: 9,
      averageRank: 3.5,
    });
  });
});
