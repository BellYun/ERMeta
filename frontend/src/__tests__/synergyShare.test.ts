import { describe, expect, it } from "vitest";
import {
  buildSynergyShareTargetUrl,
  buildSynergyShareUrl,
  createSynergyShareSelection,
  parseSynergyShareSelection,
} from "@/lib/synergyShare";

describe("synergy share URL", () => {
  it("한 명 또는 두 명의 캐릭터 경로를 파싱한다", () => {
    expect(parseSynergyShareSelection("6")).toEqual({ ally1: 6, ally2: null });
    expect(parseSynergyShareSelection("6-10")).toEqual({ ally1: 6, ally2: 10 });
  });

  it("비정상·중복·미등록 캐릭터 경로를 거부한다", () => {
    expect(parseSynergyShareSelection("6x-10")).toBeNull();
    expect(parseSynergyShareSelection("6-6")).toBeNull();
    expect(parseSynergyShareSelection("6-10-1")).toBeNull();
    expect(parseSynergyShareSelection("999999")).toBeNull();
    expect(createSynergyShareSelection([6, 6])).toBeNull();
  });

  it("기존 필터를 보존한 조합별 공유 경로를 만든다", () => {
    const sharedUrl = buildSynergyShareUrl(
      "https://erwagg.com/ko/synergy-detail?ally1=6&w1=8&ally2=10&w2=1&sort=tierScore&minGames=30",
      [6, 10],
      "clipboard"
    );
    const url = new URL(sharedUrl);

    expect(url.pathname).toBe("/ko/synergy-detail/share/6-10");
    expect(url.searchParams.get("ally1")).toBe("6");
    expect(url.searchParams.get("w1")).toBe("8");
    expect(url.searchParams.get("ally2")).toBe("10");
    expect(url.searchParams.get("w2")).toBe("1");
    expect(url.searchParams.get("sort")).toBe("tierScore");
    expect(url.searchParams.get("minGames")).toBe("30");
    expect(url.searchParams.get("utm_source")).toBe("ergg_share");
    expect(url.searchParams.get("utm_medium")).toBe("clipboard");
    expect(url.searchParams.get("utm_campaign")).toBe("synergy_detail");
  });

  it("공유 경로를 원래 도구 경로로 복원하고 경로의 조합을 우선한다", () => {
    const target = buildSynergyShareTargetUrl(
      "https://erwagg.com/ko/synergy-detail/share/6-10?ally1=1&ally2=2&w1=8&sort=averageRP&utm_source=ergg_share",
      { ally1: 6, ally2: 10 }
    );
    const url = new URL(target, "https://erwagg.com");

    expect(url.pathname).toBe("/ko/synergy-detail");
    expect(url.searchParams.get("ally1")).toBe("6");
    expect(url.searchParams.get("ally2")).toBe("10");
    expect(url.searchParams.get("w1")).toBe("8");
    expect(url.searchParams.get("sort")).toBe("averageRP");
    expect(url.searchParams.get("utm_source")).toBe("ergg_share");
  });
});
