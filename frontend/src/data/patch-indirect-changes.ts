import type { PatchChange } from "./patch-notes";

// Official 12.3 values. Character/weapon links come from PATCH_TIER_FORECAST_REASONS,
// not inferred from equipment availability. Traits are conditional, shared context.
export const INDIRECT_PATCH_SOURCE = "https://playeternalreturn.com/posts/news/3813?hl=ko-KR";
const change = (
  target: string,
  changeType: PatchChange["changeType"],
  valueSummary: string
): PatchChange => ({ target, changeType, valueSummary, description: [] });
const ITEMS: Record<string, PatchChange[]> = {
  frost: [change("서리바람 흉갑 · 돌풍-한기 둔화", "nerf", "25% → 20%")],
  moon: [change("요명월 · 방어력", "nerf", "10 → 8")],
  cyber: [
    change(
      "사이버 스토커 · 테이저 건 피해량",
      "nerf",
      "30(+스킬 증폭의 25%) → 30(+스킬 증폭의 20%)"
    ),
  ],
  thorn: [
    change("필드 쏜 · 고유 장착 효과", "rework", "징벌 → 신속-산들바람"),
    change(
      "필드 쏜 · 신속-산들바람 (신규)",
      "rework",
      "4초 내 기본 공격·개별 스킬 3회 적중 시 2.5초간 이동 속도 +15%, 보호막 100(+스킬 증폭의 30%)(+레벨×5). 쿨다운 12초"
    ),
  ],
  soul: [
    change("소울 리퍼 · 이동 속도 증가", "nerf", "24% → 20%"),
    change("소울 리퍼 · 공격력 증가", "nerf", "14% → 12%"),
  ],
  maharaja: [
    change("마하라자 · 이동 속도 증가", "nerf", "24% → 20%"),
    change("마하라자 · 공격력 증가", "nerf", "12% → 10%"),
  ],
  knife: [
    change("초진동나이프 · 공격력", "nerf", "58 → 54"),
    change("초진동나이프 · 공격 속도", "nerf", "30% → 25%"),
  ],
  frag: [change("프라가라흐 · 공격 속도", "nerf", "50% → 40%")],
};
const FORECAST_ITEM_LINKS: Record<string, string[]> = {
  "76:3": ["frost"],
  "45:4": ["frost"],
  "50:21": ["thorn"],
  "33:1": ["moon"],
  "88:3": ["frost"],
  "28:3": ["cyber"],
  "11:16": ["frost"],
  "63:15": ["soul", "maharaja"],
  "1:15": ["soul", "maharaja", "knife", "frag"],
  "37:15": ["soul", "maharaja"],
  "23:18": ["cyber"],
  "89:9": ["cyber"],
};
export function getForecastItemChanges(
  patch: string,
  characterCode: number,
  weaponCode: number
): PatchChange[] {
  if (patch !== "12.3") return [];
  return (FORECAST_ITEM_LINKS[`${characterCode}:${weaponCode}`] ?? []).flatMap((key) => ITEMS[key]);
}
export function getSharedTraitChanges(patch: string): PatchChange[] {
  if (patch !== "12.3") return [];
  return [
    change("불괴 · 근거리 받는 피해 감소", "nerf", "12(+캐릭터 레벨×1)% → 10(+캐릭터 레벨×1)%"),
    change("불괴 · 근거리 방해 효과 저항", "nerf", "25(+방어력의 15%)% → 20(+방어력의 15%)%"),
    change("불괴 · 원거리 방해 효과 저항", "nerf", "18(+방어력의 15%)% → 12(+방어력의 15%)%"),
    change("폭발 선인장 · 스스로 터졌을 때 피해량 감소", "buff", "70% → 50%"),
    change("초재생 · 보호막 및 체력 회복량 증가", "buff", "5% → 6%"),
  ];
}
