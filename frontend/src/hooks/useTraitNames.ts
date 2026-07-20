"use client";

import { useMemo } from "react";

const TRAIT_PREFIX = "Trait/Name/";

/**
 * l10n Map에서 `Trait/Name/{code}` 항목만 추출해 `{ code: name }` 매핑 반환.
 * 언어 변경 시(useL10n의 l10n reference 변경) 재계산.
 *
 * L10nProvider가 첫 paint용 seed와 이후 전체 l10n을 같은 Map 형태로 제공하므로
 * 별도 API 요청 없이 직접 추출한다.
 */
export function useTraitNames(l10n: Map<string, string>): Record<number, string> {
  return useMemo(() => {
    const names: Record<number, string> = {};
    for (const [key, value] of l10n) {
      if (!key.startsWith(TRAIT_PREFIX)) continue;
      const code = Number(key.slice(TRAIT_PREFIX.length));
      if (!isNaN(code) && code > 0) names[code] = value;
    }
    return names;
  }, [l10n]);
}
