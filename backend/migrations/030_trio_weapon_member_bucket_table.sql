-- ============================================================
-- pre-aggregated trio-weapon member bucket table
--
-- 목적:
--   - 요청마다 get_trio_weapon_member_bucket RPC가 수천 개 row를 JSONB_AGG
--     하면서 PostgREST statement timeout을 넘기는 문제를 제거한다.
--   - character+weapon별 compact tuple을 패치 집계 시점에 한 번 생성하고,
--     API 요청에서는 PK로 한 행만 읽는다.
--
-- tuple contract:
--   [
--     character1, weapon1,
--     character2, weapon2,
--     character3, weapon3,
--     total_games, total_wins, total_rp, rank_sum
--   ]
--
-- 갱신 시점:
--   - v2_CharacterTrioWeaponPairLookup_agg_next 백필/교체가 끝난 뒤
--     refresh_trio_weapon_member_buckets()를 호출한다.
--   - 함수는 새 버킷을 임시 테이블에 완성한 뒤 현재 테이블에 반영한다.
--     전체 호출이 한 트랜잭션이므로 독자는 commit 전에는 이전 버킷을,
--     commit 후에는 새 버킷을 보며 중간 상태를 보지 않는다.
-- ============================================================

BEGIN;

SET LOCAL statement_timeout = '10min';

CREATE TABLE IF NOT EXISTS public."v2_CharacterTrioWeaponMemberBucket" (
  character_code  INTEGER NOT NULL,
  weapon_code     INTEGER NOT NULL,
  item_count      INTEGER NOT NULL,
  items           JSONB NOT NULL,
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (character_code, weapon_code),

  CONSTRAINT v2_trio_weapon_member_bucket_character_positive
    CHECK (character_code > 0),
  CONSTRAINT v2_trio_weapon_member_bucket_weapon_positive
    CHECK (weapon_code > 0),
  CONSTRAINT v2_trio_weapon_member_bucket_items_array
    CHECK (JSONB_TYPEOF(items) = 'array'),
  CONSTRAINT v2_trio_weapon_member_bucket_count_matches
    CHECK (item_count = JSONB_ARRAY_LENGTH(items))
);

ALTER TABLE public."v2_CharacterTrioWeaponMemberBucket"
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read trio weapon member bucket"
ON public."v2_CharacterTrioWeaponMemberBucket";

CREATE POLICY "Allow public read trio weapon member bucket"
ON public."v2_CharacterTrioWeaponMemberBucket"
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public."v2_CharacterTrioWeaponMemberBucket"
FROM anon, authenticated;

GRANT SELECT
ON public."v2_CharacterTrioWeaponMemberBucket"
TO anon, authenticated, service_role;


-- ============================================================
-- 전체 버킷 원자적 재생성
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_trio_weapon_member_buckets()
RETURNS TABLE (
  bucket_count INTEGER,
  tuple_count BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = '10min'
AS $$
DECLARE
  v_refreshed_at TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
  IF TO_REGCLASS('public."v2_CharacterTrioWeaponPairLookup_agg_next"') IS NULL THEN
    RAISE EXCEPTION
      'source table public.v2_CharacterTrioWeaponPairLookup_agg_next does not exist';
  END IF;

  DROP TABLE IF EXISTS pg_temp.trio_weapon_member_bucket_refresh;

  CREATE TEMP TABLE trio_weapon_member_bucket_refresh
  ON COMMIT DROP
  AS
  WITH canonical_trios AS (
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
    WHERE
      -- pair lookup은 trio당 3행이므로 ally1+ally2 pair만 대표로 사용한다.
      source.pair_key = source.ally1_char::TEXT || ':' || source.ally2_char::TEXT
      AND source.ally1_char NOT IN (9998, 9999)
      AND source.ally2_char NOT IN (9998, 9999)
      AND source.third_char NOT IN (9998, 9999)
      AND source.ally1_weapon > 0
      AND source.ally2_weapon > 0
      AND source.third_weapon > 0
  ),
  member_trios AS (
    SELECT
      member.character_code,
      member.weapon_code,
      trio.ally1_char,
      trio.ally1_weapon,
      trio.ally2_char,
      trio.ally2_weapon,
      trio.third_char,
      trio.third_weapon,
      trio.total_games,
      trio.total_wins,
      trio.total_rp,
      trio.rank_sum
    FROM canonical_trios AS trio
    CROSS JOIN LATERAL (
      VALUES
        (trio.ally1_char, trio.ally1_weapon),
        (trio.ally2_char, trio.ally2_weapon),
        (trio.third_char, trio.third_weapon)
    ) AS member(character_code, weapon_code)
  )
  SELECT
    member_trios.character_code,
    member_trios.weapon_code,
    COUNT(*)::INTEGER AS item_count,
    JSONB_AGG(
      JSONB_BUILD_ARRAY(
        member_trios.ally1_char,
        member_trios.ally1_weapon,
        member_trios.ally2_char,
        member_trios.ally2_weapon,
        member_trios.third_char,
        member_trios.third_weapon,
        member_trios.total_games,
        member_trios.total_wins,
        member_trios.total_rp,
        member_trios.rank_sum
      )
      ORDER BY
        member_trios.total_games DESC,
        member_trios.ally1_char,
        member_trios.ally2_char,
        member_trios.third_char,
        member_trios.ally1_weapon,
        member_trios.ally2_weapon,
        member_trios.third_weapon
    ) AS items
  FROM member_trios
  GROUP BY
    member_trios.character_code,
    member_trios.weapon_code;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_temp.trio_weapon_member_bucket_refresh
  ) THEN
    RAISE EXCEPTION
      'refusing to replace trio weapon member buckets with an empty result';
  END IF;

  INSERT INTO public."v2_CharacterTrioWeaponMemberBucket" (
    character_code,
    weapon_code,
    item_count,
    items,
    refreshed_at
  )
  SELECT
    staged.character_code,
    staged.weapon_code,
    staged.item_count,
    staged.items,
    v_refreshed_at
  FROM pg_temp.trio_weapon_member_bucket_refresh AS staged
  ON CONFLICT (character_code, weapon_code)
  DO UPDATE SET
    item_count = EXCLUDED.item_count,
    items = EXCLUDED.items,
    refreshed_at = EXCLUDED.refreshed_at;

  DELETE FROM public."v2_CharacterTrioWeaponMemberBucket" AS current
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_temp.trio_weapon_member_bucket_refresh AS staged
    WHERE staged.character_code = current.character_code
      AND staged.weapon_code = current.weapon_code
  );

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS bucket_count,
    COALESCE(SUM(staged.item_count), 0)::BIGINT AS tuple_count,
    v_refreshed_at AS refreshed_at
  FROM pg_temp.trio_weapon_member_bucket_refresh AS staged;
END;
$$;

COMMENT ON TABLE public."v2_CharacterTrioWeaponMemberBucket"
IS 'Pre-aggregated compact trio tuples keyed by character+weapon for request-time single-row lookup.';

COMMENT ON FUNCTION public.refresh_trio_weapon_member_buckets()
IS 'Atomically rebuilds character+weapon tuple buckets from canonical rows in v2_CharacterTrioWeaponPairLookup_agg_next.';

REVOKE ALL
ON FUNCTION public.refresh_trio_weapon_member_buckets()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.refresh_trio_weapon_member_buckets()
TO service_role;


-- 기존 source로 최초 버킷을 채운다. 빈 결과면 함수가 예외를 발생시켜
-- 테이블/API 전환이 불완전한 상태로 commit되는 것을 막는다.
SELECT *
FROM public.refresh_trio_weapon_member_buckets();

ANALYZE public."v2_CharacterTrioWeaponMemberBucket";

COMMIT;

-- 새 table/function을 PostgREST가 즉시 인식하도록 schema cache를 갱신한다.
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 배포 전 검증
-- ============================================================

-- 1) 버킷 수, tuple 수, 갱신 시각
-- SELECT
--   COUNT(*) AS bucket_count,
--   SUM(item_count) AS tuple_count,
--   MIN(refreshed_at) AS oldest_bucket,
--   MAX(refreshed_at) AS newest_bucket
-- FROM public."v2_CharacterTrioWeaponMemberBucket";

-- 2) 대표 버킷 크기
-- SELECT
--   character_code,
--   weapon_code,
--   item_count,
--   ROUND(OCTET_LENGTH(items::TEXT) / 1024.0 / 1024.0, 3) AS items_mib
-- FROM public."v2_CharacterTrioWeaponMemberBucket"
-- ORDER BY item_count DESC
-- LIMIT 10;

-- 3) 패치 집계 테이블 교체 후 재생성
-- SELECT * FROM public.refresh_trio_weapon_member_buckets();

-- 롤백:
-- DROP FUNCTION IF EXISTS public.refresh_trio_weapon_member_buckets();
-- DROP TABLE IF EXISTS public."v2_CharacterTrioWeaponMemberBucket";
