import type { CharacterPatchNote } from "./10.1";

// Official 2026-10-15 Lumia Island changes; unchanged coefficients are omitted.
// https://playeternalreturn.com/posts/news/3898
export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 6,
    patch: "12.6",
    changes: [
      {
        target: "황소의 눈(Q) · 최소/최대 스킬 증폭 계수",
        changeType: "buff",
        valueSummary: "65% / 130% → 70% / 140%",
        description: [],
      },
    ],
  },
  {
    characterCode: 74,
    patch: "12.6",
    changes: [
      {
        target: "수금(W) · 보호막 공격력 계수",
        changeType: "buff",
        valueSummary: "55% → 65%",
        description: [],
      },
      {
        target: "추심(E) · 공격력 계수",
        changeType: "buff",
        valueSummary: "85% → 95%",
        description: [],
      },
    ],
  },
  {
    characterCode: 65,
    patch: "12.6",
    changes: [
      {
        target: "휠 댄스(데비 W) · 대상 최대 체력 계수",
        changeType: "nerf",
        valueSummary: "5/5.5/6/6.5/7% → 4/4.5/5/5.5/6%",
        description: [],
      },
    ],
  },
  {
    characterCode: 47,
    patch: "12.6",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        valueSummary: "51 → 52",
        description: [],
      },
      {
        target: "예고장(W) · 회복 스킬 증폭 계수",
        changeType: "buff",
        valueSummary: "8% → 10%",
        description: [],
      },
    ],
  },
  {
    characterCode: 21,
    patch: "12.6",
    changes: [
      {
        target: "더블샷(P) · 2타 공격력 계수",
        changeType: "buff",
        valueSummary: "50/55/60% → 55/60/65%",
        description: [],
      },
    ],
  },
  {
    characterCode: 90,
    patch: "12.6",
    changes: [
      {
        target: "저격총 숙련도 · 레벨당 공격 속도",
        changeType: "buff",
        valueSummary: "4% → 4.5%",
        description: [],
        weaponMasteryCode: 11,
      },
      {
        target: "저격총 숙련도 · 레벨당 스킬 증폭",
        changeType: "buff",
        valueSummary: "4.2% → 4.3%",
        description: [],
        weaponMasteryCode: 11,
      },
      {
        target: "무엄하시네요!(E) · 이동 거리",
        changeType: "buff",
        valueSummary: "3m → 3.5m",
        description: [],
      },
    ],
  },
  {
    characterCode: 10,
    patch: "12.6",
    changes: [
      {
        target: "호연각(Q) · 공격력 계수",
        changeType: "buff",
        valueSummary: "70% → 80%",
        description: [],
      },
      {
        target: "호연각(Q) · 취권 강화 피해",
        changeType: "buff",
        valueSummary: "40/65/90/115/140(+공격력의 85%) → 30/60/90/120/150(+공격력의 95%)",
        description: [],
      },
      {
        target: "술 마시기(W) · 받는 스킬 피해 감소",
        changeType: "buff",
        valueSummary: "45/50/55/60/65% → 50/55/60/65/70%",
        description: [],
      },
    ],
  },
  {
    characterCode: 45,
    patch: "12.6",
    changes: [
      {
        target: "드레이프(Q) · 이동 속도 감소",
        changeType: "buff",
        valueSummary: "10/15/20/25/30% → 15/20/25/30/35%",
        description: [],
      },
    ],
  },
  {
    characterCode: 4,
    patch: "12.6",
    changes: [
      {
        target: "폭주 바이크(R) · 기본 피해",
        changeType: "buff",
        valueSummary: "100/250/400 → 100/300/500",
        description: [],
      },
    ],
  },
  {
    characterCode: 26,
    patch: "12.6",
    changes: [
      {
        target: "권총 숙련도 · 레벨당 스킬 증폭",
        changeType: "buff",
        valueSummary: "4.4% → 4.5%",
        description: [],
        weaponMasteryCode: 9,
      },
      {
        target: "광자력 수류탄(RE) · 지속 피해 스킬 증폭 계수",
        changeType: "buff",
        valueSummary: "15% → 18%",
        description: [],
      },
    ],
  },
  {
    characterCode: 84,
    patch: "12.6",
    changes: [
      {
        target: "쌍검 숙련도 · 레벨당 기본 공격 증폭",
        changeType: "nerf",
        valueSummary: "1.6% → 1.5%",
        description: [],
        weaponMasteryCode: 18,
      },
    ],
  },
  {
    characterCode: 88,
    patch: "12.6",
    changes: [
      {
        target: "도깨비 불(P) · 대상 최대 체력 계수",
        changeType: "nerf",
        valueSummary: "1/2/3% → 0.8/1.6/2.4%",
        description: [],
      },
      {
        target: "내기 한판!(E) · 기본 피해",
        changeType: "nerf",
        valueSummary: "80/110/140/170/200 → 60/90/120/150/180",
        description: [],
      },
    ],
  },
  {
    characterCode: 91,
    patch: "12.6",
    changes: [
      {
        target: "빛에게 바치는 맹세(R) · 보호막 최대 체력 계수",
        changeType: "nerf",
        valueSummary: "1.2% → 1%",
        description: [],
      },
    ],
  },
  {
    characterCode: 43,
    patch: "12.6",
    changes: [
      {
        target: "플라즈마 폭탄(Q) · 기본 피해",
        changeType: "nerf",
        valueSummary: "80/105/130/155/180 → 70/95/120/145/170",
        description: [],
      },
    ],
  },
  {
    characterCode: 13,
    patch: "12.6",
    changes: [
      {
        target: "레벨당 방어력",
        changeType: "nerf",
        valueSummary: "3.4 → 3.2",
        description: [],
      },
    ],
  },
  {
    characterCode: 28,
    patch: "12.6",
    changes: [
      {
        target: "마음의 양식(P) · 입힌 피해량 비례 회복",
        changeType: "buff",
        valueSummary: "35% → 40%",
        description: [],
      },
    ],
  },
  {
    characterCode: 82,
    patch: "12.6",
    changes: [
      {
        target: "결심응진(P) · 회복 공격력 계수",
        changeType: "buff",
        valueSummary: "40% → 50%",
        description: [],
      },
    ],
  },
  {
    characterCode: 52,
    patch: "12.6",
    changes: [
      {
        target: "아르카나 숙련도 · 레벨당 스킬 증폭",
        changeType: "buff",
        valueSummary: "4.4% → 4.5%",
        description: [],
        weaponMasteryCode: 24,
      },
      {
        target: "폴 디그니티(E) · 별 컨정션 회복",
        changeType: "buff",
        valueSummary: "20/30/40/50(+스킬 증폭의 6%) → 26/36/46/56(+스킬 증폭의 7%)",
        description: [],
      },
    ],
  },
  {
    characterCode: 66,
    patch: "12.6",
    changes: [
      {
        target: "바빌론의 입방체(W) · 1타 피해 (RW 포함)",
        changeType: "buff",
        valueSummary: "60/80/100/120/140(+스킬 증폭의 50%) → 70/90/110/130/150(+스킬 증폭의 55%)",
        description: [],
      },
    ],
  },
  {
    characterCode: 9,
    patch: "12.6",
    changes: [
      {
        target: "Mok제 폭탄(R) · 공격력 / 스킬 증폭 계수",
        changeType: "buff",
        valueSummary: "40% / 70% → 50% / 75%",
        description: [],
      },
    ],
  },
  {
    characterCode: 59,
    patch: "12.6",
    changes: [
      {
        target: "경화(W) · 착취 발동 시 기본 스킬 쿨다운 감소",
        changeType: "buff",
        valueSummary: "25% → 30%",
        description: [],
      },
    ],
  },
  {
    characterCode: 36,
    patch: "12.6",
    changes: [
      {
        target: "자수정의 물결(E) · 이동 속도 증가",
        changeType: "nerf",
        valueSummary: "120/125/130/135/140% → 110/115/120/125/130%",
        description: [],
      },
    ],
  },
  {
    characterCode: 70,
    patch: "12.6",
    changes: [
      {
        target: "제비걸음(W) · 공격 속도 증가",
        changeType: "buff",
        valueSummary: "15/20/25/30/35% → 20/25/30/35/40%",
        description: [],
      },
    ],
  },
  {
    characterCode: 71,
    patch: "12.6",
    changes: [
      {
        target: "분노의 일격(Q) · 기본 피해",
        changeType: "nerf",
        valueSummary: "30/40/50/60/70 → 10/20/30/40/50",
        description: [],
      },
      {
        target: "분노의 일격(Q) · 잃은 체력 비례 회복",
        changeType: "nerf",
        valueSummary: "10% (최대 25%) → 8% (최대 20%)",
        description: [],
      },
      {
        target: "맹공격(E) · 기본 피해",
        changeType: "nerf",
        valueSummary: "8/16/24/32/40 → 4/8/12/16/20",
        description: [],
      },
    ],
  },
  {
    characterCode: 60,
    patch: "12.6",
    changes: [
      {
        target: "프리치아(E) · 보호막 스킬 증폭 계수",
        changeType: "buff",
        valueSummary: "35% → 40%",
        description: [],
      },
    ],
  },
  {
    characterCode: 62,
    patch: "12.6",
    changes: [
      {
        target: "저격총 숙련도 · 레벨당 스킬 증폭",
        changeType: "buff",
        valueSummary: "4.1% → 4.2%",
        description: [],
        weaponMasteryCode: 11,
      },
      {
        target: "스파크탄(E) · 이동 속도 감소",
        changeType: "buff",
        valueSummary: "2/4/6/8/10% → 12/14/16/18/20%",
        description: [],
      },
    ],
  },
  {
    characterCode: 51,
    patch: "12.6",
    changes: [
      {
        target: "기타 숙련도 · 레벨당 스킬 증폭",
        changeType: "buff",
        valueSummary: "4.4% → 4.6%",
        description: [],
        weaponMasteryCode: 22,
      },
    ],
  },
  {
    characterCode: 83,
    patch: "12.6",
    changes: [
      {
        target: "시간 제어 장치(W) · 쿨다운",
        changeType: "nerf",
        valueSummary: "11초 → 12초",
        description: [],
      },
    ],
  },
];
