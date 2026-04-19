import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../lib/analytics";

// ── 최소 window/sessionStorage 폴리필 (jsdom 없이 동작) ───────────────────────
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}
const sessionStorage = new MemoryStorage();
// analytics.ts 는 typeof window === "undefined" 가드로 SSR 안전성 체크
(globalThis as unknown as { window: unknown }).window = {
  sessionStorage,
};

// ── @amplitude/analytics-browser mock ────────────────────────────────────────
// vi.mock 은 hoisted 되므로, 외부 참조 변수는 vi.hoisted 로 감싸야 안전하다.
const { trackMock, identifyMock, IdentifyMock } = vi.hoisted(() => {
  const trackMock = vi.fn();
  const identifyMock = vi.fn();
  class IdentifyMock {
    private props: Record<string, unknown> = {};
    set(key: string, value: unknown) {
      this.props[key] = value;
      return this;
    }
    getProps() {
      return this.props;
    }
  }
  return { trackMock, identifyMock, IdentifyMock };
});

vi.mock("@amplitude/analytics-browser", () => ({
  track: trackMock,
  identify: identifyMock,
  Identify: IdentifyMock,
}));

// analytics.ts 는 getAmplitude 의 promise 를 module-scope 에 캐시하므로
// 여러 테스트가 동일한 mock 을 공유한다. clearAllMocks 로 호출 기록만 리셋.

beforeEach(() => {
  trackMock.mockClear();
  identifyMock.mockClear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function flushAsync() {
  // getAmplitude().then(...) 동적 import → microtask chain + cold-start macrotask 대기
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("analytics — P0 helpers", () => {
  describe("coreFeatureUsed (NSM dedupe)", () => {
    it("세션 내 첫 호출은 firstTimeInSession=true 로 fire 한다", async () => {
      analytics.coreFeatureUsed("character_analysis");
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("core_feature_used", {
        feature: "character_analysis",
        firstTimeInSession: true,
      });
    });

    it("같은 feature 두 번째 호출은 skip 된다", async () => {
      analytics.coreFeatureUsed("character_analysis");
      await flushAsync();
      trackMock.mockClear();

      analytics.coreFeatureUsed("character_analysis");
      await flushAsync();
      expect(trackMock).not.toHaveBeenCalled();
    });

    it("다른 feature 는 독립적으로 각각 1회 fire 된다", async () => {
      analytics.coreFeatureUsed("character_analysis");
      analytics.coreFeatureUsed("synergy_search");
      await flushAsync();
      const featureCalls = trackMock.mock.calls
        .filter(([evt]) => evt === "core_feature_used")
        .map(([, props]) => (props as { feature: string }).feature);
      expect(featureCalls).toEqual(
        expect.arrayContaining(["character_analysis", "synergy_search"])
      );
      expect(featureCalls).toHaveLength(2);
    });

    it("characterViewed 최초 호출 시 NSM 이 자동 트리거된다", async () => {
      analytics.characterViewed(1, "아델리나");
      await flushAsync();
      const events = trackMock.mock.calls.map(([evt]) => evt);
      expect(events).toContain("character_viewed");
      expect(events).toContain("core_feature_used");
    });

    it("synergyAllySelected 최초 호출 시 NSM(synergy_search) 이 자동 트리거된다", async () => {
      analytics.synergyAllySelected("A", 17, "재키");
      await flushAsync();
      const nsmCall = trackMock.mock.calls.find(([evt]) => evt === "core_feature_used");
      expect(nsmCall).toBeDefined();
      expect((nsmCall![1] as { feature: string }).feature).toBe("synergy_search");
    });
  });

  describe("rankingCharacterClicked", () => {
    it("source=main 고정 + 인자 전달", async () => {
      analytics.rankingCharacterClicked({
        characterCode: 42,
        characterName: "하트",
        rank: 3,
        tier: "S",
        patch: "10.7",
        matchmakingTier: "MITHRIL",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("ranking_character_clicked", {
        characterCode: 42,
        characterName: "하트",
        rank: 3,
        tier: "S",
        patch: "10.7",
        matchmakingTier: "MITHRIL",
        source: "main",
      });
    });
  });

  describe("trendingCharacterClicked", () => {
    it("direction + source=trending 을 전달한다", async () => {
      analytics.trendingCharacterClicked({
        characterCode: 7,
        characterName: "로지",
        direction: "rising",
        rank: 1,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("trending_character_clicked", {
        characterCode: 7,
        characterName: "로지",
        direction: "rising",
        rank: 1,
        source: "trending",
      });
    });
  });

  describe("honeyPickClicked", () => {
    it("weaponCode nullable 허용 + source=honey", async () => {
      analytics.honeyPickClicked({
        characterCode: 5,
        characterName: "피오라",
        weaponCode: null,
        score: 1.23,
        rank: 2,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("honey_pick_clicked", {
        characterCode: 5,
        characterName: "피오라",
        weaponCode: null,
        score: 1.23,
        rank: 2,
        source: "honey",
      });
    });
  });

  describe("synergyResultViewed", () => {
    it("isWeaponScope=true 및 nullable ally 허용", async () => {
      analytics.synergyResultViewed({
        ally1Code: 1,
        ally2Code: null,
        resultCount: 15,
        sortBy: "recommended",
        tier: "",
        patch: "",
        isWeaponScope: true,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_result_viewed", {
        ally1Code: 1,
        ally2Code: null,
        resultCount: 15,
        sortBy: "recommended",
        tier: "",
        patch: "",
        isWeaponScope: true,
      });
    });
  });

  describe("synergyRecommendationClicked", () => {
    it("pickedCode/pickedRank + source=synergy 를 전달한다", async () => {
      analytics.synergyRecommendationClicked({
        ally1Code: 1,
        ally2Code: 2,
        pickedCode: 3,
        pickedRank: 5,
        sortBy: "averageRP",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_recommendation_clicked", {
        ally1Code: 1,
        ally2Code: 2,
        pickedCode: 3,
        pickedRank: 5,
        sortBy: "averageRP",
        source: "synergy",
      });
    });
  });

  describe("setSessionProperties (Identify API)", () => {
    it("Identify 인스턴스로 amplitude.identify 를 호출한다", async () => {
      analytics.setSessionProperties({
        session_source: "organic_search",
        is_patch_day: true,
        app_version: "1.2.3",
        entry_page_path: "/",
        is_mobile_viewport: false,
      });
      await flushAsync();
      expect(identifyMock).toHaveBeenCalled();
      const call = identifyMock.mock.calls[0]?.[0] as IdentifyMock;
      const props = call.getProps();
      expect(props).toMatchObject({
        session_source: "organic_search",
        is_patch_day: true,
        app_version: "1.2.3",
        entry_page_path: "/",
        is_mobile_viewport: false,
      });
    });

    it("undefined 값은 Identify 에 set 되지 않는다", async () => {
      analytics.setSessionProperties({
        session_source: "direct",
        // is_patch_day 미지정
      });
      await flushAsync();
      const call = identifyMock.mock.calls[0]?.[0] as IdentifyMock;
      const props = call.getProps();
      expect(props).toEqual({ session_source: "direct" });
      expect("is_patch_day" in props).toBe(false);
    });
  });
});
