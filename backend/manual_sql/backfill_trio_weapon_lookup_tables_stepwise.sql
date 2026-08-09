-- ============================================================
-- v2_CharacterTrioWeapon lookup tables stepwise backfill
--
-- 목적:
--   - v2_CharacterTrioWeaponSearch_all 1 row 에서
--     pair lookup 3 rows + member lookup 3 rows 를 생성한다.
--   - SQL Editor timeout을 피하기 위해 source_search_id range 단위로 실행한다.
--
-- 실행 순서:
--   1. backend/migrations/028_trio_weapon_lookup_tables.sql 적용
--   2. [STEP 1] 초기화
--   3. [STEP 2] source id range 확인
--   4. [STEP 3] 함수 생성
--   5. [STEP 4] range 별 백필 실행
--   6. [STEP 5] 검증/ANALYZE
-- ============================================================


-- ============================================================
-- [STEP 1] 초기화
-- ============================================================

TRUNCATE TABLE "v2_CharacterTrioWeaponPairLookup";
TRUNCATE TABLE "v2_CharacterTrioWeaponMemberLookup";


-- ============================================================
-- [STEP 2] source id range 확인
-- ============================================================

SELECT
  MIN(id) AS min_id,
  MAX(id) AS max_id,
  COUNT(*) AS source_rows,
  COUNT(*) * 3 AS expected_lookup_rows_each
FROM "v2_CharacterTrioWeaponSearch_all";

-- 예시: 25,000 row 단위 실행 목록 생성
-- SELECT
--   start_id,
--   LEAST(start_id + 24999, bounds.max_id) AS end_id
-- FROM (
--   SELECT MIN(id) AS min_id, MAX(id) AS max_id
--   FROM "v2_CharacterTrioWeaponSearch_all"
-- ) bounds
-- CROSS JOIN LATERAL generate_series(bounds.min_id, bounds.max_id, 25000) AS start_id;


-- ============================================================
-- [STEP 3] range 백필 함수 생성
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_trio_weapon_lookup_tables_range(
  p_start_id BIGINT,
  p_end_id BIGINT
)
RETURNS TABLE (
  start_id BIGINT,
  end_id BIGINT,
  pair_rows BIGINT,
  member_rows BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_pair_rows BIGINT;
  v_member_rows BIGINT;
BEGIN
  INSERT INTO "v2_CharacterTrioWeaponPairLookup" (
    source_search_id,
    pair_key,
    pair_weapon_key,
    ally1_char,
    ally1_weapon,
    ally1_core,
    ally2_char,
    ally2_weapon,
    ally2_core,
    third_char,
    third_weapon,
    third_core,
    total_games,
    total_wins,
    total_rp,
    rank_sum,
    last_updated
  )
  SELECT
    src.id AS source_search_id,
    canonical_pair.char1::TEXT || ':' || canonical_pair.char2::TEXT AS pair_key,
    canonical_pair.char1::TEXT || ':' || canonical_pair.weapon1::TEXT ||
      '|' ||
      canonical_pair.char2::TEXT || ':' || canonical_pair.weapon2::TEXT AS pair_weapon_key,
    src.ally1_char,
    src.ally1_weapon,
    src.ally1_core,
    src.ally2_char,
    src.ally2_weapon,
    src.ally2_core,
    src.third_char,
    src.third_weapon,
    src.third_core,
    src.total_games,
    src.total_wins,
    src.total_rp,
    src.rank_sum,
    NOW() AS last_updated
  FROM "v2_CharacterTrioWeaponSearch_all" src
  CROSS JOIN LATERAL (
    VALUES
      (src.ally1_char, src.ally1_weapon, src.ally2_char, src.ally2_weapon),
      (src.ally1_char, src.ally1_weapon, src.third_char, src.third_weapon),
      (src.ally2_char, src.ally2_weapon, src.third_char, src.third_weapon)
  ) AS pair_member(char1, weapon1, char2, weapon2)
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN pair_member.char1 <= pair_member.char2 THEN pair_member.char1 ELSE pair_member.char2 END AS char1,
      CASE WHEN pair_member.char1 <= pair_member.char2 THEN pair_member.weapon1 ELSE pair_member.weapon2 END AS weapon1,
      CASE WHEN pair_member.char1 <= pair_member.char2 THEN pair_member.char2 ELSE pair_member.char1 END AS char2,
      CASE WHEN pair_member.char1 <= pair_member.char2 THEN pair_member.weapon2 ELSE pair_member.weapon1 END AS weapon2
  ) AS canonical_pair
  WHERE src.id BETWEEN p_start_id AND p_end_id
  ON CONFLICT (source_search_id, pair_key, pair_weapon_key)
  DO UPDATE SET
    ally1_char = EXCLUDED.ally1_char,
    ally1_weapon = EXCLUDED.ally1_weapon,
    ally1_core = EXCLUDED.ally1_core,
    ally2_char = EXCLUDED.ally2_char,
    ally2_weapon = EXCLUDED.ally2_weapon,
    ally2_core = EXCLUDED.ally2_core,
    third_char = EXCLUDED.third_char,
    third_weapon = EXCLUDED.third_weapon,
    third_core = EXCLUDED.third_core,
    total_games = EXCLUDED.total_games,
    total_wins = EXCLUDED.total_wins,
    total_rp = EXCLUDED.total_rp,
    rank_sum = EXCLUDED.rank_sum,
    last_updated = NOW();

  GET DIAGNOSTICS v_pair_rows = ROW_COUNT;

  INSERT INTO "v2_CharacterTrioWeaponMemberLookup" (
    source_search_id,
    member_key,
    member_weapon_key,
    ally1_char,
    ally1_weapon,
    ally1_core,
    ally2_char,
    ally2_weapon,
    ally2_core,
    third_char,
    third_weapon,
    third_core,
    total_games,
    total_wins,
    total_rp,
    rank_sum,
    last_updated
  )
  SELECT
    src.id AS source_search_id,
    member_entry.member_char::TEXT AS member_key,
    member_entry.member_char::TEXT || ':' || member_entry.member_weapon::TEXT AS member_weapon_key,
    src.ally1_char,
    src.ally1_weapon,
    src.ally1_core,
    src.ally2_char,
    src.ally2_weapon,
    src.ally2_core,
    src.third_char,
    src.third_weapon,
    src.third_core,
    src.total_games,
    src.total_wins,
    src.total_rp,
    src.rank_sum,
    NOW() AS last_updated
  FROM "v2_CharacterTrioWeaponSearch_all" src
  CROSS JOIN LATERAL (
    VALUES
      (src.ally1_char, src.ally1_weapon),
      (src.ally2_char, src.ally2_weapon),
      (src.third_char, src.third_weapon)
  ) AS member_entry(member_char, member_weapon)
  WHERE src.id BETWEEN p_start_id AND p_end_id
  ON CONFLICT (source_search_id, member_key, member_weapon_key)
  DO UPDATE SET
    ally1_char = EXCLUDED.ally1_char,
    ally1_weapon = EXCLUDED.ally1_weapon,
    ally1_core = EXCLUDED.ally1_core,
    ally2_char = EXCLUDED.ally2_char,
    ally2_weapon = EXCLUDED.ally2_weapon,
    ally2_core = EXCLUDED.ally2_core,
    third_char = EXCLUDED.third_char,
    third_weapon = EXCLUDED.third_weapon,
    third_core = EXCLUDED.third_core,
    total_games = EXCLUDED.total_games,
    total_wins = EXCLUDED.total_wins,
    total_rp = EXCLUDED.total_rp,
    rank_sum = EXCLUDED.rank_sum,
    last_updated = NOW();

  GET DIAGNOSTICS v_member_rows = ROW_COUNT;

  RETURN QUERY SELECT p_start_id, p_end_id, v_pair_rows, v_member_rows;
END;
$$;


-- ============================================================
-- [STEP 4] range 별 백필 실행
-- STEP 2의 generate_series 결과를 아래처럼 하나씩 실행한다.
-- timeout이 나면 range 크기를 10,000 또는 5,000으로 줄인다.
-- ============================================================

-- SELECT * FROM backfill_trio_weapon_lookup_tables_range(1, 25000);
-- SELECT * FROM backfill_trio_weapon_lookup_tables_range(25001, 50000);


-- ============================================================
-- [STEP 5] 검증/ANALYZE
-- ============================================================

SELECT
  (SELECT COUNT(*) FROM "v2_CharacterTrioWeaponSearch_all") AS source_rows,
  (SELECT COUNT(*) FROM "v2_CharacterTrioWeaponPairLookup") AS pair_lookup_rows,
  (SELECT COUNT(*) FROM "v2_CharacterTrioWeaponMemberLookup") AS member_lookup_rows;

SELECT
  pair_key,
  COUNT(*) AS rows
FROM "v2_CharacterTrioWeaponPairLookup"
GROUP BY pair_key
ORDER BY rows DESC
LIMIT 10;

SELECT
  member_key,
  COUNT(*) AS rows
FROM "v2_CharacterTrioWeaponMemberLookup"
GROUP BY member_key
ORDER BY rows DESC
LIMIT 10;

ANALYZE "v2_CharacterTrioWeaponPairLookup";
ANALYZE "v2_CharacterTrioWeaponMemberLookup";

-- Index scan 확인 예시: 실제 많이 쓰는 캐릭터 코드로 바꿔서 실행한다.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  ally1_char,
  ally1_weapon,
  ally2_char,
  ally2_weapon,
  third_char,
  third_weapon,
  total_games
FROM "v2_CharacterTrioWeaponPairLookup"
WHERE pair_key_hash = md5('1:2')
  AND pair_key = '1:2'
ORDER BY total_games DESC
LIMIT 100;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  ally1_char,
  ally1_weapon,
  ally2_char,
  ally2_weapon,
  third_char,
  third_weapon,
  total_games
FROM "v2_CharacterTrioWeaponMemberLookup"
WHERE member_key_hash = md5('1')
  AND member_key = '1'
ORDER BY total_games DESC
LIMIT 100;


-- ============================================================
-- [OPTIONAL] 정리
-- ============================================================

-- DROP FUNCTION IF EXISTS backfill_trio_weapon_lookup_tables_range(BIGINT, BIGINT);
