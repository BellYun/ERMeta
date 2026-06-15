-- ============================================================
-- 기존 p10 사전집계 테이블 제거
--
-- 실행 조건:
--   1. 025_create_trio_weapon_search_all.sql 적용 완료
--   2. 프론트엔드/Nest API가 v2_CharacterTrioWeaponSearch_all 를 조회하도록 배포 완료
--   3. /api/stats/trios-weapon, get_trio_pair_synergy smoke 확인 완료
--
-- 자동 마이그레이션에 넣지 않는다. 배포 순서상 마지막에 수동 실행한다.
-- ============================================================

BEGIN;

DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_total_games;
DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_ally2_games;
DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_third_games;
DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_pair;
DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_pair_chars;
DROP INDEX IF EXISTS idx_v2_trio_weapon_search_p10_third;

DROP TABLE IF EXISTS "v2_CharacterTrioWeaponSearch_p10";

COMMIT;

