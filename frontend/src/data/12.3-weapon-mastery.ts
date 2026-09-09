import type { PatchChange } from "./10.1";

// Mastery belongs to a character AND weapon, not every user of the weapon.
const MASTERY: Record<string, PatchChange[]> = {
  "74:3": [
    {
      weaponMasteryCode: 3,
      target: "방망이 무기 숙련도 레벨 당 기본 공격 증폭",
      changeType: "nerf",
      description: ["높은 선택률과 강력한 기본 공격 위력을 낮췄습니다."],
      valueSummary: "1.7% → 1.6%",
    },
  ],
  "13:19": [
    {
      weaponMasteryCode: 19,
      target: "창 무기 숙련도 레벨 당 스킬 증폭",
      changeType: "buff",
      description: ["상대적으로 낮은 창 쇼우의 교전 위력을 높였습니다."],
      valueSummary: "4.4% → 4.7%",
    },
  ],
  "1:15": [
    {
      weaponMasteryCode: 15,
      target: "단검 무기 숙련도 레벨 당 기본 공격 증폭",
      changeType: "nerf",
      description: ["단검 재키의 지나치게 강한 화력을 낮췄습니다."],
      valueSummary: "2.1% → 1.3%",
    },
    {
      weaponMasteryCode: 15,
      target: "단검 무기 숙련도 레벨 당 공격 속도",
      changeType: "nerf",
      description: ["단검 재키의 지나치게 강한 화력을 낮췄습니다."],
      valueSummary: "4.1% → 2.7%",
    },
  ],
  "1:16": [
    {
      weaponMasteryCode: 16,
      target: "양손검 무기 숙련도 레벨 당 공격 속도",
      changeType: "buff",
      description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
      valueSummary: "3.6% → 4%",
    },
  ],
  "1:14": [
    {
      weaponMasteryCode: 14,
      target: "도끼 무기 숙련도 레벨 당 공격 속도",
      changeType: "buff",
      description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
      valueSummary: "3% → 3.4%",
    },
  ],
  "1:18": [
    {
      weaponMasteryCode: 18,
      target: "쌍검 무기 숙련도 레벨 당 공격 속도",
      changeType: "buff",
      description: ["비단검 무기군의 위력이 지나치게 낮아지지 않도록 보완했습니다."],
      valueSummary: "4% → 4.4%",
    },
  ],
  "23:18": [
    {
      weaponMasteryCode: 18,
      target: "쌍검 무기 숙련도 레벨 당 스킬 증폭",
      changeType: "nerf",
      description: ["쌍검 캐시의 높은 전반적인 성능을 낮췄습니다."],
      valueSummary: "4.8% → 4.6%",
    },
  ],
  "12:7": [
    {
      weaponMasteryCode: 7,
      target: "활 무기 숙련도 레벨 당 스킬 증폭",
      changeType: "nerf",
      description: ["지속적으로 우수한 활 혜진의 성능을 소폭 낮췄습니다."],
      valueSummary: "4.8% → 4.7%",
    },
  ],
};

export function getPatch123MasteryChanges(
  characterCode: number,
  weaponCode: number
): PatchChange[] {
  return MASTERY[`${characterCode}:${weaponCode}`] ?? [];
}
