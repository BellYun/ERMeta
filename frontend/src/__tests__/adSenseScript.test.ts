import { describe, expect, it } from "vitest";
import { canLoadAds } from "@/components/ads/AdSenseScript";

describe("AdSenseScript route eligibility", () => {
  it.each([
    "/ko",
    "/en/character/1",
    "/ja/synergy-detail",
    "/zh-Hans/patches/12.2",
    "/zh-Hant/patch-analysis/12.2",
    "/ko/rankings",
    "/en/character-lab/assassins",
    "/ja/multi-search",
    "/ko/season11-recap",
    "/en/synergy-matrix",
  ])("지원 locale의 콘텐츠 경로에서 광고를 허용한다: %s", (pathname) => {
    expect(canLoadAds(pathname)).toBe(true);
  });

  it.each([
    "/ko/privacy",
    "/zh-Hans/terms",
    "/ja/patches/preview",
    "/ko/character-lab/preview",
    "/ko/design-lab",
  ])(
    "제외 경로에서는 광고를 로드하지 않는다: %s",
    (pathname) => {
      expect(canLoadAds(pathname)).toBe(false);
    }
  );
});
