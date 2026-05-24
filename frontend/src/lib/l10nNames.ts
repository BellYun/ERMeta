import { unstable_cache } from "next/cache";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { loadL10nRecord } from "@/lib/serverL10n";

// /api/items/names, /api/traits/names 같은 호환용 endpoint에서 공통으로 쓰는 helper.
// 내부 UI 경로는 이 route들을 호출하지 말고 L10nProvider/static l10n에서 직접 이름을 읽는다.
const ITEM_NAME_PREFIX = "Item/Name/";
const TRAIT_NAME_PREFIX = "Trait/Name/";

export function extractPrefixedNames(
  source: Record<string, string>,
  prefix: string
): Record<number, string> {
  const names: Record<number, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(prefix)) continue;
    const code = Number(key.slice(prefix.length));
    if (!Number.isNaN(code) && code > 0) {
      names[code] = value;
    }
  }

  return names;
}

function loadNamesByPrefix(prefix: string): Record<number, string> | null {
  const l10n = loadL10nRecord(DEFAULT_LANGUAGE);
  if (!l10n) return null;
  return extractPrefixedNames(l10n, prefix);
}

export const getCachedItemNames = unstable_cache(
  async (): Promise<Record<number, string> | null> => loadNamesByPrefix(ITEM_NAME_PREFIX),
  ["item-names"],
  {
    revalidate: 86400,
    tags: ["l10n-names", "item-names"],
  }
);

export const getCachedTraitNames = unstable_cache(
  async (): Promise<Record<number, string> | null> => loadNamesByPrefix(TRAIT_NAME_PREFIX),
  ["trait-names"],
  {
    revalidate: 86400,
    tags: ["l10n-names", "trait-names"],
  }
);
