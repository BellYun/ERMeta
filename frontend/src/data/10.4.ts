import type { CharacterPatchNote } from "./10.1"

export const PATCH_NOTES: CharacterPatchNote[] = [
  {
    characterCode: 76, // 가넷
    patch: "10.4",
    changes: [
      {
        target: "짓뭉개기&꿰뚫기(Q) - 짓뭉개기 피해량",
        changeType: "buff",
        description: ["짓뭉개기 피해량의 최대 체력 비례 계수가 증가했습니다."],
        valueSummary: "40/65/90/115/140(+스킬 증폭의 50%)(+최대 체력의 5%) → 40/65/90/115/140(+스킬 증폭의 50%)(+최대 체력의 6%)",
      },
      {
        target: "짓뭉개기&꿰뚫기(Q) - 꿰뚫기 피해량",
        changeType: "buff",
        description: ["꿰뚫기 피해량의 최대 체력 비례 계수가 증가했습니다."],
        valueSummary: "50/75/100/125/150(+스킬 증폭의 50%)(+최대 체력의 6%) → 50/75/100/125/150(+스킬 증폭의 50%)(+최대 체력의 7%)",
      },
      {
        target: "그릇된 집착(E) - 사거리",
        changeType: "buff",
        description: ["사거리가 증가했습니다."],
        valueSummary: "4.5m → 5m",
      },
    ],
  },
  {
    characterCode: 6, // 나딘
    patch: "10.4",
    changes: [
      {
        target: "야성(P) - 최대 야성 중첩 수",
        changeType: "buff",
        description: ["최대 야성 중첩 수가 증가했습니다."],
        valueSummary: "200 → 250",
      },
    ],
  },
  {
    characterCode: 33, // 니키
    patch: "10.4",
    changes: [
      {
        target: "레벨 당 방어력",
        changeType: "buff",
        description: ["레벨 당 방어력이 증가했습니다."],
        valueSummary: "3.4 → 3.5",
      },
      {
        target: "격투 액션(Q) - 최소 피해량",
        changeType: "buff",
        description: ["최소 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "30/50/70/90/110(+스킬 증폭의 65%) → 30/50/70/90/110(+스킬 증폭의 70%)",
      },
      {
        target: "격투 액션(Q) - 최대 피해량",
        changeType: "buff",
        description: ["최대 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "60/100/140/180/220(+스킬 증폭의 130%) → 60/100/140/180/220(+스킬 증폭의 140%)",
      },
    ],
  },
  {
    characterCode: 74, // 다르코
    patch: "10.4",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "48 → 51",
      },
    ],
  },
  {
    characterCode: 65, // 데비&마를렌
    patch: "10.4",
    changes: [
      {
        target: "블루&레드(P) - 데비 상태 방어력 증가",
        changeType: "buff",
        description: ["데비 상태 방어력 증가 수치가 증가했습니다."],
        valueSummary: "4/8/12 → 5/10/15",
      },
      {
        target: "크레센트 댄스(마를렌 W) - 피해량",
        changeType: "buff",
        description: ["피해량의 추가 공격력 계수가 증가했습니다."],
        valueSummary: "15/30/45/60/75(+추가 공격력의 45%) → 15/30/45/60/75(+추가 공격력의 50%)",
      },
    ],
  },
  {
    characterCode: 47, // 라우라
    patch: "10.4",
    changes: [
      {
        target: "황혼의 도둑(R) - 2타 피해량",
        changeType: "buff",
        description: ["2타 피해량과 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "170/250/330(+스킬 증폭의 80%) → 180/260/340(+스킬 증폭의 85%)",
      },
    ],
  },
  {
    characterCode: 69, // 레니
    patch: "10.4",
    changes: [
      {
        target: "뿅!망치(W) - 이동 속도 증가",
        changeType: "nerf",
        description: ["레벨 당 이동 속도 증가 계수가 감소했습니다."],
        valueSummary: "16/17/18/19/20(+레니 레벨*1.5)% → 16/17/18/19/20(+레니 레벨*1)%",
      },
    ],
  },
  {
    characterCode: 29, // 레온
    patch: "10.4",
    changes: [
      {
        target: "물길(Q) - 피해량",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "80/115/150/185/220(+스킬 증폭의 75%) → 80/115/150/185/220(+스킬 증폭의 80%)",
      },
      {
        target: "파도타기(R) - 피해량",
        changeType: "buff",
        description: ["피해량과 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "70/120/170(+스킬 증폭의 70%) → 100/150/200(+스킬 증폭의 75%)",
      },
    ],
  },
  {
    characterCode: 21, // 로지
    patch: "10.4",
    changes: [
      {
        target: "권총 무기 숙련도 - 레벨 당 공격 속도",
        changeType: "nerf",
        description: ["권총 무기 숙련도의 레벨 당 공격 속도가 감소했습니다."],
        valueSummary: "4.5% → 4%",
      },
    ],
  },
  {
    characterCode: 57, // 마르티나
    patch: "10.4",
    changes: [
      {
        target: "녹화(R) - 시체 촬영 최대 횟수",
        changeType: "buff",
        description: ["시체 촬영만으로도 방송 중 상태로 전환할 수 있도록 조건이 완화됐습니다."],
        valueSummary: "3회 → 5회",
      },
    ],
  },
  {
    characterCode: 25, // 버니스
    patch: "10.4",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "50 → 52",
      },
    ],
  },
  {
    characterCode: 84, // 블레어
    patch: "10.4",
    changes: [
      {
        target: "반격베기(쌍날검 E) - 연계 공격 보호막량",
        changeType: "nerf",
        description: ["연계 공격 시 보호막 획득량의 추가 공격력 계수가 감소했습니다."],
        valueSummary: "30/50/70/90(+추가 공격력의 50%) → 30/50/70/90(+추가 공격력의 40%)",
      },
    ],
  },
  {
    characterCode: 43, // 셀린
    patch: "10.4",
    changes: [
      {
        target: "폭발물 전문가(P) - 피해량",
        changeType: "buff",
        description: ["저레벨 구간 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "50(+스킬 증폭의 30/55%) → 50(+스킬 증폭의 40/55%)",
      },
    ],
  },
  {
    characterCode: 13, // 쇼우
    patch: "10.4",
    changes: [
      {
        target: "뜨거운 맛(R) - 피해량",
        changeType: "nerf",
        description: ["피해량의 스킬 증폭 계수가 감소했습니다."],
        valueSummary: "60/95/130(+스킬 증폭의 55%)(+최대 체력의 5%) → 60/95/130(+스킬 증폭의 50%)(+최대 체력의 5%)",
      },
    ],
  },
  {
    characterCode: 28, // 수아
    patch: "10.4",
    changes: [
      {
        target: "돈키호테(E) - 이동 속도",
        changeType: "buff",
        description: ["이동 속도가 증가했습니다.", "기억력-돈키호테(RE)에도 동일하게 적용됩니다."],
        valueSummary: "14m/s → 15m/s",
      },
    ],
  },
  {
    characterCode: 82, // 슈린
    patch: "10.4",
    changes: [
      {
        target: "기본 방어력",
        changeType: "buff",
        description: ["기본 방어력이 증가했습니다."],
        valueSummary: "52 → 54",
      },
    ],
  },
  {
    characterCode: 15, // 시셀라
    patch: "10.4",
    changes: [
      {
        target: "나랑 놀자(E) - 피해량",
        changeType: "buff",
        description: ["저레벨 구간 피해량이 증가했습니다."],
        valueSummary: "90/110/130/150/170(+스킬 증폭의 70%) → 110/125/140/155/170(+스킬 증폭의 70%)",
      },
    ],
  },
  {
    characterCode: 24, // 아델라
    patch: "10.4",
    changes: [
      {
        target: "방망이 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["방망이 무기 숙련도의 레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "4.5% → 4.6%",
      },
    ],
  },
  {
    characterCode: 52, // 아디나
    patch: "10.4",
    changes: [
      {
        target: "폴 디그니티(E) - 1타 피해량",
        changeType: "nerf",
        description: ["1타 피해량의 스킬 증폭 계수가 감소했습니다."],
        valueSummary: "40/60/80/100/120(+스킬 증폭의 45%) → 40/60/80/100/120(+스킬 증폭의 40%)",
      },
      {
        target: "폴 디그니티(E) - 2타 피해량",
        changeType: "nerf",
        description: ["2타 피해량의 스킬 증폭 계수가 감소했습니다."],
        valueSummary: "40/60/80/100/120(+스킬 증폭의 45%) → 40/60/80/100/120(+스킬 증폭의 40%)",
      },
      {
        target: "별 천체 체력 회복량",
        changeType: "buff",
        description: ["별 천체의 체력 회복 비율이 증가했습니다."],
        valueSummary: "피해량의 30% → 35%",
      },
    ],
  },
  {
    characterCode: 67, // 아비게일
    patch: "10.4",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["레벨 당 체력이 증가했습니다."],
        valueSummary: "89 → 91",
      },
    ],
  },
  {
    characterCode: 2, // 아야
    patch: "10.4",
    changes: [
      {
        target: "고정 사격(W) - 피해량",
        changeType: "buff",
        description: ["피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "20/30/40/50/60(+스킬 증폭의 28/33/38/43/48%) → 20/30/40/50/60(+스킬 증폭의 30/35/40/45/50%)",
      },
    ],
  },
  {
    characterCode: 9, // 아이솔
    patch: "10.4",
    changes: [
      {
        target: "은밀 기동(E) - 쿨다운",
        changeType: "buff",
        description: ["쿨다운이 감소했습니다."],
        valueSummary: "15/14/13/12/11초 → 14/13/12/11/10초",
      },
    ],
  },
  {
    characterCode: 27, // 알렉스
    patch: "10.4",
    changes: [
      {
        target: "코일건(원거리 Q) - 피해량",
        changeType: "nerf",
        description: ["피해량이 감소했습니다."],
        valueSummary: "40/65/90/115/140(+공격력의 80%) → 40/60/80/100/120(+공격력의 80%)",
      },
    ],
  },
  {
    characterCode: 50, // 엘레나
    patch: "10.4",
    changes: [
      {
        target: "겨울여왕의 영지(P) - 피해량",
        changeType: "rework",
        description: ["기본 피해량이 감소했으나, 대상 최대 체력 비례 피해량이 증가했습니다."],
        valueSummary: "20/40/60(+스킬 증폭의 20%)(+대상 최대 체력의 4/6/8%) → 10/30/50(+스킬 증폭의 20%)(+대상 최대 체력의 6/8/10%)",
      },
    ],
  },
  {
    characterCode: 77, // 유민
    patch: "10.4",
    changes: [
      {
        target: "경운(E) - 적 탐지 범위",
        changeType: "buff",
        description: ["적 탐지 범위가 증가했습니다."],
        valueSummary: "5.5m → 6m",
      },
    ],
  },
  {
    characterCode: 63, // 이안
    patch: "10.4",
    changes: [
      {
        target: "기본 체력",
        changeType: "nerf",
        description: ["기본 체력이 감소했습니다."],
        valueSummary: "1000 → 970",
      },
      {
        target: "해방(R) - 공격 속도 증가",
        changeType: "nerf",
        description: ["공격 속도 증가량이 감소했습니다."],
        valueSummary: "20/30/40(+공격력의 10%)% → 20/25/30(+공격력의 10%)%",
      },
      {
        target: "해방(R) - 쿨다운",
        changeType: "rework",
        description: ["레벨별 쿨다운 분포가 조정됐습니다. (1레벨 단축, 3레벨 증가)"],
        valueSummary: "76/60/44초 → 70/60/50초",
      },
    ],
  },
  {
    characterCode: 5, // 자히르
    patch: "10.4",
    changes: [
      {
        target: "암기 무기 숙련도 - 레벨 당 스킬 증폭",
        changeType: "buff",
        description: ["암기 무기 숙련도의 레벨 당 스킬 증폭이 증가했습니다."],
        valueSummary: "3.8% → 4%",
      },
    ],
  },
  {
    characterCode: 23, // 캐시
    patch: "10.4",
    changes: [
      {
        target: "엠퓨테이션(W) - 강화 피해량",
        changeType: "buff",
        description: ["바깥 범위 강화 피해량의 스킬 증폭 계수가 증가했습니다."],
        valueSummary: "50/100/150/200/250(+스킬 증폭의 90%) → 50/100/150/200/250(+스킬 증폭의 95%)",
      },
    ],
  },
  {
    characterCode: 60, // 타지아
    patch: "10.4",
    changes: [
      {
        target: "레벨 당 체력",
        changeType: "buff",
        description: ["레벨 당 체력이 증가했습니다."],
        valueSummary: "80 → 83",
      },
    ],
  },
  {
    characterCode: 86, // 펜리르
    patch: "10.4",
    changes: [
      {
        target: "찢는 손톱(Q) - 피해량",
        changeType: "nerf",
        description: ["피해량이 감소했습니다."],
        valueSummary: "60/90/120/150/180(+공격력의 90%) → 40/70/100/130/160(+공격력의 90%)",
      },
      {
        target: "찢는 손톱(Q) - 강화 피해량",
        changeType: "nerf",
        description: ["강화 피해량이 감소했습니다."],
        valueSummary: "90/135/180/225/270(+공격력의 135%) → 60/105/150/195/240(+공격력의 135%)",
      },
    ],
  },
  {
    characterCode: 51, // 프리야
    patch: "10.4",
    changes: [
      {
        target: "포르타멘토(W) - 중첩 보호막 감소량",
        changeType: "nerf",
        description: ["보호막이 중첩될 때마다 감소되는 보호막량이 증가했습니다."],
        valueSummary: "40% → 45%",
      },
      {
        target: "대지의 메아리(R) - 스킬 사용 불가 상태",
        changeType: "rework",
        description: ["춤 시작 시 스킬 및 기본 공격 사용 불가 상태 시간이 감소했습니다."],
        valueSummary: "1초 → 0.8초",
      },
      {
        target: "대지의 메아리(R) - 춤 지속 시간",
        changeType: "nerf",
        description: ["춤 지속 시간이 감소했습니다."],
        valueSummary: "1초 → 0.8초",
      },
    ],
  },
  {
    characterCode: 8, // 하트
    patch: "10.4",
    changes: [
      {
        target: "Overdrive(W) - 공격력 증가",
        changeType: "buff",
        description: ["공격력 증가량이 증가했습니다."],
        valueSummary: "4/8/12/16/20 → 5/10/15/20/25",
      },
    ],
  },
  {
    characterCode: 7, // 현우
    patch: "10.4",
    changes: [
      {
        target: "선빵필승(E) - 벽 적중 시 추가 피해량",
        changeType: "buff",
        description: ["벽에 부딪힐 시 추가 피해량의 추가 공격력 계수가 증가했습니다."],
        valueSummary: "80/115/150/185/220(+추가 공격력의 60%)(+스킬 증폭의 90%) → 80/115/150/185/220(+추가 공격력의 75%)(+스킬 증폭의 90%)",
      },
      {
        target: "선빵필승(E) - 기절 지속 시간",
        changeType: "buff",
        description: ["기절 지속 시간이 증가했습니다."],
        valueSummary: "1.2초 → 1.3초",
      },
    ],
  },
]

export function getCharacterPatchNote(
  characterCode: number,
  patch: string
): CharacterPatchNote | undefined {
  return PATCH_NOTES.find(
    (note) => note.characterCode === characterCode && note.patch === patch
  )
}
