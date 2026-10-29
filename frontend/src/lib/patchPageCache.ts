import { HOME_META_TARGET_PATCH } from "./homeMetaShared";

// 상세 분석은 시간 단위로 갱신한다. 종료된 패치는 명시적 무효화 때만 갱신한다.
export const PATCH_PAGE_REVALIDATE_SECONDS = 3600;

export function getPatchPageRevalidate(version: string): number | false {
  return version === HOME_META_TARGET_PATCH ? PATCH_PAGE_REVALIDATE_SECONDS : false;
}
