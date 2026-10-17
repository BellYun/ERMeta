export const PATCH_12_6_SOURCE = "https://playeternalreturn.com/posts/news/3898?hl=ko-KR";
export interface EquipmentChange {
  code: number;
  name: string;
  direction: "buff" | "nerf" | "rework";
  changes: string[];
  note?: string;
}
export const FEATURED_EQUIPMENT: EquipmentChange[] = [
  {
    code: 105407,
    name: "저거너트",
    direction: "nerf",
    changes: ["중첩당 공격 속도 12% → 8%", "최대 중첩 3 → 4", "최대 중첩 공격력 12 → 10"],
    note: "열정: 최대 중첩 공속도 36%에서 32%로 감소합니다.",
  },
  {
    code: 108505,
    name: "시체매",
    direction: "nerf",
    changes: ["중첩당 공격 속도 12% → 8%", "최대 중첩 3 → 4", "최대 중첩 공격력 12 → 10"],
    note: "열정: 최대 중첩까지 필요한 중첩이 늘어납니다.",
  },
  {
    code: 203408,
    name: "큐브 워치",
    direction: "rework",
    changes: ["공격력 15 → 10", "치명타 피해량 4% 신규"],
    note: "공격력을 낮추고 치명타 피해 옵션을 추가합니다.",
  },
  {
    code: 203516,
    name: "파프니르",
    direction: "nerf",
    changes: ["중첩 획득에 필요한 누적 피해 350 → 400", "최대 중첩 이동 속도 10% → 8%"],
    note: "중첩 조건과 최대 중첩 보상이 함께 하향됩니다.",
  },
  {
    code: 201506,
    name: "황야의 별",
    direction: "buff",
    changes: ["공격 속도 40% → 42%", "유도 바늘 공격력 계수 65% → 70%"],
    note: "기본 능력치와 고유 효과를 함께 강화합니다.",
  },
  {
    code: 202511,
    name: "핏빛 망토",
    direction: "buff",
    changes: ["부패 대상 최대 체력 기본 계수 1.2% → 1.3%"],
    note: "스킬 증폭 계수는 유지됩니다.",
  },
  {
    code: 201507,
    name: "우주 비행사의 헬멧",
    direction: "buff",
    changes: ["부패 대상 최대 체력 기본 계수 1.2% → 1.3%"],
    note: "스킬 증폭 계수는 유지됩니다.",
  },
];
export const OTHER_EQUIPMENT: EquipmentChange[] = [
  { code: 202509, name: "선녀강림", direction: "buff", changes: ["공격 속도 40% → 42%"] },
  { code: 701451, name: "택티컬 바이저", direction: "buff", changes: ["최대 체력 220 → 250"] },
  {
    code: 201701,
    name: "핏빛 왕관",
    direction: "buff",
    changes: ["개시 공격 속도 증가 15% → 20%"],
  },
  { code: 205407, name: "미스릴 퀴버", direction: "buff", changes: ["공격력 30 → 33"] },
  { code: 205508, name: "에메랄드 타블렛", direction: "buff", changes: ["스킬 증폭 85 → 88"] },
  { code: 203513, name: "헬릭스", direction: "buff", changes: ["방어력 20 → 22"] },
  { code: 204509, name: "레이싱 부츠", direction: "buff", changes: ["공격 속도 26% → 28%"] },
  { code: 204511, name: "로즈 스텝", direction: "buff", changes: ["각성 방어 관통 10% → 12%"] },
  { code: 204510, name: "엘디안 부츠", direction: "buff", changes: ["공격력 17 → 18"] },
  {
    code: 202525,
    name: "현자의 로브",
    direction: "nerf",
    changes: ["각성 이동 속도 증가 12% → 10%"],
  },
  {
    code: 201537,
    name: "야생의 허기",
    direction: "nerf",
    changes: ["포식 추가 체력 계수 12% → 10%"],
  },
  { code: 705619, name: "별 조각", direction: "nerf", changes: ["스킬 증폭 80 → 77"] },
  { code: 705607, name: "토템", direction: "nerf", changes: ["쿨다운 감소 15 → 10"] },
];
export const COMMON_CHANGES = [
  { name: "액셀러레이터", type: "특성 · 상향", value: "공격 속도 증가 120% → 130%" },
  { name: "폭발 선인장", type: "특성 · 상향", value: "대상 최대 체력 계수 6% → 7%" },
  {
    name: "강한 결속",
    type: "전술 스킬 · 조정",
    value: "잃어버린 체력당 에너지 획득 1.5/1.2% → 2/1.5%",
  },
  {
    name: "방망이 · 풀스윙(D)",
    type: "무기 스킬 · 하향",
    value: "기절 0.8/0.9/1초 → 0.7/0.8/0.9초",
  },
  { name: "투척 · 연막탄(D)", type: "무기 스킬 · 하향", value: "2차 둔화 30/35/40% → 20/25/30%" },
];
export const QUALITY_CHANGES = [
  {
    title: "막금구에서도 지역 내부 이동",
    text: "연못·바지선 지역 내부를 이동하는 점프 패들은 임시 안전 지대에서도 활성화됩니다. 다른 점프 패들은 기존처럼 비활성화됩니다.",
  },
  {
    title: "크로노 스피어 위치 조정",
    text: "창고·연못에서 지역 경계에 지나치게 가까웠던 일부 스폰 포인트가 조정됩니다.",
  },
  {
    title: "퀵슬롯 보유 개수 공유",
    text: "퀵슬롯 아이템에 Alt + 좌클릭하면 이름과 보유 개수가 시스템 채팅에 표시됩니다.",
  },
  {
    title: "전설 장비 제작 순서 설정",
    text: "설정 → 게임 → 제작 순서 세부 설정에서 ‘전설 등급 이상은 목표 아이템 순서대로 제작’을 선택할 수 있습니다.",
  },
  {
    title: "매칭 중에도 상점 이용",
    text: "A-Coin·NP 등 게임 재화와 교환소 상품을 구매할 수 있습니다. 현금 결제 상품은 기존처럼 매칭 중 구매할 수 없습니다.",
  },
  {
    title: "이벤트 미션 만료 안내",
    text: "로그인 시 진행 중인 이벤트 미션과 가장 먼저 만료되는 미션의 남은 시간을 안내합니다.",
  },
  {
    title: "갬빗 결과를 대전 기록에",
    text: "갬빗 획득 점수에 따라 !!, !, ?, ?? 기보 기호가 표시되며 마우스를 올리면 툴팁을 확인할 수 있습니다.",
  },
];
export const FIXES = [
  "에키온: 데스에더 VF 폭주 중 R이 빗나가도 폭주 시간이 연장되던 문제 수정",
  "일부 아이템 스킬: 근거리 상태에서 피해가 툴팁과 다르게 적용되던 문제 수정",
  "일반 대전: 카메라 파괴 시 크레딧이 지급되지 않던 문제 수정",
  "재키: E의 출발·도착 위치가 같을 때 피해가 즉시 적용되던 문제 수정",
  "펜리르: 불사 상태의 공포 효과가 올바른 시점에 발동하지 않던 문제 수정",
  "일부 게임의 리플레이를 재생할 수 없던 문제 수정",
];
