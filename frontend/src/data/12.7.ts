import type { ChangeType, CharacterPatchNote, PatchChange } from "./10.1";

// Official 2026-10-29 Lumia Island balance changes. Cobalt-only modifiers are excluded.
// https://playeternalreturn.com/posts/news/3924?hl=ko-KR
const change = (
  target: string,
  changeType: ChangeType,
  valueSummary: string,
  weaponMasteryCode?: number
): PatchChange => ({ target, changeType, valueSummary, description: [], weaponMasteryCode });

const note = (characterCode: number, changes: PatchChange[]): CharacterPatchNote => ({
  characterCode,
  patch: "12.7",
  changes,
});

export const PATCH_NOTES: CharacterPatchNote[] = [
  note(34, [change("스냅샷(Q) · 스킬 증폭 계수", "buff", "80% → 85%")]), // 나타폰
  note(69, [
    change(
      "뿅! 망치(W) · 이동 속도 증가",
      "rework",
      "12/14/16/18/20%(+스킬 증폭 2.5%) → 7/9/11/13/15%(+스킬 증폭 3.5%)"
    ),
    change("에어 호른! 건(E) · 보호막", "rework", "레벨당 3 → 2, 스킬 증폭 계수 25% → 30%"),
  ]), // 레니
  note(90, [change("찬란한 낭만(EQ) · 스킬 증폭 계수", "nerf", "80% → 75%")]), // 루치아
  note(31, [change("기본 체력", "nerf", "930 → 900")]), // 리오
  note(53, [change("전투 교범(Q) · 추가 체력 계수", "nerf", "18% → 16%")]), // 마커스
  note(64, [change("몽환 나비(P) · 보호막", "buff", "30/60/90 → 40/75/110")]), // 바냐
  note(25, [change("기본 공격력", "buff", "37 → 40")]), // 버니스
  note(84, [
    change(
      "이중 참격(쌍검 Q) · 2타 피해",
      "nerf",
      "20/50/80/110/140(+추가 공격력 90/100/110/120/130%) → 10/40/70/100/130(+추가 공격력 80/90/100/110/120%)",
      18
    ),
  ]), // 블레어
  note(82, [change("무진검결(W) · 기절 지속 시간", "buff", "1초 → 1.2초")]), // 슈린
  note(24, [change("방망이 숙련도 · 레벨당 스킬 증폭", "nerf", "4.6% → 4.5%", 3)]), // 아델라
  note(66, [
    change("유물 탐구(P) · 회복 스킬 증폭 계수", "buff", "10% → 12%"),
    change("님루드의 문(RE) · 지속 시간", "nerf", "5초 → 4초"),
  ]), // 아르다
  note(67, [change("워프 슬래시(E) · 기본 피해", "buff", "70/85/100/115/130 → 70/95/120/145/170")]), // 아비게일
  note(2, [change("돌격 소총 숙련도 · 레벨당 기본 공격 증폭", "buff", "1.4% → 1.5%", 10)]), // 아야
  note(55, [
    change("헬기호출(R) · 자신 보호막의 잃은 체력 계수", "buff", "20% → 25%"),
    change("헬기호출(R) · 아군 보호막 기본값", "buff", "100/200/300 → 150/250/350"),
  ]), // 에스텔
  note(50, [change("레벨당 방어력", "nerf", "3.3 → 3.2")]), // 엘레나
  note(63, [change("레벨당 체력", "nerf", "91 → 88")]), // 이안
  note(30, [
    change(
      "자~ 집중!(W) · 최소 도발 지속 시간",
      "buff",
      "0.4/0.5/0.6/0.7/0.8초 → 0.5/0.6/0.7/0.8/0.9초"
    ),
    change(
      "자~ 집중!(W) · 최대 도발 지속 시간",
      "buff",
      "0.8/1/1.2/1.4/1.6초 → 1/1.2/1.4/1.6/1.8초"
    ),
  ]), // 일레븐
  note(70, [change("제비걸음(W) · 공격 속도 증가", "buff", "20/25/30/35/40% → 25/30/35/40/45%")]), // 츠바메
  note(72, [change("저격총 숙련도 · 레벨당 기본 공격 증폭", "nerf", "2% → 1.9%", 11)]), // 카티야
  note(89, [
    change("백플립(마탄 W) · 스킬 증폭 계수", "buff", "85% → 90%"),
    change("컴뱃 롤(E) · 실험체 적중 시 쿨다운 감소", "buff", "20% → 25%"),
  ]), // 크레이버
  note(60, [change("암기 숙련도 · 레벨당 스킬 증폭", "nerf", "4.5% → 4.4%", 6)]), // 타지아
  note(3, [change("창 숙련도 · 레벨당 스킬 증폭", "nerf", "5% → 4.8%", 19)]), // 피오라
  note(58, [
    change("엑셀러레이션 로켓(RQ) · 기본 피해", "buff", "80/110/140/170/200 → 100/130/160/190/220"),
  ]), // 헤이즈
  note(83, [change("레벨당 체력", "nerf", "78 → 75")]), // 헨리
  note(7, [
    change("발 밟기(Q) · 추가 공격력 계수", "buff", "60% → 90%"),
    change("핵펀치(R) · 최소 피해 추가 공격력 계수", "buff", "35% → 50%"),
    change("핵펀치(R) · 최대 피해 추가 공격력 계수", "buff", "105% → 150%"),
  ]), // 현우
  note(78, [change("일섬(W2) · 에어본 지속 시간", "buff", "0.5초 → 0.6초")]), // 히스이
];
