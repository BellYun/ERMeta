import { describe, expect, it } from "vitest";
import { getResourceHost, isAdResourceUrl } from "@/lib/adPerformance";

describe("adPerformance resource classification", () => {
  it.each([
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    "https://googleads.g.doubleclick.net/pagead/ads?client=test",
    "https://tpc.googlesyndication.com/sodar/sodar.bin",
  ])("광고 공급 도메인을 분류한다: %s", (url) => {
    expect(isAdResourceUrl(url)).toBe(true);
  });

  it.each([
    "https://erwagg.com/_next/static/chunks/app.js",
    "https://www.googletagmanager.com/gtag/js?id=G-test",
    "https://api2.amplitude.com/2/httpapi",
  ])("분석/자사 리소스를 광고 비용으로 오분류하지 않는다: %s", (url) => {
    expect(isAdResourceUrl(url)).toBe(false);
  });

  it("전체 URL 대신 낮은 cardinality의 host만 반환한다", () => {
    expect(getResourceHost("https://www.googleads.g.doubleclick.net/pagead/ads?a=1")).toBe(
      "googleads.g.doubleclick.net"
    );
  });
});
