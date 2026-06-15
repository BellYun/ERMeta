-- ============================================================
-- v2_CharacterTrioWeaponSearch_all stepwise backfill
--
-- 목적:
--   - SQL Editor upstream timeout을 피하기 위해 전체 재집계를 한 번에 하지 않고
--     patch_version/tier 단위로 나누어 적재한다.
--   - 포함 tier: DIAMOND, METEORITE, MITHRIL, IN1000
--   - v2_CharacterTrioWeapon 의 저장 순서를 신뢰하지 않고
--     (character, weapon, core) 기준 canonical 순서로 다시 정렬해 합산한다.
--
-- 실행 순서:
--   1. backend/migrations/025_create_trio_weapon_search_all.sql 실행
--   2. [STEP 1] 초기화 실행
--   3. [STEP 2] 적재 대상 patch/tier 목록 확인
--   4. [STEP 3] 목록에 나온 patch_version/tier 조합을 하나씩 실행
--   5. [STEP 4] 검증/ANALYZE 실행
-- ============================================================


-- ============================================================
-- [STEP 1] 초기화
-- ============================================================

TRUNCATE TABLE "v2_CharacterTrioWeaponSearch_all";


-- ============================================================
-- [STEP 2] 적재 대상 patch/tier 목록 확인
-- 결과로 나온 patch_version/tier를 STEP 3 함수 호출에 넣어 하나씩 실행한다.
-- ============================================================

SELECT
  patch_version,
  tier,
  COUNT(*) AS source_rows,
  SUM(total_games) AS source_games
FROM "v2_CharacterTrioWeapon"
WHERE tier IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
  AND character1 NOT IN (9998, 9999)
  AND character2 NOT IN (9998, 9999)
  AND character3 NOT IN (9998, 9999)
GROUP BY patch_version, tier
ORDER BY
  split_part(patch_version, '.', 1)::INT,
  split_part(patch_version, '.', 2)::INT,
  CASE tier
    WHEN 'DIAMOND' THEN 1
    WHEN 'METEORITE' THEN 2
    WHEN 'MITHRIL' THEN 3
    WHEN 'IN1000' THEN 4
    ELSE 9
  END;


-- ============================================================
-- [STEP 3] patch/tier 1개 단위 적재 함수 생성
-- 이 함수 생성은 1회만 실행하면 된다.
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_trio_weapon_search_all_slice(
  p_patch_version TEXT,
  p_tier TEXT
)
RETURNS TABLE (
  patch_version TEXT,
  tier TEXT,
  affected_rows BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows BIGINT;
BEGIN
  INSERT INTO "v2_CharacterTrioWeaponSearch_all" (
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
    norm.ally1_char,
    norm.ally1_weapon,
    norm.ally1_core,
    norm.ally2_char,
    norm.ally2_weapon,
    norm.ally2_core,
    norm.third_char,
    norm.third_weapon,
    norm.third_core,
    SUM(src.total_games)::INTEGER AS total_games,
    SUM(src.total_wins)::INTEGER AS total_wins,
    SUM(src.total_rp) AS total_rp,
    SUM(src.rank_sum) AS rank_sum,
    NOW() AS last_updated
  FROM "v2_CharacterTrioWeapon" src
  CROSS JOIN LATERAL (
    SELECT
      MAX(character_num) FILTER (WHERE rn = 1) AS ally1_char,
      MAX(weapon_type) FILTER (WHERE rn = 1) AS ally1_weapon,
      MAX(main_core) FILTER (WHERE rn = 1) AS ally1_core,
      MAX(character_num) FILTER (WHERE rn = 2) AS ally2_char,
      MAX(weapon_type) FILTER (WHERE rn = 2) AS ally2_weapon,
      MAX(main_core) FILTER (WHERE rn = 2) AS ally2_core,
      MAX(character_num) FILTER (WHERE rn = 3) AS third_char,
      MAX(weapon_type) FILTER (WHERE rn = 3) AS third_weapon,
      MAX(main_core) FILTER (WHERE rn = 3) AS third_core
    FROM (
      SELECT
        member.character_num,
        member.weapon_type,
        member.main_core,
        ROW_NUMBER() OVER (
          ORDER BY member.character_num, member.weapon_type, member.main_core
        ) AS rn
      FROM (
        VALUES
          (src.character1, src.weapon_type1, COALESCE(src.main_core1, 0)),
          (src.character2, src.weapon_type2, COALESCE(src.main_core2, 0)),
          (src.character3, src.weapon_type3, COALESCE(src.main_core3, 0))
      ) AS member(character_num, weapon_type, main_core)
    ) ordered_members
  ) norm
  WHERE src.patch_version = p_patch_version
    AND src.tier = p_tier
    AND src.tier IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
    AND src.character1 NOT IN (9998, 9999)
    AND src.character2 NOT IN (9998, 9999)
    AND src.character3 NOT IN (9998, 9999)
  GROUP BY
    norm.ally1_char,
    norm.ally1_weapon,
    norm.ally1_core,
    norm.ally2_char,
    norm.ally2_weapon,
    norm.ally2_core,
    norm.third_char,
    norm.third_weapon,
    norm.third_core
  ON CONFLICT (
    ally1_char,
    ally1_weapon,
    ally1_core,
    ally2_char,
    ally2_weapon,
    ally2_core,
    third_char,
    third_weapon,
    third_core
  )
  DO UPDATE SET
    total_games = "v2_CharacterTrioWeaponSearch_all".total_games + EXCLUDED.total_games,
    total_wins = "v2_CharacterTrioWeaponSearch_all".total_wins + EXCLUDED.total_wins,
    total_rp = "v2_CharacterTrioWeaponSearch_all".total_rp + EXCLUDED.total_rp,
    rank_sum = "v2_CharacterTrioWeaponSearch_all".rank_sum + EXCLUDED.rank_sum,
    last_updated = NOW();

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN QUERY SELECT p_patch_version, p_tier, v_rows;
END;
$$;


-- ============================================================
-- [STEP 3-1] 실행 예시
-- STEP 2 결과에 나온 조합을 아래처럼 하나씩 실행한다.
-- 한 줄이 timeout 나면 해당 patch/tier는 실행하지 말고, STEP 3-2 범위 함수로 나누어 실행한다.
-- ============================================================

-- SELECT * FROM backfill_trio_weapon_search_all_slice('10.8', 'DIAMOND');
-- SELECT * FROM backfill_trio_weapon_search_all_slice('10.8', 'METEORITE');
-- SELECT * FROM backfill_trio_weapon_search_all_slice('10.8', 'MITHRIL');
-- SELECT * FROM backfill_trio_weapon_search_all_slice('10.8', 'IN1000');


-- ============================================================
-- [STEP 3-2] timeout fallback: patch/tier/character1 범위 단위 적재
-- 주의: 같은 patch/tier에 대해 STEP 3-1 전체 slice와 STEP 3-2 범위 slice를
--       동시에 실행하면 중복 합산된다. timeout 난 patch/tier에만 범위 함수를 사용한다.
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_trio_weapon_search_all_slice_by_character1(
  p_patch_version TEXT,
  p_tier TEXT,
  p_character1_from INT,
  p_character1_to INT
)
RETURNS TABLE (
  patch_version TEXT,
  tier TEXT,
  character1_from INT,
  character1_to INT,
  affected_rows BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows BIGINT;
BEGIN
  INSERT INTO "v2_CharacterTrioWeaponSearch_all" (
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
    norm.ally1_char,
    norm.ally1_weapon,
    norm.ally1_core,
    norm.ally2_char,
    norm.ally2_weapon,
    norm.ally2_core,
    norm.third_char,
    norm.third_weapon,
    norm.third_core,
    SUM(src.total_games)::INTEGER AS total_games,
    SUM(src.total_wins)::INTEGER AS total_wins,
    SUM(src.total_rp) AS total_rp,
    SUM(src.rank_sum) AS rank_sum,
    NOW() AS last_updated
  FROM "v2_CharacterTrioWeapon" src
  CROSS JOIN LATERAL (
    SELECT
      MAX(character_num) FILTER (WHERE rn = 1) AS ally1_char,
      MAX(weapon_type) FILTER (WHERE rn = 1) AS ally1_weapon,
      MAX(main_core) FILTER (WHERE rn = 1) AS ally1_core,
      MAX(character_num) FILTER (WHERE rn = 2) AS ally2_char,
      MAX(weapon_type) FILTER (WHERE rn = 2) AS ally2_weapon,
      MAX(main_core) FILTER (WHERE rn = 2) AS ally2_core,
      MAX(character_num) FILTER (WHERE rn = 3) AS third_char,
      MAX(weapon_type) FILTER (WHERE rn = 3) AS third_weapon,
      MAX(main_core) FILTER (WHERE rn = 3) AS third_core
    FROM (
      SELECT
        member.character_num,
        member.weapon_type,
        member.main_core,
        ROW_NUMBER() OVER (
          ORDER BY member.character_num, member.weapon_type, member.main_core
        ) AS rn
      FROM (
        VALUES
          (src.character1, src.weapon_type1, COALESCE(src.main_core1, 0)),
          (src.character2, src.weapon_type2, COALESCE(src.main_core2, 0)),
          (src.character3, src.weapon_type3, COALESCE(src.main_core3, 0))
      ) AS member(character_num, weapon_type, main_core)
    ) ordered_members
  ) norm
  WHERE src.patch_version = p_patch_version
    AND src.tier = p_tier
    AND src.character1 BETWEEN p_character1_from AND p_character1_to
    AND src.tier IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
    AND src.character1 NOT IN (9998, 9999)
    AND src.character2 NOT IN (9998, 9999)
    AND src.character3 NOT IN (9998, 9999)
  GROUP BY
    norm.ally1_char,
    norm.ally1_weapon,
    norm.ally1_core,
    norm.ally2_char,
    norm.ally2_weapon,
    norm.ally2_core,
    norm.third_char,
    norm.third_weapon,
    norm.third_core
  ON CONFLICT (
    ally1_char,
    ally1_weapon,
    ally1_core,
    ally2_char,
    ally2_weapon,
    ally2_core,
    third_char,
    third_weapon,
    third_core
  )
  DO UPDATE SET
    total_games = "v2_CharacterTrioWeaponSearch_all".total_games + EXCLUDED.total_games,
    total_wins = "v2_CharacterTrioWeaponSearch_all".total_wins + EXCLUDED.total_wins,
    total_rp = "v2_CharacterTrioWeaponSearch_all".total_rp + EXCLUDED.total_rp,
    rank_sum = "v2_CharacterTrioWeaponSearch_all".rank_sum + EXCLUDED.rank_sum,
    last_updated = NOW();

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN QUERY SELECT p_patch_version, p_tier, p_character1_from, p_character1_to, v_rows;
END;
$$;

-- SELECT * FROM backfill_trio_weapon_search_all_slice_by_character1('10.8', 'DIAMOND', 1, 30);
-- SELECT * FROM backfill_trio_weapon_search_all_slice_by_character1('10.8', 'DIAMOND', 31, 60);
-- SELECT * FROM backfill_trio_weapon_search_all_slice_by_character1('10.8', 'DIAMOND', 61, 90);


-- ============================================================
-- [STEP 4] 검증/ANALYZE
-- ============================================================

SELECT
  COUNT(*) AS search_rows,
  SUM(total_games) AS search_games
FROM "v2_CharacterTrioWeaponSearch_all";

SELECT
  SUM(total_games) AS expected_games
FROM "v2_CharacterTrioWeapon"
WHERE tier IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
  AND character1 NOT IN (9998, 9999)
  AND character2 NOT IN (9998, 9999)
  AND character3 NOT IN (9998, 9999);

ANALYZE "v2_CharacterTrioWeaponSearch_all";


-- ============================================================
-- [OPTIONAL] 정리
-- 적재가 끝나고 더 이상 함수가 필요 없으면 실행한다.
-- ============================================================

-- DROP FUNCTION IF EXISTS backfill_trio_weapon_search_all_slice(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS backfill_trio_weapon_search_all_slice_by_character1(TEXT, TEXT, INT, INT);
