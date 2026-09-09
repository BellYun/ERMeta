import {
  AD_BLOCK_RECOVERY_EXPERIMENT,
  type AdBlockRecoveryDismissReason,
  type AdBlockRecoveryVariant,
} from "@/lib/adBlockRecoveryExperiment";
import { getAdPerformanceSnapshot, type AdScriptState } from "@/lib/adPerformance";

type AmplitudeModule = typeof import("@amplitude/analytics-browser");

const isDev = process.env.NODE_ENV === "development";
const AD_MEASUREMENT_VERSION = 2;

// 동적 import 캐시: 첫 track 호출 시 로드, 이후 재사용
let amplitudePromise: Promise<AmplitudeModule> | null = null;

function getAmplitude(): Promise<AmplitudeModule> {
  if (!amplitudePromise) {
    amplitudePromise = import("@amplitude/analytics-browser");
  }
  return amplitudePromise;
}

function track(event: string, properties?: Record<string, unknown>) {
  if (isDev) return;
  getAmplitude()
    .then((amplitude) => amplitude.track(event, properties))
    .catch(() => {});
}

function trackOnPageExit(event: string, properties?: Record<string, unknown>) {
  if (isDev) return;
  getAmplitude()
    .then((amplitude) => {
      amplitude.setTransport("beacon");
      amplitude.track(event, properties);
      amplitude.flush();
    })
    .catch(() => {});
}

type FlatAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

function trackAdBlockRecovery(event: string, properties: FlatAnalyticsProperties) {
  track(event, properties);
  if (isDev) return;

  import("@vercel/analytics")
    .then((vercelAnalytics) => vercelAnalytics.track(event, properties))
    .catch(() => {});
}

function getCurrentPagePath() {
  if (typeof window === "undefined") return undefined;
  return window.location?.pathname;
}

function getViewportProperties() {
  if (typeof window === "undefined") {
    return {
      viewport_width: undefined,
      viewport_height: undefined,
    };
  }

  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}

function getPageSurface(pagePath: string | undefined) {
  if (!pagePath) return "unknown";
  const path = pagePath.replace(/^\/(?:ko|en|ja|zh-Hans|zh-Hant)(?=\/|$)/, "") || "/";
  if (path === "/") return "home";
  if (path.startsWith("/character/")) return "character_detail";
  if (path.startsWith("/character-analysis")) return "character_analysis";
  if (path.startsWith("/synergy-detail")) return "synergy_detail";
  if (path.startsWith("/patch-analysis")) return "patch_analysis";
  if (path.startsWith("/patches")) return "patches";
  if (path.startsWith("/about")) return "about";
  if (path.startsWith("/methodology")) return "methodology";
  return "other";
}

function getAdPerformanceProperties() {
  const snapshot = getAdPerformanceSnapshot();
  return {
    ad_measurement_version: AD_MEASUREMENT_VERSION,
    ...getViewportProperties(),
    ad_script_state: snapshot.scriptState,
    ad_script_load_ms: snapshot.scriptLoadMs,
    ad_delivery_state: snapshot.deliveryState,
    ad_rendered_slot_count: snapshot.renderedSlotCount,
    ad_requested_slot_count: snapshot.requestedSlotCount,
    ad_filled_slot_count: snapshot.filledSlotCount,
    ad_viewable_slot_count: snapshot.viewableSlotCount,
    ad_failed_slot_count: snapshot.failedSlotCount,
    ad_resource_count: snapshot.adResourceCount,
    ad_resource_duration_ms: snapshot.adResourceDurationMs,
    ad_transfer_kb: snapshot.adTransferKb,
    page_long_task_count: snapshot.pageLongTaskCount,
    page_long_task_total_ms: snapshot.pageLongTaskTotalMs,
    page_long_task_max_ms: snapshot.pageLongTaskMaxMs,
    ad_frame_long_task_count: snapshot.adFrameLongTaskCount,
    ad_frame_long_task_total_ms: snapshot.adFrameLongTaskTotalMs,
    ad_correlated_long_task_count: snapshot.adCorrelatedLongTaskCount,
    ad_correlated_long_task_total_ms: snapshot.adCorrelatedLongTaskTotalMs,
  };
}

// ── Types (pm/amplitude-event-design.md §3.3) ────────────────────────────────
export type FeatureKey =
  | "character_analysis"
  | "synergy_search"
  | "record_search"
  | "meta_dashboard";

export type TierGroupEnum = "DIAMOND" | "METEORITE" | "MITHRIL" | "IN1000";

export type Source =
  | "main"
  | "trending"
  | "honey"
  | "ranking"
  | "search"
  | "analysis"
  | "synergy"
  | "record"
  | "landing"
  | "external";

export type SynergySortBy = "tierScore" | "averageRP" | "winRate" | "averageRank" | "totalGames";
export type SynergyPrefetchTrigger = "hover" | "viewport";
export type SpeculativeAnalysisInvalidationReason =
  | "selection_changed"
  | "unmounted"
  | "new_generation";
export type CandidateAnalysisMode = "speculative_cache_hit" | "cache_hit" | "on_demand";

export type SessionSource = "organic_search" | "community" | "direct" | "social" | "internal";

export type AdSlotName =
  | "home_ranking"
  | "synergy_detail_top"
  | "character_analysis_top"
  | "site_content_top"
  | "site_rail_left"
  | "site_rail_right";
export type AdSlotStatus = "reserved" | "requested" | "filled" | "unfilled" | "timeout";
export type AdSlotAbandonReason = "pagehide" | "component_unmount";

const AD_SLOT_MIN_VIEWPORT_WIDTH: Partial<Record<AdSlotName, number>> = {
  site_rail_left: 1280,
  site_rail_right: 1700,
};

function getAdSlotPageProperties(pagePath?: string, eventPagePath?: string) {
  const resolvedPagePath = pagePath ?? getCurrentPagePath();
  const resolvedEventPagePath = eventPagePath ?? getCurrentPagePath();

  return {
    page_path: resolvedPagePath,
    page_surface: getPageSurface(resolvedPagePath),
    event_page_path: resolvedEventPagePath,
    event_page_surface: getPageSurface(resolvedEventPagePath),
  };
}

function isAdSlotViewportEligible(slotName: AdSlotName) {
  if (typeof window === "undefined") return undefined;
  const minViewportWidth = AD_SLOT_MIN_VIEWPORT_WIDTH[slotName];
  return minViewportWidth === undefined || window.innerWidth >= minViewportWidth;
}

export interface SessionProperties {
  session_source?: SessionSource;
  is_patch_day?: boolean;
  app_version?: string;
  entry_page_path?: string;
  is_mobile_viewport?: boolean;
}

export interface UserProperties {
  first_referrer?: string;
  device_type?: "mobile" | "tablet" | "desktop";
  first_landing_page?: string;
  user_segment?: "new" | "casual" | "core";
  preferred_matchmaking_tier?: TierGroupEnum;
}

// ── NSM dedupe (core_feature_used 세션당 feature별 1회) ──────────────────────
const NSM_FLAG_PREFIX = "amp_nsm_";

function markAndCheckFirstTime(feature: FeatureKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `${NSM_FLAG_PREFIX}${feature}`;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export const analytics = {
  // ── 기존 10개 (시그니처 유지) ──────────────────────────────────────────────

  /** 메인 페이지 - 매치메이킹 티어 그룹 변경 */
  tierGroupSelected(tier: string) {
    track("tier_group_selected", { tier });
  },

  /** 메인 페이지 - 패치 버전 변경 */
  patchSelected(patch: string) {
    track("patch_selected", { patch });
  },

  /** 메인 페이지 - 실험체 티어표 S/A/B/C/D 탭 필터 */
  rankingTierTabChanged(tab: string) {
    track("ranking_tier_tab_changed", { tab });
  },

  /** 실험체 분석 - 실험체 조회 (NSM auto-trigger: character_analysis) */
  characterViewed(characterCode: number, characterName: string) {
    track("character_viewed", { characterCode, characterName });
    if (markAndCheckFirstTime("character_analysis")) {
      track("core_feature_used", {
        feature: "character_analysis",
        firstTimeInSession: true,
      });
    }
  },

  /** 실험체 분석 - 무기 선택 */
  weaponSelected(characterCode: number, weaponCode: number, weaponName: string) {
    track("weapon_selected", { characterCode, weaponCode, weaponName });
  },

  /** 실험체 분석 - 분석 티어 그룹 변경 */
  analysisTierChanged(tier: string) {
    track("analysis_tier_changed", { tier });
  },

  /** 실험체 분석 - 탭 전환 */
  analysisTabChanged(tab: string) {
    track("analysis_tab_changed", { tab });
  },

  /** 실험체 분석 - 실험체 검색 */
  characterSearched(query: string) {
    track("character_searched", { query });
  },

  /** 시너지 - 동료 실험체 선택 (NSM auto-trigger: synergy_search) */
  synergyAllySelected(slot: "A" | "B", characterCode: number, characterName: string) {
    track("synergy_ally_selected", { slot, characterCode, characterName });
    if (markAndCheckFirstTime("synergy_search")) {
      track("core_feature_used", {
        feature: "synergy_search",
        firstTimeInSession: true,
      });
    }
  },

  /** 시너지 - 정렬 방식 변경 */
  synergySortChanged(sortBy: string) {
    track("synergy_sort_changed", { sortBy });
  },

  // ── P0 신규 (pm/amplitude-event-design.md §4.1) ────────────────────────────

  /**
   * NSM 집계 — 세션당 feature별 1회만 fire.
   * 일반적으로는 characterViewed/synergyAllySelected 등에서 자동 호출되며,
   * 독립 피처(record_search/meta_dashboard 등) 진입 시 직접 호출한다.
   */
  coreFeatureUsed(feature: FeatureKey) {
    if (markAndCheckFirstTime(feature)) {
      track("core_feature_used", {
        feature,
        firstTimeInSession: true,
      });
    }
  },

  /** 메인 티어 랭킹 행/카드 클릭 (메인→상세 전환 퍼널) */
  rankingCharacterClicked(args: {
    characterCode: number;
    characterName: string;
    rank: number;
    tier: string;
    patch: string;
    matchmakingTier: TierGroupEnum;
  }) {
    track("ranking_character_clicked", { ...args, source: "main" as const });
  },

  /** 떡상/떡락 섹션 카드 클릭 */
  trendingCharacterClicked(args: {
    characterCode: number;
    characterName: string;
    direction: "rising" | "falling";
    rank: number;
  }) {
    track("trending_character_clicked", { ...args, source: "trending" as const });
  },

  /** 꿀챔 카드 클릭 */
  honeyPickClicked(args: {
    characterCode: number;
    characterName: string;
    weaponCode: number | null;
    score: number;
    rank: number;
  }) {
    track("honey_pick_clicked", { ...args, source: "honey" as const });
  },

  /** 시너지 추천 결과 렌더 완료 (퍼널 B 완료 단계) */
  synergyResultViewed(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    resultCount: number;
    sortBy: SynergySortBy;
    tier: string;
    patch: string;
    isWeaponScope: boolean;
  }) {
    track("synergy_result_viewed", args);
  },

  /** 시너지 추천 3번째 실험체 클릭 */
  synergyRecommendationClicked(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    pickedCode: number;
    pickedRank: number;
    sortBy: SynergySortBy;
  }) {
    track("synergy_recommendation_clicked", { ...args, source: "synergy" as const });
  },

  /** 시너지 탐색 세션 내 조건 탐색 깊이 증가 */
  synergyExplorationAdvanced(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    resultCount: number;
    sortBy: SynergySortBy;
    explorationDepth: number;
    isWeaponScope: boolean;
    source: "url_restore" | "filter_change" | "sort_change";
  }) {
    track("synergy_exploration_advanced", args);
  },

  /** 결과를 본 뒤 상세 조회 없이 떠나는 비율 계산용 종료 이벤트 */
  synergyFunnelExited(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    resultCount: number;
    sortBy: SynergySortBy;
    explorationDepth: number;
    openedDetail: boolean;
    isWeaponScope: boolean;
  }) {
    track("synergy_funnel_exited", args);
  },

  /** 추천 카드 상세 라우트 prefetch */
  synergyRecommendationPrefetched(args: {
    pickedCode: number;
    pickedRank: number;
    trigger: SynergyPrefetchTrigger;
  }) {
    track("synergy_recommendation_prefetched", { ...args, source: "synergy" as const });
  },

  /** 추천 결과 commit 뒤 Top-1 로컬 분석을 idle queue에 등록. */
  speculativeAnalysisScheduled(args: { candidateRank: number; cacheKey: string; source: string }) {
    track("speculative_analysis_scheduled", args);
  },

  /** Top-1 로컬 분석이 shared analysis cache를 채움. */
  speculativeAnalysisCompleted(args: { candidateRank: number; durationMs: number }) {
    track("speculative_analysis_completed", args);
  },

  /** 사용자가 선택한 후보가 speculative cache entry를 재사용. */
  speculativeAnalysisHit(args: {
    candidateRank: number;
    speculativeDurationMs: number;
    savedCalculationMs: number;
  }) {
    track("speculative_analysis_hit", args);
  },

  /** 예약된 speculative 작업이 현재 selection/generation에서 무효화됨. */
  speculativeAnalysisInvalidated(args: {
    candidateRank: number;
    reason: SpeculativeAnalysisInvalidationReason;
  }) {
    track("speculative_analysis_invalidated", args);
  },

  /** 추천 카드 선택부터 분석 패널이 사용할 수 있는 시점까지의 latency. */
  synergyCandidateAnalysisReady(args: {
    candidateRank: number;
    durationMs: number;
    mode: CandidateAnalysisMode;
  }) {
    track("synergy_candidate_analysis_ready", args);
  },

  /**
   * 시너지 결과 공유 버튼 클릭 — 바이럴 루프 측정.
   * scope: 공유가 발생한 페이지 (/synergy vs /synergy-detail)
   * method: native share sheet vs clipboard fallback
   */
  synergyShared(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    scope: "synergy" | "synergy_detail";
    method: "native" | "clipboard";
  }) {
    track("synergy_shared", args);
  },

  /**
   * 공유 링크로 유입된 세션 — synergyShared 의 짝.
   * AmplitudeProvider 가 init 직후 utm_source=ergg_share 를 감지하면 1회 fire.
   * scope/method 는 공유한 측의 utm_campaign/utm_medium 를 그대로 받음.
   */
  synergyLinkLanded(args: {
    landingPath: string;
    ally1Code: number | null;
    ally2Code: number | null;
    scope: "synergy" | "synergy_detail" | null;
    method: "native" | "clipboard" | null;
  }) {
    track("synergy_link_landed", args);
  },

  /** 광고 슬롯 DOM 렌더링 — 실제 광고 fill 여부와 무관하게 슬롯 노출 후보를 측정한다. */
  adSlotRendered(args: {
    slotName: AdSlotName;
    adSlotId: string;
    slotInstanceId: string;
    pagePath?: string;
    eventPagePath?: string;
    reservedHeight?: number;
    reservedWidth?: number | null;
  }) {
    track("ad_slot_rendered", {
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      slot_instance_id: args.slotInstanceId,
      ...getAdSlotPageProperties(args.pagePath, args.eventPagePath),
      viewport_eligible: isAdSlotViewportEligible(args.slotName),
      reserved_height: args.reservedHeight,
      reserved_width: args.reservedWidth,
      ...getAdPerformanceProperties(),
    });
  },

  /** 광고 슬롯이 viewport 에 50% 이상 1초 머문 경우. 클릭 추적은 AdSense 정책상 하지 않는다. */
  adSlotViewed(args: {
    slotName: AdSlotName;
    adSlotId: string;
    slotInstanceId: string;
    pagePath?: string;
    eventPagePath?: string;
    reservedHeight?: number;
    reservedWidth?: number | null;
    renderToViewableMs?: number;
    fillToViewableMs?: number;
  }) {
    track("ad_slot_viewed", {
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      slot_instance_id: args.slotInstanceId,
      ...getAdSlotPageProperties(args.pagePath, args.eventPagePath),
      viewport_eligible: isAdSlotViewportEligible(args.slotName),
      reserved_height: args.reservedHeight,
      reserved_width: args.reservedWidth,
      render_to_viewable_ms: args.renderToViewableMs,
      fill_to_viewable_ms: args.fillToViewableMs,
      ...getAdPerformanceProperties(),
    });
  },

  /** 광고 슬롯 lifecycle — fill/unfilled/timeout 비율을 성능 지표와 같이 본다. */
  adSlotStateChanged(args: {
    slotName: AdSlotName;
    adSlotId: string;
    slotInstanceId: string;
    status: AdSlotStatus;
    previousStatus: AdSlotStatus;
    timedOutBeforeStatus: boolean;
    isLateFill: boolean;
    pagePath?: string;
    eventPagePath?: string;
    reservedHeight: number;
    reservedWidth: number | null;
    elapsedSinceRenderMs?: number;
    requestToStateMs?: number;
  }) {
    track("ad_slot_state_changed", {
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      slot_instance_id: args.slotInstanceId,
      status: args.status,
      previous_status: args.previousStatus,
      timed_out_before_status: args.timedOutBeforeStatus,
      is_late_fill: args.isLateFill,
      ...getAdSlotPageProperties(args.pagePath, args.eventPagePath),
      viewport_eligible: isAdSlotViewportEligible(args.slotName),
      reserved_height: args.reservedHeight,
      reserved_width: args.reservedWidth,
      elapsed_since_render_ms: args.elapsedSinceRenderMs,
      request_to_state_ms: args.requestToStateMs,
      ...getAdPerformanceProperties(),
    });
  },

  /** 요청 후 최종 상태 없이 슬롯 lifecycle이 종료된 원인을 분리한다. */
  adSlotAbandoned(args: {
    slotName: AdSlotName;
    adSlotId: string;
    slotInstanceId: string;
    reason: AdSlotAbandonReason;
    hasIframe: boolean;
    observedAdStatus: "missing" | "filled" | "unfilled" | "other";
    documentVisibility: "visible" | "hidden" | "prerender" | "unknown";
    requestAgeBucket: "under_3s" | "3s_to_10s" | "10s_plus";
    pagePath?: string;
    eventPagePath?: string;
    reservedHeight: number;
    reservedWidth: number | null;
    elapsedSinceRenderMs?: number;
    elapsedSinceRequestMs: number;
  }) {
    const properties = {
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      slot_instance_id: args.slotInstanceId,
      abandon_reason: args.reason,
      has_iframe: args.hasIframe,
      observed_ad_status: args.observedAdStatus,
      document_visibility: args.documentVisibility,
      request_age_bucket: args.requestAgeBucket,
      ...getAdSlotPageProperties(args.pagePath, args.eventPagePath),
      viewport_eligible: isAdSlotViewportEligible(args.slotName),
      reserved_height: args.reservedHeight,
      reserved_width: args.reservedWidth,
      elapsed_since_render_ms: args.elapsedSinceRenderMs,
      elapsed_since_request_ms: args.elapsedSinceRequestMs,
      ...getAdPerformanceProperties(),
    };

    if (args.reason === "pagehide") {
      trackOnPageExit("ad_slot_abandoned", properties);
      return;
    }

    track("ad_slot_abandoned", properties);
  },

  /** AdSense loader 자체의 예약/로드/실패 상태와 그 시점까지의 main-thread 비용. */
  adScriptStateChanged(args: { state: Exclude<AdScriptState, "not_scheduled" | "loading"> }) {
    const pagePath = getCurrentPagePath();
    track("ad_script_state_changed", {
      state: args.state,
      page_path: pagePath,
      page_surface: getPageSurface(pagePath),
      ...getAdPerformanceProperties(),
    });
  },

  /** 광고 차단 해제 팝업 실험 노출 — 감지된 세션에서 실제 dialog가 열린 경우만 기록한다. */
  adBlockRecoveryPromptShown(args: {
    variant: AdBlockRecoveryVariant;
    locale: string;
    pagePath: string;
    detectionMethod: "cosmetic_bait";
  }) {
    trackAdBlockRecovery("ad_block_recovery_prompt_shown", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      locale: args.locale,
      page_path: args.pagePath,
      detection_method: args.detectionMethod,
    });
  },

  /** 명시적 닫기, 나중에, backdrop, Escape를 구분해 팝업 거부율을 측정한다. */
  adBlockRecoveryPromptDismissed(args: {
    variant: AdBlockRecoveryVariant;
    reason: AdBlockRecoveryDismissReason;
    locale: string;
    pagePath: string;
  }) {
    trackAdBlockRecovery("ad_block_recovery_prompt_dismissed", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      reason: args.reason,
      locale: args.locale,
      page_path: args.pagePath,
    });
  },

  /** 사용자가 광고 허용 후 확인을 위해 새로고침을 선택한 경우. */
  adBlockRecoveryReloadRequested(args: {
    variant: AdBlockRecoveryVariant;
    locale: string;
    pagePath: string;
  }) {
    trackAdBlockRecovery("ad_block_recovery_reload_requested", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      locale: args.locale,
      page_path: args.pagePath,
    });
  },

  /** 새로고침 뒤 광고 차단 bait가 정상 노출되어 해제 성공으로 확인된 경우. */
  adBlockRecoverySucceeded(args: {
    variant: AdBlockRecoveryVariant;
    attemptAgeMs: number;
    attemptPagePath: string;
    pagePath: string;
  }) {
    trackAdBlockRecovery("ad_block_recovery_succeeded", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      attempt_age_ms: args.attemptAgeMs,
      attempt_page_path: args.attemptPagePath,
      page_path: args.pagePath,
    });
  },

  // ── Identify (User / Session Properties) ───────────────────────────────────

  /** 광고 차단 해제 시도 후 실제 AdSense 슬롯이 filled 상태가 된 경우. */
  adBlockRecoveryAdFilled(args: {
    variant: AdBlockRecoveryVariant;
    slotName: AdSlotName;
    adSlotId: string;
    attemptAgeMs: number;
    attemptPagePath: string;
    pagePath?: string;
  }) {
    trackAdBlockRecovery("ad_block_recovery_ad_filled", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      attempt_age_ms: args.attemptAgeMs,
      attempt_page_path: args.attemptPagePath,
      page_path: args.pagePath,
      page_surface: getPageSurface(args.pagePath),
    });
  },

  /** 복구 후 채워진 광고가 viewport 50% 이상에서 1초 노출된 경우. */
  adBlockRecoveryAdViewed(args: {
    variant: AdBlockRecoveryVariant;
    slotName: AdSlotName;
    adSlotId: string;
    attemptAgeMs: number;
    attemptPagePath: string;
    pagePath?: string;
  }) {
    trackAdBlockRecovery("ad_block_recovery_ad_viewed", {
      experiment: AD_BLOCK_RECOVERY_EXPERIMENT,
      variant: args.variant,
      slot_name: args.slotName,
      ad_slot_id: args.adSlotId,
      attempt_age_ms: args.attemptAgeMs,
      attempt_page_path: args.attemptPagePath,
      page_path: args.pagePath,
      page_surface: getPageSurface(args.pagePath),
    });
  },

  /** Session Properties 설정 — AmplitudeProvider init 직후 1회 호출 */
  setSessionProperties(sessionProps: SessionProperties) {
    if (isDev) return;
    getAmplitude()
      .then((amplitude) => {
        const identify = new amplitude.Identify();
        (Object.entries(sessionProps) as Array<[keyof SessionProperties, unknown]>).forEach(
          ([key, value]) => {
            if (value !== undefined) identify.set(key, value as string | number | boolean);
          }
        );
        amplitude.identify(identify);
      })
      .catch(() => {});
  },

  /** User Properties 설정 — 장기 유지 속성 */
  setUserProperties(userProps: UserProperties) {
    if (isDev) return;
    getAmplitude()
      .then((amplitude) => {
        const identify = new amplitude.Identify();
        (Object.entries(userProps) as Array<[keyof UserProperties, unknown]>).forEach(
          ([key, value]) => {
            if (value !== undefined) identify.set(key, value as string | number | boolean);
          }
        );
        amplitude.identify(identify);
      })
      .catch(() => {});
  },

  // ── RUM (Real User Monitoring) ─────────────────────────────────────────────

  /**
   * Core Web Vitals 측정치 전송.
   * LCP/INP/CLS/TTFB/FCP 각각의 최종값이 페이지 hidden 시점에 1회 fire.
   * Amplitude 대시보드에서 metric_name × page_path × device × connection 으로 p75 산출.
   */
  webVitalReported(metric: {
    name: "LCP" | "INP" | "CLS" | "TTFB" | "FCP";
    value: number;
    delta: number;
    id: string;
    rating?: "good" | "needs-improvement" | "poor";
    navigationType?: string;
    pagePath?: string;
    attribution?: Record<string, string | number | boolean | null | undefined>;
  }) {
    const pagePath = metric.pagePath ?? getCurrentPagePath();
    const connection =
      typeof navigator !== "undefined"
        ? (navigator as unknown as { connection?: { effectiveType?: string } }).connection
        : undefined;

    track("web_vital_measured", {
      metric_name: metric.name,
      // CLS는 단위가 unitless 라 소수 3자리, 나머지는 ms 라 정수
      value:
        metric.name === "CLS" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value),
      delta:
        metric.name === "CLS" ? Math.round(metric.delta * 1000) / 1000 : Math.round(metric.delta),
      metric_id: metric.id,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      page_path: pagePath,
      page_surface: getPageSurface(pagePath),
      effective_connection_type: connection?.effectiveType,
      ad_slots_present:
        typeof document !== "undefined"
          ? document.querySelectorAll("[data-ad-slot-name]").length
          : 0,
      ...metric.attribution,
      ...getAdPerformanceProperties(),
    });
  },
};
