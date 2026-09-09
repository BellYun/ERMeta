import { describe, expect, it } from "vitest";
import { canLoadAds } from "@/lib/adRoutes";

describe("ad route eligibility", () => {
  it.each([
    "/",
    "/ko",
    "/ko/rankings",
    "/character/40",
    "/en/character/40",
    "/ko/multi-search",
    "/ja/patches/12.3",
    "/en/character-lab",
    "/updates",
  ])(
    "콘텐츠 경로에서는 광고 스크립트를 허용한다: %s",
    (pathname) => {
      expect(canLoadAds(pathname)).toBe(true);
    }
  );

  it.each(["/ko/privacy", "/ko/terms", "/ko/character-lab/preview"])(
    "제외 경로에서는 광고 스크립트를 허용하지 않는다: %s",
    (pathname) => {
      expect(canLoadAds(pathname)).toBe(false);
    }
  );
});
