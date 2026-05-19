import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 자히르 (5)
  {
    characterCode: 5,
    patch: "11.1",
    changes: [
      {
        target: "간디바(W) - 피해량",
        changeType: "buff",
        description: [
          "주력 스킬 W - 간디바의 피해량을 상향하여 스킬 적중에 따른 보상을 늘리고 전반적인 위력을 강화합니다.",
        ],
        valueSummary: "60/85/110/135/160(+스킬 증폭의 50%) → 70/95/120/145/170(+스킬 증폭의 50%)",
      },
    ],
  },
  // 현우 (7)
  {
    characterCode: 7,
    patch: "11.1",
    changes: [
      {
        target: "글러브 무기 숙련도 - 레벨 당 기본 공격 증폭",
        changeType: "nerf",
        description: [
          "지속적으로 평균 이상의 성능을 유지하고 있는 글러브 현우의 무기 숙련도 효과를 하향하여 전반적인 위력을 견제합니다.",
        ],
        valueSummary: "2.3% → 2.2%",
      },
    ],
  },
  // 아드리아나 (17)
  {
    characterCode: 17,
    patch: "11.1",
    changes: [
      {
        target: "방화(Q) - 피해량",
        changeType: "buff",
        description: ["Q - 방화의 피해량을 상향하여 근접 교전 위력을 강화합니다."],
        valueSummary:
          "30/40/50/60/70(+스킬 증폭의 25/27/29/31/33%) → 35/45/55/65/75(+스킬 증폭의 25/27/29/31/33%)",
      },
    ],
  },
  // 로지 (21)
  {
    characterCode: 21,
    patch: "11.1",
    changes: [
      {
        target: "기본 공격력",
        changeType: "nerf",
        description: ["기본 공격력을 하향하여 피해 능력을 소폭 약화합니다."],
        valueSummary: "35 → 32",
      },
    ],
  },
  // 레온 (29)
  {
    characterCode: 29,
    patch: "11.1",
    changes: [
      {
        target: "톤파 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: ["톤파 레온의 무기 숙련도 효과를 하향하여 전반적인 위력을 견제합니다."],
        valueSummary: "5% → 4.8%",
      },
    ],
  },
  // 아디나 (52)
  {
    characterCode: 52,
    patch: "11.1",
    changes: [
      {
        target: "루미너리(Q) 해 컨정션 - 지속 피해량",
        changeType: "buff",
        description: [
          "해 컨정션의 지속 피해량을 상향하여 스킬 적중 시 기대할 수 있는 위력을 강화합니다.",
        ],
        valueSummary: "대상 최대 체력의 10% → 11%",
      },
      {
        target: "루미너리(Q) 해 컨정션 - 투사체 속도",
        changeType: "buff",
        description: ["투사체 속도를 상향하여 적중 난이도를 낮추고 명중률을 보완합니다."],
        valueSummary: "7.5m/s → 8m/s",
      },
    ],
  },
  // 레니 (69)
  {
    characterCode: 69,
    patch: "11.1",
    changes: [
      {
        target: "뿅! 망치(W) - 이동 속도 증가",
        changeType: "nerf",
        description: [
          "W - 뿅! 망치의 이동 속도 증가 수치를 하향하여 아군에게 제공하는 과도한 기동성을 견제합니다.",
        ],
        valueSummary: "16/17/18/19/20(+레벨*1)% → 11/12/13/14/15(+레벨*1)%",
      },
    ],
  },
  // 미르카 (85)
  {
    characterCode: 85,
    patch: "11.1",
    changes: [
      {
        target: "백스탭 러시(E) - 받는 피해 감소",
        changeType: "nerf",
        description: [
          "E - 백스탭 러시의 받는 피해 감소 수치를 낮춰 미르카의 내구도를 하향 조정합니다.",
        ],
        valueSummary: "80% → 60%",
      },
    ],
  },
];
