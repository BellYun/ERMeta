-- ============================================================
-- v2_CharacterTrioWeaponSearch_p10 단일 캐릭터 검색 인덱스 추가
--
-- 문제:
--   - 단일 캐릭터(char1만) 조합 추천 시 ally2_char/third_char 단일 매칭 쿼리
--   - 기존 인덱스는 ally1_char prefix 또는 (third_char, third_weapon) 만 있어
--     ally2_char=X 쿼리에서 seq scan → statement timeout (57014)
--
-- 해결:
--   - ally2_char 시작 인덱스 추가
--   - third_char에 total_games DESC 정렬 키 추가
-- ============================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_p10_ally2_games
ON "v2_CharacterTrioWeaponSearch_p10" (
  ally2_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_p10_third_games
ON "v2_CharacterTrioWeaponSearch_p10" (
  third_char,
  total_games DESC
);

COMMIT;
