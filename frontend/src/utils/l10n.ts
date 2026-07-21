import { L10N_CHUNK_MANIFEST, type L10nNamespace } from "@/generated/l10nManifest";
import type { SupportedLanguage } from "@/lib/detectLanguage";

const l10nNamespaceCache = new Map<string, Promise<Map<string, string>>>();

/** 기능별 l10n 청크를 언어/namespace 단위로 한 번만 가져온다. */
export function fetchL10nNamespace(
  language: SupportedLanguage,
  namespace: L10nNamespace
): Promise<Map<string, string>> {
  const cacheKey = `${language}:${namespace}`;
  const cached = l10nNamespaceCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch(L10N_CHUNK_MANIFEST[language][namespace])
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`${namespace} l10n 데이터를 불러올 수 없습니다.`);
      }

      const data = (await response.json()) as Record<string, string>;
      return new Map(Object.entries(data));
    })
    .catch((error) => {
      l10nNamespaceCache.delete(cacheKey);
      throw error;
    });

  l10nNamespaceCache.set(cacheKey, request);
  return request;
}

// 아이템 이름 가져오기
export function getItemName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Item/Name/${code}`) ?? null;
}

// 캐릭터 이름 가져오기
export function getCharacterName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`Character/Name/${code}`) ?? null;
}

// 무기 이름 가져오기
export function getWeaponName(l10n: Map<string, string>, code: number): string | null {
  return l10n.get(`WeaponType/${code}`) ?? null;
}

// 특성(룬) 이름 가져오기
export function getTraitName(l10n: Map<string, string>, code: number): string | null {
  return (
    l10n.get(`Trait/Name/${code}`) ??
    l10n.get(`TraitName/${code}`) ??
    l10n.get(`Trait/${code}`) ??
    null
  );
}
