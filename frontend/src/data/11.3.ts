import type { CharacterPatchNote } from "./10.1";

export const PATCH_NOTES: CharacterPatchNote[] = [
  // 나딘 (6)
  {
    characterCode: 6,
    patch: "11.3",
    changes: [
      {
        target: "석궁 무기 숙련도 - 레벨 당 공격 속도",
        changeType: "buff",
        description: [
          "석궁 나딘은 낮은 선택률과 부족한 피해량을 기록하고 있어, 석궁 무기 숙련도의 공격 속도 증가 효과를 상향 조정하여 전반적인 위력을 보완합니다.",
        ],
        valueSummary: "2.8% → 3.4%",
      },
    ],
  },
  // 니키 (33)
  {
    characterCode: 33,
    patch: "11.3",
    changes: [
      {
        target: "다혈질(P) - 피해량",
        changeType: "buff",
        description: [
          "니키는 대부분의 구간에서 낮은 통계를 기록하고 있어, 다혈질의 낮은 레벨 위력을 높여 스킬 마스터 순서의 부담을 덜어줍니다.",
        ],
        valueSummary: "30/70/110(+스킬 증폭의 35%) → 60/85/110(+스킬 증폭의 35%)",
      },
      {
        target: "다혈질(P) - 공격 속도 증가",
        changeType: "buff",
        description: ["다혈질의 낮은 레벨 공격 속도 증가 효과를 상향합니다."],
        valueSummary: "30/40/50% → 40/45/50%",
      },
      {
        target: "강력한 펀치(E) - 피해량",
        changeType: "buff",
        description: ["강력한 펀치의 피해량을 증가시켜 스킬 위력을 보완합니다."],
        valueSummary: "60/95/130/165/200(+스킬 증폭의 90%) → 60/95/130/165/200(+스킬 증폭의 95%)",
      },
    ],
  },
  // 다르코 (74)
  {
    characterCode: 74,
    patch: "11.3",
    changes: [
      {
        target: "수금(W) - 보호막량",
        changeType: "buff",
        description: [
          "다르코는 게임 후반부로 갈수록 교전 위력이 다소 부족해지는 모습을 보여, 보호막 증가량을 상향 조정하여 후반부에 보다 높은 내구도를 확보할 수 있도록 보완합니다.",
        ],
        valueSummary: "50/75/100/125/150(+공격력의 55%) → 50/90/130/170/210(+공격력의 55%)",
      },
    ],
  },
  // 라우라 (47)
  {
    characterCode: 47,
    patch: "11.3",
    changes: [
      {
        target: "채찍 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: [
          "라우라는 평균 이하의 지표를 기록하고 있어, 무기 숙련도 효과를 강화하여 교전 위력을 보완합니다.",
        ],
        valueSummary: "4% → 4.1%",
      },
      {
        target: "기본 이동 속도",
        changeType: "buff",
        description: ["기본 이동 속도를 높여 전반적인 기동력을 강화합니다."],
        valueSummary: "3.45 → 3.5",
      },
    ],
  },
  // 레니 (69)
  {
    characterCode: 69,
    patch: "11.3",
    changes: [
      {
        target: "기본 방어력",
        changeType: "nerf",
        description: [
          "레니는 지속적으로 높은 성과를 보이고 있어, 기본 방어력을 낮춰 공격적인 플레이에 리스크를 부여합니다.",
        ],
        valueSummary: "52 → 50",
      },
      {
        target: "에어 호른! 건(E) - 기절 지속 시간",
        changeType: "nerf",
        description: ["기절 지속 시간을 줄여 스킬 연계의 위력을 약화시킵니다."],
        valueSummary: "0.6초 → 0.5초",
      },
    ],
  },
  // 레온 (29)
  {
    characterCode: 29,
    patch: "11.3",
    changes: [
      {
        target: "인간 어뢰(P) - 이동 속도 증가",
        changeType: "buff",
        description: [
          "레온은 상위권 실력대에서 지속적으로 낮은 지표를 기록하고 있어, 인간 어뢰의 이동 속도 증가량을 높여 기동력을 강화합니다.",
        ],
        valueSummary: "12/18/24% → 16/22/28%",
      },
    ],
  },
  // 로지 (21)
  {
    characterCode: 21,
    patch: "11.3",
    changes: [
      {
        target: "스핀샷(W) - 방어력 감소",
        changeType: "nerf",
        description: [
          "로지는 지속적으로 평균 이상의 지표를 기록하고 특히 근접 실험체를 상대할 때 강력한 위력을 발휘하고 있어, 스핀샷의 방어력 감소량을 낮춰 근접 교전 능력을 견제합니다.",
        ],
        valueSummary: "11/12/13/14/15% → 8/9/10/11/12%",
      },
    ],
  },
  // 마이 (45)
  {
    characterCode: 45,
    patch: "11.3",
    changes: [
      {
        target: "익스클루시브(R) - 사거리",
        changeType: "buff",
        description: [
          "마이는 대부분의 구간에서 낮은 통계를 기록하고 있어, 익스클루시브의 사거리를 늘려 아군 보조 능력을 강화합니다.",
        ],
        valueSummary: "5m → 5.5m",
      },
      {
        target: "익스클루시브(R) - 체력 회복량",
        changeType: "buff",
        description: ["체력 회복량을 함께 상향 조정합니다."],
        valueSummary:
          "50/100/150(+스킬 증폭의 35%)(+대상 잃은 체력의 10%) → 50/100/150(+스킬 증폭의 35%)(+대상 잃은 체력의 15%)",
      },
    ],
  },
  // 블레어 (84)
  {
    characterCode: 84,
    patch: "11.3",
    changes: [
      {
        target: "이중 휩쓸기(쌍날검 Q) - 쌍날검 1, 2타 피해량",
        changeType: "nerf",
        description: [
          "블레어는 매우 높은 평균 피해량을 기록하고 있어, 이중 휩쓸기의 피해량을 낮춰 교전 위력을 하향 조정합니다.",
        ],
        valueSummary: "40/65/90/115/140(+공격력의 80%) → 40/65/90/115/140(+공격력의 75%)",
      },
    ],
  },
  // 비형 (88)
  {
    characterCode: 88,
    patch: "11.3",
    changes: [
      {
        target: "도깨비 불(P) - 피해량",
        changeType: "nerf",
        description: [
          "비형은 매우 높은 픽률 지표를 기록하고 있어, 도깨비 불의 위력을 하향하여 전반적인 피해 능력을 견제합니다.",
        ],
        valueSummary:
          "16/32/48(+추가 공격력의 40%)(+대상 최대 체력의 1/2/3%) → 16/24/32(+추가 공격력의 40%)(+대상 최대 체력의 1/2/3%)",
      },
      {
        target: "뚝딱!(Q) - 1타 회복량",
        changeType: "nerf",
        description: ["뚝딱!의 회복량을 낮추어 지속 교전에서 보여주는 높은 유지력을 감소시킵니다."],
        valueSummary: "4/4.5/5/5.5/6% → 2/2.5/3/3.5/4%",
      },
      {
        target: "뚝딱!(Q) - 재사용 회복량",
        changeType: "nerf",
        description: ["재사용 회복량을 낮추어 지속 교전에서 보여주는 높은 유지력을 감소시킵니다."],
        valueSummary: "6/6.75/7.5/8.25/9% → 3.9/4.8/5.7/6.6/7.5%",
      },
    ],
  },
  // 샬럿 (73)
  {
    characterCode: 73,
    patch: "11.3",
    changes: [
      {
        target: "빛무리(Q) - 피해량",
        changeType: "buff",
        description: [
          "샬럿은 지속적으로 매우 낮은 지표를 기록하고 있어, 빛무리의 위력을 상향하여 자체적인 피해 능력을 보완합니다.",
        ],
        valueSummary:
          "120/150/180/210/240(+스킬 증폭의 95%) → 120/150/180/210/240(+스킬 증폭의 100%)",
      },
    ],
  },
  // 쇼우 (13)
  {
    characterCode: 13,
    patch: "11.3",
    changes: [
      {
        target: "소스범벅(Q) - 이동 속도 감소 지속 시간",
        changeType: "buff",
        description: [
          "쇼우의 소스범벅은 적이 영역을 벗어나면 이동 속도 감소 효과가 빠르게 종료되어, 영역에서 벗어나더라도 감속 효과가 일정 시간 유지되도록 지속 시간을 조정합니다.",
        ],
        valueSummary: "0.2초 → 0.5초",
      },
    ],
  },
  // 쇼이치 (18)
  {
    characterCode: 18,
    patch: "11.3",
    changes: [
      {
        target: "협상(E) - 피해량",
        changeType: "buff",
        description: [
          "쇼이치는 지속적으로 낮은 지표를 기록하고 있어, 협상의 위력을 상향하여 단일 대상 피해 능력을 강화합니다.",
        ],
        valueSummary: "60/100/140/180/220(+스킬 증폭의 65%) → 60/100/140/180/220(+스킬 증폭의 75%)",
      },
    ],
  },
  // 시셀라 (15)
  {
    characterCode: 15,
    patch: "11.3",
    changes: [
      {
        target: "기본 체력",
        changeType: "buff",
        description: [
          "시셀라는 내구도가 지나치게 낮은 모습을 보여, 보다 안정적으로 플레이할 수 있도록 기본 내구도를 상향합니다.",
        ],
        valueSummary: "890 → 920",
      },
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["시셀라의 기본 내구도를 상향합니다."],
        valueSummary: "49 → 50",
      },
    ],
  },
  // 아드리아나 (17)
  {
    characterCode: 17,
    patch: "11.3",
    changes: [
      {
        target: "불길 쇄도(E) - 쿨다운",
        changeType: "buff",
        description: [
          "아드리아나는 상위권 실력대에서 낮은 지표를 보이고 있어, 긴 쿨다운으로 인해 사용에 부담이 큰 불길 쇄도의 재사용 대기시간을 줄여 생존 능력을 강화합니다.",
        ],
        valueSummary: "19/18/17/16/15초 → 18/17/16/15/14초",
      },
    ],
  },
  // 아디나 (52)
  {
    characterCode: 52,
    patch: "11.3",
    changes: [
      {
        target: "별 읽기(P) - 이동 속도 증가",
        changeType: "buff",
        description: [
          "아디나가 별 읽기 상태에 돌입했을 때의 이동 속도 증가량을 상향하여 교전 중 보다 원활하게 포지션을 잡을 수 있도록 돕고, 전반적인 플레이 안정성을 보완합니다.",
        ],
        valueSummary: "4/7/10%(+스킬 증폭의 1%) → 7/10/13%(+스킬 증폭의 1%)",
      },
    ],
  },
  // 아르다 (66)
  {
    characterCode: 66,
    patch: "11.3",
    changes: [
      {
        target: "잠들어있는 힘(R) - 쿨다운",
        changeType: "nerf",
        description: [
          "아르다는 모든 구간에서 높은 통계를 기록하고 있어, 잠들어있는 힘의 쿨다운을 늘려 높은 스킬 사용 빈도를 견제하고 보다 신중하게 스킬을 사용하도록 조정합니다.",
        ],
        valueSummary: "19/17/15초 → 20/18/16초",
      },
    ],
  },
  // 아이작 (59)
  {
    characterCode: 59,
    patch: "11.3",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: [
          "아이작은 현재 대부분의 지표가 낮게 형성되어 있어, 레벨 당 공격력을 상향하여 게임 후반부의 위력을 보강합니다.",
        ],
        valueSummary: "4.7 → 4.9",
      },
      {
        target: "착취(P) - 입힌 피해량 비례 체력 회복량",
        changeType: "buff",
        description: [
          "착취의 회복량을 늘려 교전 유지력을 개선함으로써 전반적인 성능을 보완합니다.",
        ],
        valueSummary: "100/125/150% → 120/140/160%",
      },
    ],
  },
  // 얀 (35)
  {
    characterCode: 35,
    patch: "11.3",
    changes: [
      {
        target: "니 스트라이크(Q) - 피해량",
        changeType: "buff",
        description: [
          "톤파 얀은 오랜 기간 약세를 보이고 있어, 니 스트라이크의 스킬 증폭 계수를 상향하여 부족한 위력을 보완합니다.",
        ],
        valueSummary:
          "100/120/140/160/180(+추가 공격력의 65%)(+스킬 증폭의 50%)(+적 최대 체력의 6%) → 100/120/140/160/180(+추가 공격력의 65%)(+스킬 증폭의 55%)(+적 최대 체력의 6%)",
      },
    ],
  },
  // 에스텔 (55)
  {
    characterCode: 55,
    patch: "11.3",
    changes: [
      {
        target: "선제대응(W) - 피해량",
        changeType: "buff",
        description: [
          "에스텔은 낮은 지표를 유지하고 있어, 선제대응의 위력을 상향하여 보다 주도적으로 적을 압박하는 공격적인 플레이가 가능하도록 지원합니다.",
        ],
        valueSummary:
          "20/50/80/110/140(+스킬 증폭의 55%)(+대상 최대 체력의 2.5%) → 20/50/80/110/140(+스킬 증폭의 55%)(+대상 최대 체력의 3%)",
      },
      {
        target: "방패방어(E) - 방패돌진(E2) 피해량",
        changeType: "buff",
        description: ["방패돌진의 위력을 상향하여 공격적인 플레이를 지원합니다."],
        valueSummary:
          "60/85/110/135/160(+스킬 증폭의 60%)(+최대 체력의 10%) → 60/85/110/135/160(+스킬 증폭의 70%)(+최대 체력의 10%)",
      },
    ],
  },
  // 유민 (77)
  {
    characterCode: 77,
    patch: "11.3",
    changes: [
      {
        target: "선풍(Q) - 바람 지대 피해량",
        changeType: "nerf",
        description: [
          "유민은 모든 구간에서 강력한 모습을 보이고 있어, 주력 스킬인 선풍의 강화 시 피해량을 하향하여 전반적인 교전 능력을 견제합니다.",
        ],
        valueSummary: "50/70/90/110/130(+스킬 증폭의 40%) → 40/60/80/100/120(+스킬 증폭의 40%)",
      },
    ],
  },
  // 이렘 (61)
  {
    characterCode: 61,
    patch: "11.3",
    changes: [
      {
        target: "고양이의 습성(P) - 이렘일 때 공격 속도 증가",
        changeType: "buff",
        description: [
          "고양이의 습성 수치를 상향 조정하여 패시브 활성화 시의 활용 가치를 개선합니다.",
        ],
        valueSummary: "10/20/30% → 20/30/40%",
      },
      {
        target: "고양이의 습성(P) - 고양이일 때 방어력 증가",
        changeType: "buff",
        description: [
          "고양이의 습성 수치를 상향 조정하여 패시브 활성화 시의 활용 가치를 개선합니다.",
        ],
        valueSummary: "6/10/14 → 8/12/16",
      },
    ],
  },
  // 이안 (63)
  {
    characterCode: 63,
    patch: "11.3",
    changes: [
      {
        target: "피투성이 손톱(빙의 W) - 피해량",
        changeType: "buff",
        description: [
          "아쉬운 성과를 기록하고 있는 이안의 피투성이 손톱 피해량을 상향 조정하여 빙의 상태일 때의 교전 능력을 강화합니다.",
        ],
        valueSummary: "20/50/80/110/140(+공격력의 65%) → 30/60/90/120/150(+공격력의 65%)",
      },
    ],
  },
  // 자히르 (5)
  {
    characterCode: 5,
    patch: "11.3",
    changes: [
      {
        target: "암기 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "nerf",
        description: [
          "매우 높은 통계를 기록하고 있는 암기 자히르의 무기 숙련도를 하향하여 위력을 견제합니다.",
        ],
        valueSummary: "4% → 3.9%",
      },
    ],
  },
  // 제니 (38)
  {
    characterCode: 38,
    patch: "11.3",
    changes: [
      {
        target: "죽음의 연기(P) - 쿨다운",
        changeType: "buff",
        description: [
          "제니는 죽음의 연기의 긴 재사용 대기시간으로 인해 연속 교전에서 어려움을 겪고 있어, 쿨다운을 줄여 교전 템포를 맞추고 다음 교전에 보다 빠르게 대비할 수 있도록 상향 조정합니다.",
        ],
        valueSummary: "90초 → 70초",
      },
    ],
  },
  // 츠바메 (70)
  {
    characterCode: 70,
    patch: "11.3",
    changes: [
      {
        target: "오의 - 생사 각인(P) - 피해량",
        changeType: "buff",
        description: [
          "츠바메는 체력이 높은 적을 상대하는 데 특화되어 있으나 현재는 그 위력이 기대치에 미치지 못하고 있어, 대상 체력 비례 피해량을 상향하여 본연의 강점을 발휘할 수 있도록 보완합니다.",
        ],
        valueSummary:
          "30(+추가 공격력의 25%)(+대상 최대 체력의 4/7/10(+추가 공격력의 4%)%) → 30(+추가 공격력의 25%)(+대상 최대 체력의 4/7/10(+추가 공격력의 5%)%)",
      },
    ],
  },
  // 카티야 (72)
  {
    characterCode: 72,
    patch: "11.3",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: [
          "아쉬운 성과를 기록하고 있는 카티야의 레벨 당 공격력을 상향하여 위력을 보완합니다.",
        ],
        valueSummary: "4.5 → 4.7",
      },
    ],
  },
  // 케네스 (71)
  {
    characterCode: 71,
    patch: "11.3",
    changes: [
      {
        target: "업화(W) - 받는 피해 감소",
        changeType: "buff",
        description: [
          "케네스는 대부분의 지표에서 낮은 성과를 기록하고 있어, 업화의 공격력 계수를 상향하여 공격적인 아이템 빌드를 선택했을 때의 효율을 높이고 교전 중 유의미한 내구도를 확보할 수 있도록 조정합니다.",
        ],
        valueSummary: "2(+공격력의 3/3.25/3.5/3.75/4%)% → 2(+공격력의 4/4.25/4.5/4.75/5%)%",
      },
    ],
  },
  // 코렐라인 (87)
  {
    characterCode: 87,
    patch: "11.3",
    changes: [
      {
        target: "단죄의 섬광(Q) - 거울 강화 시 투사체 속도",
        changeType: "nerf",
        description: [
          "코렐라인은 상위권 실력대에서 높은 선택률과 우수한 성과를 기록하고 있으며, 거울로 강화된 단죄의 섬광은 빠른 투사체 속도로 인해 대응의 여지가 부족해 투사체 속도를 소폭 하향합니다.",
        ],
        valueSummary: "16m/s → 15m/s",
      },
    ],
  },
  // 프리야 (51)
  {
    characterCode: 51,
    patch: "11.3",
    changes: [
      {
        target: "프리비티의 노래(E) - 피해량",
        changeType: "buff",
        description: [
          "프리야는 현재 피해 능력이 다소 부족한 모습을 보이고 있어, 프리비티의 노래의 피해량 계수를 상향하여 근접 교전 상황에서 스킬을 적중시켰을 때의 리턴을 강화합니다.",
        ],
        valueSummary: "60/90/120/150/180(+스킬 증폭의 60%) → 60/90/120/150/180(+스킬 증폭의 65%)",
      },
    ],
  },
  // 피오라 (3)
  {
    characterCode: 3,
    patch: "11.3",
    changes: [
      {
        target: "아따끄 꽁뽀제(W) - 피해량",
        changeType: "nerf",
        description: [
          "피오라는 지속적으로 높은 성과를 기록하고 있어, 상대하는 입장에서 회피가 어려운 아따끄 꽁뽀제의 피해량을 하향하여 과도한 교전 능력을 견제합니다.",
        ],
        valueSummary: "40/75/110/145/180(+스킬 증폭의 30%) → 30/65/100/135/170(+스킬 증폭의 30%)",
      },
    ],
  },
  // 피올로 (56)
  {
    characterCode: 56,
    patch: "11.3",
    changes: [
      {
        target: "쌍절난격&내려치기(Q) - 내려치기(Q2) 중앙 피해량",
        changeType: "nerf",
        description: [
          "피올로는 모든 구간에서 높은 성과를 기록하고 있어, 내려치기와 휘두르기의 위력을 하향하여 전반적인 위력을 견제합니다.",
        ],
        valueSummary: "60/95/130/165/200(+스킬 증폭의 85%) → 50/80/110/140/170(+스킬 증폭의 85%)",
      },
      {
        target: "튕겨내기&휘두르기(W) - 휘두르기(W2) 피해량",
        changeType: "nerf",
        description: ["휘두르기의 위력을 하향하여 전반적인 위력을 견제합니다."],
        valueSummary: "90/135/180/225/270(+스킬 증폭의 85%) → 70/115/160/205/250(+스킬 증폭의 85%)",
      },
    ],
  },
  // 하트 (8)
  {
    characterCode: 8,
    patch: "11.3",
    changes: [
      {
        target: "레벨 당 공격력",
        changeType: "buff",
        description: [
          "하트는 부진한 지표를 기록하고 있어, 레벨 당 공격력을 상향하여 게임 후반부의 교전 능력을 보완합니다.",
        ],
        valueSummary: "4.2 → 4.4",
      },
    ],
  },
  // 헨리 (83)
  {
    characterCode: 83,
    patch: "11.3",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "nerf",
        description: [
          "헨리는 뛰어난 안정성을 바탕으로 매우 높은 지표를 기록하고 있어, 레벨 당 체력을 낮추어 생존 능력을 견제하고 교전 상황에서 보다 신중한 플레이가 요구되도록 합니다.",
        ],
        valueSummary: "81 → 78",
      },
    ],
  },
];
