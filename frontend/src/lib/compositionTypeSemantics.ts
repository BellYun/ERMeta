export type CompositionTypeTrait =
  | "engage"
  | "dive"
  | "peel"
  | "protect"
  | "poke"
  | "burst"
  | "sustain"
  | "zoneControl";

const TYPE_TRAIT_PATTERNS: Array<[CompositionTypeTrait, RegExp]> = [
  ["engage", /교전 개시|강제 진입|진입 장악|선봉 진입|선봉 지속 압박/],
  ["dive", /추격|진입 마무리|측면 진입|암살|후열 진입/],
  ["peel", /보호|받아치기|진입 억제|진입 차단/],
  ["protect", /보호|지원 연계|케어/],
  ["poke", /포킹|견제|사거리 압박/],
  ["burst", /폭딜|점사|누킹|마무리/],
  ["sustain", /지속|전열 유지|장기전|받아치기 유지/],
  ["zoneControl", /장악|지역|제어|억제|진형 붕괴/],
];

function normalizedTypeText(values: string[]) {
  return values.join(" ").replaceAll("형", "").replace(/\s+/g, " ").trim();
}

export function getCompositionTypeTraits(...values: string[]): CompositionTypeTrait[] {
  const text = normalizedTypeText(values);
  return TYPE_TRAIT_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([trait]) => trait);
}

function typeTokens(value: string) {
  return new Set(
    normalizedTypeText([value])
      .split(/[\s·+,/()\-]+/)
      .map((token) => token.trim())
      .filter(Boolean)
  );
}

function jaccard<T>(left: Set<T>, right: Set<T>) {
  if (left.size === 0 && right.size === 0) return 1;
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
}

export function compositionTypeSimilarity(left: string, right: string) {
  const normalizedLeft = normalizedTypeText([left]);
  const normalizedRight = normalizedTypeText([right]);
  if (normalizedLeft === normalizedRight) return 1;

  const tokenSimilarity = jaccard(typeTokens(left), typeTokens(right));
  const leftTraits = new Set(getCompositionTypeTraits(left));
  const rightTraits = new Set(getCompositionTypeTraits(right));
  const traitSimilarity = jaccard(leftTraits, rightTraits);
  const containsBonus =
    normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft) ? 0.1 : 0;

  if (leftTraits.size === 0 || rightTraits.size === 0) {
    return Math.min(1, tokenSimilarity * 0.9 + containsBonus);
  }
  return Math.min(1, tokenSimilarity * 0.45 + traitSimilarity * 0.55 + containsBonus);
}
