export const PATCH_12_7_SOURCE = "https://playeternalreturn.com/posts/news/3924?hl=ko-KR";

export interface EquipmentChange {
  code: number;
  name: string;
  direction: "buff" | "nerf" | "rework";
  changes: string[];
  note?: string;
}

export const FEATURED_EQUIPMENT: EquipmentChange[] = [
  {
    code: 202526,
    name: "이단심판관",
    direction: "buff",
    changes: ["차원 균열 피해량 12(+스킬 증폭의 4%) → 12(+스킬 증폭의 5%)"],
    note: "궁극기 피해로 부여하는 차원 불안정의 지속 피해가 강화됩니다.",
  },
  {
    code: 203511,
    name: "서슬가시 체인",
    direction: "buff",
    changes: ["방어 관통 12 → 13"],
  },
];

export const COMMON_CHANGES = [
  { name: "진실의 칼날", type: "전술 스킬 · 상향", value: "쿨다운 10/8초 → 9/7초" },
];

export const QUALITY_CHANGES = [
  {
    title: "갬빗 잠금",
    text: "12.7부터 갬빗 기능을 사용할 수 없습니다. 재개 일정은 추후 패치노트에서 안내됩니다.",
  },
  {
    title: "아시아 최상위 매칭 기준",
    text: "아시아 최상위 큐의 기준이 8,800점 이상으로 조정됩니다.",
  },
  {
    title: "이스포츠 스케줄러 개선",
    text: "진행 중인 대회 표시, 드래그로 일정 이동, 직전 시즌 일정과 결과 클릭 확인 기능이 추가됩니다.",
  },
  {
    title: "사냥꾼의 솥단지 스킨",
    text: "보관함 → 기타 → 인게임 치장에서 설정할 수 있습니다. 솥단지를 설치한 생존자의 스킨이 적용되며 획득 음식은 그대로입니다.",
  },
  {
    title: "신규 스킨·이모티콘",
    text: "와일드 웨스트 크레이버(희귀) 스킨과 에이든 이모티콘 4종이 출시됩니다.",
  },
  {
    title: "인벤토리 제작창 설정",
    text: "인벤토리 아이템을 우클릭할 때 제작창이 열리지 않도록 설정하는 옵션이 추가됩니다.",
  },
];

export const FIXES = [
  "아이템 스킬 초집중 중첩이 특정 상황에서 줄지 않던 문제 수정",
  "연장 총열의 쿨다운이 기본 공격 모션 종료와 적중 시 두 번 적용되던 문제 수정",
  "전자기 충격이 쿨다운 중에도 충전 중첩을 얻던 문제 수정",
  "창 무기 스킬 그림자 찌르기(D)가 최대 사거리 적중 시 에어본을 적용하지 않던 문제 수정",
  "단검 무기 스킬 망토와 단검(D)이 기존 명령을 취소하던 문제 수정",
];
