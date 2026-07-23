-- ============================================================
-- compact trio-weapon member bucket RPC
--
-- 목적:
--   - 기존 pair lookup 사전집계 테이블을 그대로 재사용한다.
--   - trio 하나가 세 pair row로 복제된 구조에서 ally1+ally2 pair row만
--     대표 행으로 선택하여 중복을 제거한다.
--   - character+weapon 한 개를 저카디널리티 캐시 키로 사용하고,
--     PostgREST row limit을 피하도록 compact tuple JSONB 한 행을 반환한다.
--
-- tuple contract:
--   [
--     character1, weapon1,
--     character2, weapon2,
--     character3, weapon3,
--     total_games, total_wins, total_rp, rank_sum
--   ]
--
-- 실행:
--   - Supabase SQL Editor 또는 migration runner에서 파일 전체를 실행한다.
--   - 일반 CREATE INDEX는 읽기를 막지 않지만 쓰기는 완료 시점까지 대기하므로
--     pair lookup 백필/교체 작업과 겹치지 않는 시간에 실행한다.
-- ============================================================

BEGIN;

SET LOCAL statement_timeout = '10min';

-- ============================================================
-- canonical trio row의 세 member+weapon을 찾는 GIN index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_pair_agg_member_weapons
ON public."v2_CharacterTrioWeaponPairLookup_agg_next"
USING GIN (
  (
    ARRAY[
      ally1_char::TEXT || ':' || ally1_weapon::TEXT,
      ally2_char::TEXT || ':' || ally2_weapon::TEXT,
      third_char::TEXT || ':' || third_weapon::TEXT
    ]
  )
)
WHERE pair_key = ally1_char::TEXT || ':' || ally2_char::TEXT;


-- ============================================================
-- compact tuple RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trio_weapon_member_bucket(
  p_character INTEGER,
  p_weapon INTEGER
)
RETURNS TABLE (
  item_count INTEGER,
  items JSONB
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH matched AS (
    SELECT
      source.ally1_char,
      source.ally1_weapon,
      source.ally2_char,
      source.ally2_weapon,
      source.third_char,
      source.third_weapon,
      source.total_games,
      source.total_wins,
      source.total_rp,
      source.rank_sum
    FROM public."v2_CharacterTrioWeaponPairLookup_agg_next" AS source
    WHERE p_character > 0
      AND p_weapon > 0
      AND p_character NOT IN (9998, 9999)
      -- pair lookup은 trio당 3행이므로 ally1+ally2 pair만 대표로 사용한다.
      AND source.pair_key = source.ally1_char::TEXT || ':' || source.ally2_char::TEXT
      AND ARRAY[
        source.ally1_char::TEXT || ':' || source.ally1_weapon::TEXT,
        source.ally2_char::TEXT || ':' || source.ally2_weapon::TEXT,
        source.third_char::TEXT || ':' || source.third_weapon::TEXT
      ] @> ARRAY[p_character::TEXT || ':' || p_weapon::TEXT]
  )
  SELECT
    COUNT(*)::INTEGER AS item_count,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_ARRAY(
          matched.ally1_char,
          matched.ally1_weapon,
          matched.ally2_char,
          matched.ally2_weapon,
          matched.third_char,
          matched.third_weapon,
          matched.total_games,
          matched.total_wins,
          matched.total_rp,
          matched.rank_sum
        )
        ORDER BY
          matched.total_games DESC,
          matched.ally1_char,
          matched.ally2_char,
          matched.third_char
      ),
      '[]'::JSONB
    ) AS items
  FROM matched;
$$;

COMMENT ON FUNCTION public.get_trio_weapon_member_bucket(INTEGER, INTEGER)
IS 'Returns one compact no-core trio tuple bucket for a character+weapon from the canonical rows of v2_CharacterTrioWeaponPairLookup_agg_next.';

REVOKE ALL
ON FUNCTION public.get_trio_weapon_member_bucket(INTEGER, INTEGER)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_trio_weapon_member_bucket(INTEGER, INTEGER)
TO anon, authenticated, service_role;

COMMIT;


-- 검증:
-- SELECT item_count,
--        ROUND(OCTET_LENGTH(items::TEXT) / 1024.0 / 1024.0, 3) AS items_mib
-- FROM public.get_trio_weapon_member_bucket(22, 3);
-- 기대값(현재 데이터): item_count 약 6,432, items 약 0.25 MiB.

-- 롤백:
-- DROP FUNCTION IF EXISTS public.get_trio_weapon_member_bucket(INTEGER, INTEGER);
-- DROP INDEX IF EXISTS idx_v2_trio_weapon_pair_agg_member_weapons;
