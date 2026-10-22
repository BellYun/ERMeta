import { describe, expect, it } from "vitest";
import {
  mergePickPartnerFiles,
  sortPickPartners,
  PICK_PARTNER_SCOPE,
  type PickPartnerFile,
} from "@/lib/pickPartnerStats";
function file(
  weaponCode: number,
  partnerWeapon = 6,
  partnerCharacter = 2,
  games = 10,
  rp = 300
): PickPartnerFile {
  return {
    schemaVersion: 1,
    scope: PICK_PARTNER_SCOPE,
    characterCode: 1,
    weaponCode,
    baseline: { totalGames: games, totalWins: 2, totalRP: rp, rankSum: 40 },
    partners: [
      {
        characterCode: partnerCharacter,
        weaponCode: partnerWeapon,
        totalGames: games,
        totalWins: 2,
        totalRP: rp,
        rankSum: 40,
        winRate: 0,
        averageRP: 0,
        averageRank: 0,
      },
    ],
  };
}
describe("single-ally partner statistics", () => {
  it("weights all anchor weapons using raw sums", () => {
    const result = mergePickPartnerFiles([file(14), file(15, 6, 2, 90, 5400)], 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ totalGames: 100, averageRP: 19, winRate: 4 });
  });
  it("keeps weapons separate except weapon-agnostic Alex", () => {
    expect(mergePickPartnerFiles([file(14, 6), file(15, 9)], 1)).toHaveLength(2);
    const alex = mergePickPartnerFiles([file(14, 6, 27), file(15, 16, 27)], 1);
    expect(alex).toHaveLength(1);
    expect(alex[0]).toMatchObject({ characterCode: 27, weaponCode: 0, totalGames: 20 });
  });
  it("rejects snapshot mismatches and invalid metrics", () => {
    expect(() => mergePickPartnerFiles([{ ...file(14), scope: "s10-s11" }], 1)).toThrow();
    expect(() => mergePickPartnerFiles([file(14)], 2)).toThrow();
    expect(() => mergePickPartnerFiles([file(14, 6, 2, 0)], 1)).toThrow();
  });
  it("applies minimum games and exact pool weapons without mutating input", () => {
    const partners = mergePickPartnerFiles([file(14, 6), file(15, 9, 3, 100, 6000)], 1);
    const original = [...partners];
    expect(
      sortPickPartners(partners, "averageRP", 0, [{ charCode: 2, weaponCode: 6 }])[0].characterCode
    ).toBe(2);
    expect(
      sortPickPartners(partners, "averageRP", 0, [{ charCode: 2, weaponCode: 9 }])[0].characterCode
    ).toBe(3);
    expect(sortPickPartners(partners, "totalGames", 30, []).map((p) => p.characterCode)).toEqual([
      3,
    ]);
    expect(partners).toEqual(original);
  });
  it("sorts rank ascending and defers small samples", () => {
    const partners = mergePickPartnerFiles([file(14, 6, 2, 10, 300), file(15, 9, 3, 2, 6000)], 1);
    expect(sortPickPartners(partners, "averageRP", 0, [])[0].characterCode).toBe(2);
    expect(
      sortPickPartners(
        partners.map((p) => ({ ...p, totalGames: 100 })),
        "averageRank",
        0,
        []
      )[0].characterCode
    ).toBe(2);
  });
});
