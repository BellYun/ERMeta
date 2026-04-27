"use client";

import { useMemo } from "react";

const TRAIT_PREFIX = "Trait/Name/";

/**
 * l10n Map에서 `Trait/Name/{code}` 항목만 추출해 `{ code: name }` 매핑 반환.
 * 언어 변경 시(useL10n의 l10n reference 변경) 재계산.
 *
 * 기존엔 `/api/traits/names` 별도 fetch + useState로 관리했으나,
 * L10nProvider가 이미 전체 l10n을 메모리에 들고 있으므로 직접 추출이 빠르고 단순.
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
