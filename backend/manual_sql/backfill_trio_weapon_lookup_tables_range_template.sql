-- ============================================================
-- v2_CharacterTrioWeapon lookup tables range backfill template
--
-- Supabase SQL Editor 에서 함수/달러쿼트($$) 선택 오류를 피하기 위한
-- 단일 range 백필 쿼리다.
--
-- 사용법:
--   1. 아래 bounds 의 start_id / end_id 만 수정한다.
--   2. 이 파일 전체를 실행한다.
--   3. 다음 range 로 숫자만 바꿔 반복 실행한다.
-- ============================================================

WITH bounds AS (
  SELECT
    1::BIGINT AS start_id,
    25000::BIGINT AS end_id
),
pair_rows AS (
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
  CROSS JOIN bounds
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
  WHERE src.id BETWEEN bounds.start_id AND bounds.end_id
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
    last_updated = NOW()
  RETURNING 1
),
member_rows AS (
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
  CROSS JOIN bounds
  CROSS JOIN LATERAL (
    VALUES
      (src.ally1_char, src.ally1_weapon),
      (src.ally2_char, src.ally2_weapon),
      (src.third_char, src.third_weapon)
  ) AS member_entry(member_char, member_weapon)
  WHERE src.id BETWEEN bounds.start_id AND bounds.end_id
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
    last_updated = NOW()
  RETURNING 1
)
SELECT
  (SELECT start_id FROM bounds) AS start_id,
  (SELECT end_id FROM bounds) AS end_id,
  (SELECT COUNT(*) FROM pair_rows) AS pair_rows,
  (SELECT COUNT(*) FROM member_rows) AS member_rows;
