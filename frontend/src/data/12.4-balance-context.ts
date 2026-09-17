// Ranked/Lumia Island balance context from the official 12.4 note.
// Cobalt Protocol's separate mode modifiers and cosmetic changes are excluded.
export const PATCH_12_4_SOURCE = "https://playeternalreturn.com/posts/news/3838?hl=ko-KR";

export interface PatchBalanceContextSection {
  title: string;
  entries: readonly { target: string; value: string }[];
}

export const PATCH_12_4_BALANCE_CONTEXT: readonly PatchBalanceContextSection[] = [
  {
    title: "맵·경제·무기 스킬",
    entries: [
      { target: "2일차 낮 생명의 나무 생성 지역", value: "절·호텔·묘지 → 호텔·묘지" },
      { target: "2일차 낮 운석 드랍", value: "2개 → 3개" },
      { target: "크로노 스피어 2차 축소 범위", value: "5m → 4m" },
      { target: "1일차 밤 자연 크레딧 획득", value: "1.5초당 1 → 1.45초당 1" },
      { target: "처치/처치 관여 크레딧", value: "10/6 → 10/8" },
      { target: "VF 의수 · VF 안정화(D)", value: "사용 중 블링크 사용 가능" },
    ],
  },
  {
    title: "특성",
    entries: [
      { target: "도깨비불 · 피해량", value: "60~250 → 80~270 (추가 공격력·스킬 증폭 계수 유지)" },
      { target: "속사 · 지속 시간", value: "5초 → 6초" },
      { target: "폭발 선인장 · 대상 최대 체력 계수", value: "5% → 6%" },
    ],
  },
  {
    title: "무기",
    entries: [
      { target: "글러브 · 소수 공격력", value: "59 → 60" },
      { target: "기타 · 보헤미안 스킬 증폭", value: "70 → 72" },
      { target: "도끼 · 하르페 공격 속도", value: "25% → 30%" },
      { target: "돌격 소총 · 골드 러시 스킬 증폭", value: "78 → 82" },
      { target: "레이피어 · 활빈검 스킬 증폭", value: "69 → 71" },
      { target: "쌍절곤 · 대소반룡곤 스킬 증폭", value: "66 → 68" },
      { target: "암기 · 푸른색 단도 스킬 증폭", value: "64 → 66" },
      { target: "양손검 · 레바테인 공격력", value: "53 → 55" },
      { target: "양손검 · 빛의 검 공격력", value: "69 → 71" },
      { target: "양손검 · 다인슬라이프 - 진홍 공격력", value: "82 → 84" },
      { target: "채찍 · 글레이프니르 스킬 증폭", value: "78 → 82" },
      { target: "채찍 · 뇌룡편 스킬 증폭", value: "65 → 68" },
      { target: "카메라 · 미러리스 스킬 증폭", value: "77 → 80" },
      { target: "카메라 · 컴파운드 사이트 공격력", value: "55 → 58" },
      { target: "투척 · 다비드슬링 공격 속도", value: "20% → 25%" },
      { target: "활 · 제베의 활 공격력", value: "70 → 72" },
      { target: "활 · 트윈보우 공격력", value: "63 → 65" },
    ],
  },
  {
    title: "방어구·강화",
    entries: [
      { target: "옷 · 엘프 드레스 방어력", value: "25 → 28" },
      { target: "옷 · 화령장 공격 속도", value: "30% → 33%" },
      { target: "옷 · 버건디 47 방어력", value: "15 → 18" },
      { target: "머리 · 예언자의 터번 스킬 증폭", value: "80 → 82" },
      { target: "머리 · 쿤달라 스킬 증폭", value: "80 → 82" },
      { target: "머리 · 우주 비행사의 헬멧 스킬 증폭", value: "55 → 57" },
      { target: "머리 · 야생의 허기 포식 추가 체력 회복 계수", value: "10% → 8%" },
      {
        target: "팔 · 월왕구천",
        value: "신규 전설 · 공격력 27, 공격 속도 30%, 치명타 확률 35%, 치유 감소 20%",
      },
      {
        target: "팔 · 별 조각",
        value: "신규 전설 · 방어력 10, 스킬 증폭 85, 최대 체력 250, 쿨다운 감소 15",
      },
      { target: "팔 · 슈뢰딩거의 상자 최대 체력", value: "120 → 150" },
      { target: "팔 · 플라즈마 아크 공격력", value: "20 → 22" },
      { target: "팔 · 임세티 스킬 증폭", value: "90 → 92" },
      { target: "팔 · 해적의 증표 공격력", value: "26 → 28" },
      { target: "팔 · 노바 실드 맞춤형 능력치", value: "43 → 45" },
      { target: "다리 · 갤럭시 스텝 공격력", value: "25 → 23" },
      { target: "다리 · 로즈 스텝 스킬 증폭", value: "45 → 50" },
      { target: "강화 · 캡슐 - 생명 방해 효과 저항", value: "10% → 5%" },
    ],
  },
];
