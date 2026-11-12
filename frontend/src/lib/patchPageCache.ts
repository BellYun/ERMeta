// 자격 증명 없는 브라우저 테스트에서만 사용한다. 배포 환경에서는 허용하지 않는다.
export function isPatchPageTestFixtureMode(): boolean {
  return (
    process.env.PATCH_PAGE_TEST_FIXTURES === "1" && !process.env.VERCEL && !process.env.VERCEL_ENV
  );
}
