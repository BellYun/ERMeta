import { HOME_META_TARGET_PATCH } from "./homeMetaShared";

// 상세 분석은 시간 단위로 갱신한다. 종료된 패치는 명시적 무효화 때만 갱신한다.
export const PATCH_PAGE_REVALIDATE_SECONDS = 3600;

export function getPatchPageRevalidate(version: string): number | false {
  return version === HOME_META_TARGET_PATCH ? PATCH_PAGE_REVALIDATE_SECONDS : false;
}

// 자격 증명 없는 브라우저 테스트에서만 사용한다. 배포 환경에서는 허용하지 않는다.
export function isPatchPageTestFixtureMode(): boolean {
  return (
    process.env.PATCH_PAGE_TEST_FIXTURES === "1" && !process.env.VERCEL && !process.env.VERCEL_ENV
  );
}
