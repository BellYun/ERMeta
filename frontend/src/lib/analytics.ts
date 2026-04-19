type AmplitudeModule = typeof import("@amplitude/analytics-browser");

const isDev = process.env.NODE_ENV === "development";

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

export type SynergySortBy = "averageRP" | "winRate" | "totalGames" | "recommended";

export type SessionSource = "organic_search" | "community" | "direct" | "social" | "internal";

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

  /** 메인 페이지 - 캐릭터 티어표 S/A/B/C/D 탭 필터 */
  rankingTierTabChanged(tab: string) {
    track("ranking_tier_tab_changed", { tab });
  },

  /** 캐릭터 분석 - 캐릭터 조회 (NSM auto-trigger: character_analysis) */
  characterViewed(characterCode: number, characterName: string) {
    track("character_viewed", { characterCode, characterName });
    if (markAndCheckFirstTime("character_analysis")) {
      track("core_feature_used", {
        feature: "character_analysis",
        firstTimeInSession: true,
      });
    }
  },

  /** 캐릭터 분석 - 무기 선택 */
  weaponSelected(characterCode: number, weaponCode: number, weaponName: string) {
    track("weapon_selected", { characterCode, weaponCode, weaponName });
  },

  /** 캐릭터 분석 - 분석 티어 그룹 변경 */
  analysisTierChanged(tier: string) {
    track("analysis_tier_changed", { tier });
  },

  /** 캐릭터 분석 - 탭 전환 */
  analysisTabChanged(tab: string) {
    track("analysis_tab_changed", { tab });
  },

  /** 캐릭터 분석 - 캐릭터 검색 */
  characterSearched(query: string) {
    track("character_searched", { query });
  },

  /** 시너지 - 동료 캐릭터 선택 (NSM auto-trigger: synergy_search) */
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

  /** 시너지 추천 3번째 캐릭터 클릭 */
  synergyRecommendationClicked(args: {
    ally1Code: number | null;
    ally2Code: number | null;
    pickedCode: number;
    pickedRank: number;
    sortBy: SynergySortBy;
  }) {
    track("synergy_recommendation_clicked", { ...args, source: "synergy" as const });
  },

  // ── Identify (User / Session Properties) ───────────────────────────────────

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
};
