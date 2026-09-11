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
const { trackMock, vercelTrackMock, identifyMock, setTransportMock, flushMock, IdentifyMock } =
  vi.hoisted(() => {
    const trackMock = vi.fn();
    const vercelTrackMock = vi.fn();
    const identifyMock = vi.fn();
    const setTransportMock = vi.fn();
    const flushMock = vi.fn();
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
    return {
      trackMock,
      vercelTrackMock,
      identifyMock,
      setTransportMock,
      flushMock,
      IdentifyMock,
    };
  });

vi.mock("@amplitude/analytics-browser", () => ({
  track: trackMock,
  identify: identifyMock,
  setTransport: setTransportMock,
  flush: flushMock,
  Identify: IdentifyMock,
}));

vi.mock("@vercel/analytics", () => ({
  track: vercelTrackMock,
}));

// analytics.ts 는 getAmplitude 의 promise 를 module-scope 에 캐시하므로
// 여러 테스트가 동일한 mock 을 공유한다. clearAllMocks 로 호출 기록만 리셋.

beforeEach(() => {
  trackMock.mockClear();
  vercelTrackMock.mockClear();
  identifyMock.mockClear();
  setTransportMock.mockClear();
  flushMock.mockClear();
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
  describe("ad block recovery funnel", () => {
    it("Amplitude와 Vercel에 동일한 실험 노출 이벤트를 보낸다", async () => {
      analytics.adBlockRecoveryPromptShown({
        variant: "direct",
        locale: "ko",
        pagePath: "/ko/patches",
        detectionMethod: "cosmetic_bait",
      });
      await flushAsync();

      const properties = {
        experiment: "adblock_recovery_prompt_v1",
        variant: "direct",
        locale: "ko",
        page_path: "/ko/patches",
        detection_method: "cosmetic_bait",
      };
      expect(trackMock).toHaveBeenCalledWith("ad_block_recovery_prompt_shown", properties);
      expect(vercelTrackMock).toHaveBeenCalledWith("ad_block_recovery_prompt_shown", properties);
    });

    it("Amplitude와 Vercel에 실제 광고 filled/viewed 전환을 보낸다", async () => {
      const args = {
        variant: "context" as const,
        slotName: "home_ranking" as const,
        adSlotId: "8139813658",
        attemptAgeMs: 4250,
        attemptPagePath: "/ko",
        pagePath: "/ko",
      };

      analytics.adBlockRecoveryAdFilled(args);
      await flushAsync();
      analytics.adBlockRecoveryAdViewed(args);
      await flushAsync();

      const properties = {
        experiment: "adblock_recovery_prompt_v1",
        variant: "context",
        slot_name: "home_ranking",
        ad_slot_id: "8139813658",
        attempt_age_ms: 4250,
        attempt_page_path: "/ko",
        page_path: "/ko",
        page_surface: "home",
      };
      expect(trackMock).toHaveBeenCalledWith("ad_block_recovery_ad_filled", properties);
      expect(vercelTrackMock).toHaveBeenCalledWith("ad_block_recovery_ad_filled", properties);
      expect(trackMock).toHaveBeenCalledWith("ad_block_recovery_ad_viewed", properties);
      expect(vercelTrackMock).toHaveBeenCalledWith("ad_block_recovery_ad_viewed", properties);
    });
  });

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
        sortBy: "averageRP",
        tier: "",
        patch: "",
        isWeaponScope: true,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_result_viewed", {
        ally1Code: 1,
        ally2Code: null,
        resultCount: 15,
        sortBy: "averageRP",
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

  describe("synergy exploration funnel events", () => {
    it("탐색 깊이 증가 이벤트를 전달한다", async () => {
      analytics.synergyExplorationAdvanced({
        ally1Code: 1,
        ally2Code: 2,
        resultCount: 20,
        sortBy: "averageRP",
        explorationDepth: 3,
        isWeaponScope: false,
        source: "filter_change",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_exploration_advanced", {
        ally1Code: 1,
        ally2Code: 2,
        resultCount: 20,
        sortBy: "averageRP",
        explorationDepth: 3,
        isWeaponScope: false,
        source: "filter_change",
      });
    });

    it("퍼널 종료 이벤트에 상세 조회 여부를 담는다", async () => {
      analytics.synergyFunnelExited({
        ally1Code: 1,
        ally2Code: null,
        resultCount: 12,
        sortBy: "winRate",
        explorationDepth: 2,
        openedDetail: false,
        isWeaponScope: false,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_funnel_exited", {
        ally1Code: 1,
        ally2Code: null,
        resultCount: 12,
        sortBy: "winRate",
        explorationDepth: 2,
        openedDetail: false,
        isWeaponScope: false,
      });
    });

    it("recommendation prefetch 이벤트는 trigger 와 source 를 전달한다", async () => {
      analytics.synergyRecommendationPrefetched({
        pickedCode: 3,
        pickedRank: 1,
        trigger: "viewport",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith("synergy_recommendation_prefetched", {
        pickedCode: 3,
        pickedRank: 1,
        trigger: "viewport",
        source: "synergy",
      });
    });

    it("speculative analysis lifecycle과 click-to-ready 속성을 전달한다", async () => {
      analytics.speculativeAnalysisScheduled({
        candidateRank: 1,
        cacheKey: "1:1|2:2|3:3:legacy",
        source: "synergy_detail",
      });
      analytics.speculativeAnalysisCompleted({ candidateRank: 1, durationMs: 2.5 });
      analytics.speculativeAnalysisHit({
        candidateRank: 1,
        speculativeDurationMs: 2.5,
        savedCalculationMs: 2.5,
      });
      analytics.speculativeAnalysisInvalidated({
        candidateRank: 1,
        reason: "selection_changed",
      });
      analytics.synergyCandidateAnalysisReady({
        candidateRank: 1,
        durationMs: 4.25,
        mode: "speculative_cache_hit",
      });
      await flushAsync();

      expect(trackMock).toHaveBeenCalledWith("speculative_analysis_scheduled", {
        candidateRank: 1,
        cacheKey: "1:1|2:2|3:3:legacy",
        source: "synergy_detail",
      });
      expect(trackMock).toHaveBeenCalledWith("speculative_analysis_completed", {
        candidateRank: 1,
        durationMs: 2.5,
      });
      expect(trackMock).toHaveBeenCalledWith("speculative_analysis_hit", {
        candidateRank: 1,
        speculativeDurationMs: 2.5,
        savedCalculationMs: 2.5,
      });
      expect(trackMock).toHaveBeenCalledWith("speculative_analysis_invalidated", {
        candidateRank: 1,
        reason: "selection_changed",
      });
      expect(trackMock).toHaveBeenCalledWith("synergy_candidate_analysis_ready", {
        candidateRank: 1,
        durationMs: 4.25,
        mode: "speculative_cache_hit",
      });
    });
  });

  describe("ad slot events", () => {
    it("광고 배치 실험 노출과 슬롯 이벤트에 동일한 variant를 전달한다", async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
      const attribution = {
        experiment: "home_ad_placement_v1" as const,
        variant: "optimized" as const,
        placement: "before_filters" as const,
        assignmentSource: "experiment" as const,
      };

      analytics.adPlacementExperimentExposed({
        attribution,
        slotName: "home_ranking",
        pagePath: "/ko/rankings",
      });
      analytics.adSlotViewed({
        slotName: "home_ranking",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-experiment",
        pagePath: "/ko/rankings",
        eventPagePath: "/ko/rankings",
        experiment: attribution,
      });
      await flushAsync();

      const experimentProperties = expect.objectContaining({
        experiment: "home_ad_placement_v1",
        variant: "optimized",
        placement: "before_filters",
        assignment_source: "experiment",
      });
      expect(trackMock).toHaveBeenCalledWith(
        "ad_placement_experiment_exposed",
        experimentProperties
      );
      expect(vercelTrackMock).toHaveBeenCalledWith(
        "ad_placement_experiment_exposed",
        experimentProperties
      );
      expect(trackMock).toHaveBeenCalledWith("ad_slot_viewed", experimentProperties);
    });

    it("ad_slot_rendered 에 슬롯명과 광고 슬롯 ID 를 전달한다", async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });

      analytics.adSlotRendered({
        slotName: "synergy_detail_top",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-rendered",
        pagePath: "/ko/synergy-detail",
        eventPagePath: "/ko/synergy-detail",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_rendered",
        expect.objectContaining({
          slot_name: "synergy_detail_top",
          ad_slot_id: "8139813658",
          slot_instance_id: "slot-instance-rendered",
          page_path: "/ko/synergy-detail",
          page_surface: "synergy_detail",
          event_page_path: "/ko/synergy-detail",
          event_page_surface: "synergy_detail",
          viewport_width: 1440,
          viewport_height: 900,
          viewport_eligible: true,
          ad_measurement_version: 2,
          ad_delivery_state: "no_slot",
          ad_resource_count: 0,
        })
      );
    });

    it("ad_slot_viewed 에 슬롯명과 viewport 정보를 전달한다", async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });

      analytics.adSlotViewed({
        slotName: "home_ranking",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-viewed",
        pagePath: "/ko",
        eventPagePath: "/ko",
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_viewed",
        expect.objectContaining({
          slot_name: "home_ranking",
          ad_slot_id: "8139813658",
          slot_instance_id: "slot-instance-viewed",
          page_path: "/ko",
          page_surface: "home",
          viewport_width: 390,
          viewport_height: 844,
          ad_correlated_long_task_count: 0,
        })
      );
    });

    it("ad_slot_state_changed 에 슬롯 상태와 예약 크기를 전달한다", async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1699 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });

      analytics.adSlotStateChanged({
        slotName: "site_rail_right",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-state",
        status: "unfilled",
        previousStatus: "requested",
        timedOutBeforeStatus: false,
        isLateFill: false,
        pagePath: "/ko",
        eventPagePath: "/ko/synergy-detail",
        reservedHeight: 600,
        reservedWidth: 160,
      });
      await flushAsync();
      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_state_changed",
        expect.objectContaining({
          slot_name: "site_rail_right",
          ad_slot_id: "8139813658",
          slot_instance_id: "slot-instance-state",
          status: "unfilled",
          previous_status: "requested",
          timed_out_before_status: false,
          is_late_fill: false,
          page_path: "/ko",
          page_surface: "home",
          event_page_path: "/ko/synergy-detail",
          event_page_surface: "synergy_detail",
          viewport_width: 1699,
          viewport_height: 900,
          viewport_eligible: false,
          reserved_height: 600,
          reserved_width: 160,
          page_long_task_total_ms: 0,
        })
      );
    });

    it("timeout 이후 fill을 동일 슬롯 인스턴스의 late fill로 전달한다", async () => {
      analytics.adSlotStateChanged({
        slotName: "site_rail_left",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-late-fill",
        status: "filled",
        previousStatus: "timeout",
        timedOutBeforeStatus: true,
        isLateFill: true,
        pagePath: "/ko",
        eventPagePath: "/ko",
        reservedHeight: 600,
        reservedWidth: 160,
        requestToStateMs: 12_500,
      });
      await flushAsync();

      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_state_changed",
        expect.objectContaining({
          slot_instance_id: "slot-instance-late-fill",
          status: "filled",
          previous_status: "timeout",
          timed_out_before_status: true,
          is_late_fill: true,
          request_to_state_ms: 12_500,
        })
      );
    });

    it("페이지 종료 시 미확정 슬롯 문맥을 beacon으로 즉시 전송한다", async () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });

      analytics.adSlotAbandoned({
        slotName: "home_ranking",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-abandoned",
        reason: "pagehide",
        hasIframe: false,
        observedAdStatus: "missing",
        documentVisibility: "hidden",
        requestAgeBucket: "3s_to_10s",
        pagePath: "/ko",
        eventPagePath: "/ko/character/1",
        reservedHeight: 100,
        reservedWidth: null,
        elapsedSinceRenderMs: 5_200,
        elapsedSinceRequestMs: 4_800,
      });
      await flushAsync();

      expect(setTransportMock).toHaveBeenCalledWith("beacon");
      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_abandoned",
        expect.objectContaining({
          slot_name: "home_ranking",
          slot_instance_id: "slot-instance-abandoned",
          abandon_reason: "pagehide",
          has_iframe: false,
          observed_ad_status: "missing",
          document_visibility: "hidden",
          request_age_bucket: "3s_to_10s",
          page_path: "/ko",
          event_page_path: "/ko/character/1",
          elapsed_since_request_ms: 4_800,
          ad_measurement_version: 2,
        })
      );
      expect(flushMock).toHaveBeenCalledOnce();
    });

    it("컴포넌트 해제 이벤트는 기본 전송 방식을 유지한다", async () => {
      analytics.adSlotAbandoned({
        slotName: "character_analysis_top",
        adSlotId: "8139813658",
        slotInstanceId: "slot-instance-unmounted",
        reason: "component_unmount",
        hasIframe: true,
        observedAdStatus: "other",
        documentVisibility: "visible",
        requestAgeBucket: "10s_plus",
        pagePath: "/ko/character/1",
        eventPagePath: "/ko/character/2",
        reservedHeight: 100,
        reservedWidth: null,
        elapsedSinceRequestMs: 12_000,
      });
      await flushAsync();

      expect(trackMock).toHaveBeenCalledWith(
        "ad_slot_abandoned",
        expect.objectContaining({
          abandon_reason: "component_unmount",
          has_iframe: true,
          observed_ad_status: "other",
        })
      );
      expect(setTransportMock).not.toHaveBeenCalled();
      expect(flushMock).not.toHaveBeenCalled();
    });

    it("web vital 이벤트에 고정 page path와 attribution을 전달한다", async () => {
      analytics.webVitalReported({
        name: "INP",
        value: 189.6,
        delta: 189.6,
        id: "v4-test",
        pagePath: "/ko/character/1",
        attribution: {
          inp_longest_script_is_ad: true,
          inp_input_delay_ms: 82.4,
        },
      });
      await flushAsync();

      expect(trackMock).toHaveBeenCalledWith(
        "web_vital_measured",
        expect.objectContaining({
          metric_name: "INP",
          value: 190,
          page_path: "/ko/character/1",
          page_surface: "character_detail",
          inp_longest_script_is_ad: true,
          inp_input_delay_ms: 82.4,
          ad_delivery_state: "no_slot",
        })
      );
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
