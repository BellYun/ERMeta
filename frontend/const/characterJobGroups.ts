/**
 * 캐릭터 직업군 분류 (탱커, 전사, 암살자, 스킬딜러, 원거리딜러, 지원가)
 * ER 공식/커뮤니티 분류표가 있으면 해당 데이터로 교체하는 것을 권장합니다.
 */

export const JOB_GROUP = {
  TANK: 'TANK',
  WARRIOR: 'WARRIOR',
  ASSASSIN: 'ASSASSIN',
  SKILL_DEALER: 'SKILL_DEALER',
  RANGED_DEALER: 'RANGED_DEALER',
  SUPPORT: 'SUPPORT',
} as const;

export type JobGroupKey = (typeof JOB_GROUP)[keyof typeof JOB_GROUP];

/** 직업군 표시 라벨 (한국어) */
export const JOB_GROUP_LABELS: Record<JobGroupKey, string> = {
  [JOB_GROUP.TANK]: '탱커',
  [JOB_GROUP.WARRIOR]: '전사',
  [JOB_GROUP.ASSASSIN]: '암살자',
  [JOB_GROUP.SKILL_DEALER]: '스킬딜러',
  [JOB_GROUP.RANGED_DEALER]: '원거리딜러',
  [JOB_GROUP.SUPPORT]: '지원가',
};

/** 직업군 순서 (UI 탭/섹션 표시 순) */
export const JOB_GROUP_ORDER: JobGroupKey[] = [
  JOB_GROUP.TANK,
  JOB_GROUP.WARRIOR,
  JOB_GROUP.ASSASSIN,
  JOB_GROUP.SKILL_DEALER,
  JOB_GROUP.RANGED_DEALER,
  JOB_GROUP.SUPPORT,
];

/**
 * 캐릭터 코드 → 직업군 매핑
 * 세부 직업군이 필요하면 { code, jobGroup, subGroup }[] 형태로 확장 가능
 */
export const CHARACTER_JOB_GROUP_MAP: Record<number, JobGroupKey> = {
  // placeholder: 코드 1~85를 6개 직업군에 순환 배치 (실제 분류로 교체 권장)
  1: JOB_GROUP.WARRIOR,
  2: JOB_GROUP.RANGED_DEALER,
  3: JOB_GROUP.WARRIOR,
  4: JOB_GROUP.TANK,
  5: JOB_GROUP.SKILL_DEALER,
  6: JOB_GROUP.RANGED_DEALER,
  7: JOB_GROUP.WARRIOR,
  8: JOB_GROUP.SUPPORT,
  9: JOB_GROUP.ASSASSIN,
  10: JOB_GROUP.WARRIOR,
  11: JOB_GROUP.SKILL_DEALER,
  12: JOB_GROUP.ASSASSIN,
  13: JOB_GROUP.TANK,
  14: JOB_GROUP.SKILL_DEALER,
  15: JOB_GROUP.SUPPORT,
  16: JOB_GROUP.RANGED_DEALER,
  17: JOB_GROUP.SKILL_DEALER,
  18: JOB_GROUP.ASSASSIN,
  19: JOB_GROUP.SUPPORT,
  20: JOB_GROUP.WARRIOR,
  21: JOB_GROUP.RANGED_DEALER,
  22: JOB_GROUP.WARRIOR,
  23: JOB_GROUP.ASSASSIN,
  24: JOB_GROUP.SKILL_DEALER,
  25: JOB_GROUP.RANGED_DEALER,
  26: JOB_GROUP.SUPPORT,
  27: JOB_GROUP.WARRIOR,
  28: JOB_GROUP.SKILL_DEALER,
  29: JOB_GROUP.WARRIOR,
  30: JOB_GROUP.SKILL_DEALER,
  31: JOB_GROUP.ASSASSIN,
  32: JOB_GROUP.TANK,
  33: JOB_GROUP.RANGED_DEALER,
  34: JOB_GROUP.SUPPORT,
  35: JOB_GROUP.WARRIOR,
  36: JOB_GROUP.SKILL_DEALER,
  37: JOB_GROUP.ASSASSIN,
  38: JOB_GROUP.RANGED_DEALER,
  39: JOB_GROUP.WARRIOR,
  40: JOB_GROUP.TANK,
  41: JOB_GROUP.SKILL_DEALER,
  42: JOB_GROUP.ASSASSIN,
  43: JOB_GROUP.RANGED_DEALER,
  44: JOB_GROUP.SUPPORT,
  45: JOB_GROUP.WARRIOR,
  46: JOB_GROUP.SKILL_DEALER,
  47: JOB_GROUP.ASSASSIN,
  48: JOB_GROUP.RANGED_DEALER,
  49: JOB_GROUP.WARRIOR,
  50: JOB_GROUP.TANK,
  51: JOB_GROUP.SKILL_DEALER,
  52: JOB_GROUP.ASSASSIN,
  53: JOB_GROUP.RANGED_DEALER,
  54: JOB_GROUP.SUPPORT,
  55: JOB_GROUP.WARRIOR,
  56: JOB_GROUP.SKILL_DEALER,
  57: JOB_GROUP.ASSASSIN,
  58: JOB_GROUP.RANGED_DEALER,
  59: JOB_GROUP.WARRIOR,
  60: JOB_GROUP.TANK,
  61: JOB_GROUP.SKILL_DEALER,
  62: JOB_GROUP.ASSASSIN,
  63: JOB_GROUP.RANGED_DEALER,
  64: JOB_GROUP.SUPPORT,
  65: JOB_GROUP.WARRIOR,
  66: JOB_GROUP.SKILL_DEALER,
  67: JOB_GROUP.ASSASSIN,
  68: JOB_GROUP.RANGED_DEALER,
  69: JOB_GROUP.WARRIOR,
  70: JOB_GROUP.TANK,
  71: JOB_GROUP.SKILL_DEALER,
  72: JOB_GROUP.ASSASSIN,
  73: JOB_GROUP.RANGED_DEALER,
  74: JOB_GROUP.SUPPORT,
  75: JOB_GROUP.WARRIOR,
  76: JOB_GROUP.SKILL_DEALER,
  77: JOB_GROUP.ASSASSIN,
  78: JOB_GROUP.RANGED_DEALER,
  79: JOB_GROUP.WARRIOR,
  80: JOB_GROUP.TANK,
  81: JOB_GROUP.SKILL_DEALER,
  82: JOB_GROUP.ASSASSIN,
  83: JOB_GROUP.RANGED_DEALER,
  84: JOB_GROUP.SUPPORT,
  85: JOB_GROUP.WARRIOR,
};

export function getJobGroupForCharacter(characterCode: number): JobGroupKey | undefined {
  return CHARACTER_JOB_GROUP_MAP[characterCode];
}

/** 해당 직업군에 속한 캐릭터가 트리오의 '다른 두 캐릭터' 중 최소 1명인지 여부 */
export function trioHasJobGroup(
  jobGroup: JobGroupKey,
  selectedCharacterCode: number,
  char1: number,
  char2: number,
  char3: number
): boolean {
  const others = [char1, char2, char3].filter((c) => c !== selectedCharacterCode);
  return others.some((code) => getJobGroupForCharacter(code) === jobGroup);
}

/** 직업군 순서 인덱스 (정렬용) */
const JOB_GROUP_INDEX: Record<JobGroupKey, number> = JOB_GROUP_ORDER.reduce(
  (acc, key, i) => ({ ...acc, [key]: i }),
  {} as Record<JobGroupKey, number>
);

/** 직업군 쌍 (작은 인덱스 먼저, 동일 시 같은 직업) */
export type JobGroupPair = [JobGroupKey, JobGroupKey];

/** 모든 직업군 쌍 목록: [탱커+탱커], [탱커+전사], [탱커+암살자], ... [지원가+지원가] */
export const JOB_GROUP_PAIRS: JobGroupPair[] = (() => {
  const pairs: JobGroupPair[] = [];
  for (let i = 0; i < JOB_GROUP_ORDER.length; i++) {
    for (let j = i; j < JOB_GROUP_ORDER.length; j++) {
      pairs.push([JOB_GROUP_ORDER[i], JOB_GROUP_ORDER[j]]);
    }
  }
  return pairs;
})();

/** 직업군 쌍 라벨 (예: "탱커 + 전사", "탱커 + 탱커") */
export function getJobGroupPairLabel(pair: JobGroupPair): string {
  const [a, b] = pair;
  return a === b ? JOB_GROUP_LABELS[a] : `${JOB_GROUP_LABELS[a]} + ${JOB_GROUP_LABELS[b]}`;
}

/** 직업군 쌍 키 (Map 키용, 정규화된 문자열) */
export function getJobGroupPairKey(pair: JobGroupPair): string {
  return `${pair[0]}-${pair[1]}`;
}

/**
 * 선택 캐릭터를 제외한 나머지 두 캐릭터의 직업군 쌍 반환.
 * 둘 다 직업군이 있으면 [작은인덱스, 큰인덱스] 순서의 쌍, 없으면 null
 */
export function getTrioJobGroupPair(
  selectedCharacterCode: number,
  char1: number,
  char2: number,
  char3: number
): JobGroupPair | null {
  const others = [char1, char2, char3].filter((c) => c !== selectedCharacterCode);
  if (others.length !== 2) return null;
  const [a, b] = others;
  const jobA = getJobGroupForCharacter(a);
  const jobB = getJobGroupForCharacter(b);
  if (jobA == null || jobB == null) return null;
  const idxA = JOB_GROUP_INDEX[jobA];
  const idxB = JOB_GROUP_INDEX[jobB];
  return idxA <= idxB ? [jobA, jobB] : [jobB, jobA];
}
