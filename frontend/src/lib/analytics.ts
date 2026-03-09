import * as amplitude from "@amplitude/unified"

export const analytics = {
  /** 메인 페이지 - 매치메이킹 티어 그룹 변경 */
  tierGroupSelected(tier: string) {
    amplitude.track("tier_group_selected", { tier })
  },

  /** 메인 페이지 - 패치 버전 변경 */
  patchSelected(patch: string) {
    amplitude.track("patch_selected", { patch })
  },

  /** 메인 페이지 - 캐릭터 티어표 S/A/B/C/D 탭 필터 */
  rankingTierTabChanged(tab: string) {
    amplitude.track("ranking_tier_tab_changed", { tab })
  },

  /** 캐릭터 분석 - 캐릭터 조회 */
  characterViewed(characterCode: number, characterName: string) {
    amplitude.track("character_viewed", { characterCode, characterName })
  },

  /** 캐릭터 분석 - 무기 선택 */
  weaponSelected(characterCode: number, weaponCode: number, weaponName: string) {
    amplitude.track("weapon_selected", { characterCode, weaponCode, weaponName })
  },

  /** 캐릭터 분석 - 분석 티어 그룹 변경 */
  analysisTierChanged(tier: string) {
    amplitude.track("analysis_tier_changed", { tier })
  },

  /** 캐릭터 분석 - 탭 전환 */
  analysisTabChanged(tab: string) {
    amplitude.track("analysis_tab_changed", { tab })
  },

  /** 캐릭터 분석 - 캐릭터 검색 */
  characterSearched(query: string) {
    amplitude.track("character_searched", { query })
  },

  /** 시너지 - 동료 캐릭터 선택 */
  synergyAllySelected(slot: "A" | "B", characterCode: number, characterName: string) {
    amplitude.track("synergy_ally_selected", { slot, characterCode, characterName })
  },

  /** 시너지 - 정렬 방식 변경 */
  synergySortChanged(sortBy: string) {
    amplitude.track("synergy_sort_changed", { sortBy })
  },
}
