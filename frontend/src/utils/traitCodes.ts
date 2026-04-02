// 특성 그룹별 전체 코드 목록
// getTraitGroup 분류 규칙에 따라 배치 (70107xx→혼돈, 71108xx→지원)
// 서브는 슬롯별 4개씩 묶임 (각 슬롯에서 1개 선택)

export type TraitGroup = "havoc" | "fortification" | "support" | "chaos" | "unknown"

export const TRAIT_CORES: Record<TraitGroup, number[]> = {
  havoc:         [7000201, 7000401, 7000501, 7000601, 7000701],
  fortification: [7100101, 7100201, 7100401, 7100501],
  support:       [7200101, 7200201, 7200301, 7200501],
  chaos:         [7300101, 7300201, 7300301],
  unknown:       [],
}

// [슬롯1 4개, 슬롯2 4개]
export const TRAIT_SUBS_SLOT1: Record<TraitGroup, number[]> = {
  havoc:         [7010501, 7010901, 7011001, 7011101],
  fortification: [7110101, 7110201, 7110401, 7110601],
  support:       [7210101, 7210401, 7210801, 7110801],
  chaos:         [7310101, 7310201, 7310301, 7010701],
  unknown:       [],
}

export const TRAIT_SUBS_SLOT2: Record<TraitGroup, number[]> = {
  havoc:         [7011201, 7011301, 7011401, 7011501],
  fortification: [7110701, 7111001, 7111101, 7111201],
  support:       [7211001, 7211101, 7211301, 7211401],
  chaos:         [7310401, 7310501, 7310601],
  unknown:       [],
}

export function getTraitGroup(code: number | null): TraitGroup {
  if (code == null) return "unknown"
  const sub = Math.floor(code / 100)
  if (sub === 70107) return "chaos"
  if (sub === 71108) return "support"
  const prefix = Math.floor(code / 100000)
  if (prefix === 70) return "havoc"
  if (prefix === 71) return "fortification"
  if (prefix === 72) return "support"
  if (prefix === 73) return "chaos"
  return "unknown"
}
