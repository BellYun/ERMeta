-- ============================================================
-- v2_CharacterTrioWeaponSeason_next rebuild
--
-- Source of truth:
--   public."v2_CharacterTrioWeapon"
--
-- Aggregation:
--   - patch 10.x -> patch_major = '10'
--   - patch 11.x -> patch_major = '11'
--   - tiers: DIAMOND, METEORITE, MITHRIL, IN1000
--   - exclude sentinel characters 9998/9999
--   - canonicalize the three (character, weapon, core) members
--   - merge patch/tier slices into one row per season and trio
--
-- Safety:
--   - does not read from the stale Search_p10 table
--   - refuses to overwrite an existing _next table
--   - rolls back everything if source/target totals do not match
-- ============================================================

BEGIN;

SET LOCAL statement_timeout = '0';


-- ============================================================
-- 1. Preconditions
-- ============================================================

DO $$
BEGIN
  IF TO_REGCLASS(
    'public."v2_CharacterTrioWeaponSeason_next"'
  ) IS NOT NULL THEN
    RAISE EXCEPTION
      'public.v2_CharacterTrioWeaponSeason_next already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."v2_CharacterTrioWeapon" AS source
    WHERE REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
            ~ '^(10|11)([.]|$)'
      AND source.tier IN (
        'DIAMOND',
        'METEORITE',
        'MITHRIL',
        'IN1000'
      )
      AND source.character1 NOT IN (9998, 9999)
      AND source.character2 NOT IN (9998, 9999)
      AND source.character3 NOT IN (9998, 9999)
  ) THEN
    RAISE EXCEPTION
      'no season 10/11 source rows found in v2_CharacterTrioWeapon';
  END IF;
END;
$$;


-- ============================================================
-- 2. Staging table
-- ============================================================

CREATE TABLE public."v2_CharacterTrioWeaponSeason_next" (
  id            BIGSERIAL PRIMARY KEY,
  patch_major   TEXT NOT NULL,

  ally1_char    INTEGER NOT NULL,
  ally1_weapon  INTEGER NOT NULL,
  ally1_core    INTEGER NOT NULL DEFAULT 0,

  ally2_char    INTEGER NOT NULL,
  ally2_weapon  INTEGER NOT NULL,
  ally2_core    INTEGER NOT NULL DEFAULT 0,

  third_char    INTEGER NOT NULL,
  third_weapon  INTEGER NOT NULL,
  third_core    INTEGER NOT NULL DEFAULT 0,

  total_games   INTEGER NOT NULL DEFAULT 0,
  total_wins    INTEGER NOT NULL DEFAULT 0,
  total_rp      NUMERIC NOT NULL DEFAULT 0,
  rank_sum      NUMERIC NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT v2_trio_weapon_season_next_patch_check
    CHECK (patch_major IN ('10', '11')),

  CONSTRAINT v2_trio_weapon_season_next_member_order_12
    CHECK (
      ROW(ally1_char, ally1_weapon, ally1_core)
        <= ROW(ally2_char, ally2_weapon, ally2_core)
    ),

  CONSTRAINT v2_trio_weapon_season_next_member_order_23
    CHECK (
      ROW(ally2_char, ally2_weapon, ally2_core)
        <= ROW(third_char, third_weapon, third_core)
    ),

  CONSTRAINT v2_trio_weapon_season_next_unique
    UNIQUE (
      patch_major,
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
);


-- ============================================================
-- 3. Rebuild seasons 10 and 11 from the raw aggregate table
-- ============================================================

WITH filtered_source AS (
  SELECT
    CASE
      WHEN REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
             ~ '^10([.]|$)'
        THEN '10'
      WHEN REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
             ~ '^11([.]|$)'
        THEN '11'
    END AS patch_major,
    source.character1,
    source.weapon_type1,
    COALESCE(source.main_core1, 0) AS main_core1,
    source.character2,
    source.weapon_type2,
    COALESCE(source.main_core2, 0) AS main_core2,
    source.character3,
    source.weapon_type3,
    COALESCE(source.main_core3, 0) AS main_core3,
    COALESCE(source.total_games, 0) AS total_games,
    COALESCE(source.total_wins, 0) AS total_wins,
    COALESCE(source.total_rp, 0) AS total_rp,
    COALESCE(source.rank_sum, 0) AS rank_sum
  FROM public."v2_CharacterTrioWeapon" AS source
  WHERE REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
          ~ '^(10|11)([.]|$)'
    AND source.tier IN (
      'DIAMOND',
      'METEORITE',
      'MITHRIL',
      'IN1000'
    )
    AND source.character1 NOT IN (9998, 9999)
    AND source.character2 NOT IN (9998, 9999)
    AND source.character3 NOT IN (9998, 9999)
),
canonical_source AS (
  SELECT
    source.patch_major,
    normalized.ally1_char,
    normalized.ally1_weapon,
    normalized.ally1_core,
    normalized.ally2_char,
    normalized.ally2_weapon,
    normalized.ally2_core,
    normalized.third_char,
    normalized.third_weapon,
    normalized.third_core,
    source.total_games,
    source.total_wins,
    source.total_rp,
    source.rank_sum
  FROM filtered_source AS source
  CROSS JOIN LATERAL (
    SELECT
      MAX(member.character_num) FILTER (WHERE member.rn = 1)
        AS ally1_char,
      MAX(member.weapon_type) FILTER (WHERE member.rn = 1)
        AS ally1_weapon,
      MAX(member.main_core) FILTER (WHERE member.rn = 1)
        AS ally1_core,

      MAX(member.character_num) FILTER (WHERE member.rn = 2)
        AS ally2_char,
      MAX(member.weapon_type) FILTER (WHERE member.rn = 2)
        AS ally2_weapon,
      MAX(member.main_core) FILTER (WHERE member.rn = 2)
        AS ally2_core,

      MAX(member.character_num) FILTER (WHERE member.rn = 3)
        AS third_char,
      MAX(member.weapon_type) FILTER (WHERE member.rn = 3)
        AS third_weapon,
      MAX(member.main_core) FILTER (WHERE member.rn = 3)
        AS third_core
    FROM (
      SELECT
        input_member.character_num,
        input_member.weapon_type,
        input_member.main_core,
        ROW_NUMBER() OVER (
          ORDER BY
            input_member.character_num,
            input_member.weapon_type,
            input_member.main_core
        ) AS rn
      FROM (
        VALUES
          (
            source.character1,
            source.weapon_type1,
            source.main_core1
          ),
          (
            source.character2,
            source.weapon_type2,
            source.main_core2
          ),
          (
            source.character3,
            source.weapon_type3,
            source.main_core3
          )
      ) AS input_member (
        character_num,
        weapon_type,
        main_core
      )
    ) AS member
  ) AS normalized
)
INSERT INTO public."v2_CharacterTrioWeaponSeason_next" (
  patch_major,
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
  patch_major,
  ally1_char,
  ally1_weapon,
  ally1_core,
  ally2_char,
  ally2_weapon,
  ally2_core,
  third_char,
  third_weapon,
  third_core,
  SUM(total_games)::INTEGER,
  SUM(total_wins)::INTEGER,
  SUM(total_rp),
  SUM(rank_sum),
  NOW()
FROM canonical_source
GROUP BY
  patch_major,
  ally1_char,
  ally1_weapon,
  ally1_core,
  ally2_char,
  ally2_weapon,
  ally2_core,
  third_char,
  third_weapon,
  third_core;


-- ============================================================
-- 4. Exact source/target totals check
-- ============================================================

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  WITH source_totals AS (
    SELECT
      CASE
        WHEN REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
               ~ '^10([.]|$)'
          THEN '10'
        WHEN REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
               ~ '^11([.]|$)'
          THEN '11'
      END AS patch_major,
      SUM(COALESCE(source.total_games, 0))::NUMERIC AS total_games,
      SUM(COALESCE(source.total_wins, 0))::NUMERIC AS total_wins,
      SUM(COALESCE(source.total_rp, 0))::NUMERIC AS total_rp,
      SUM(COALESCE(source.rank_sum, 0))::NUMERIC AS rank_sum
    FROM public."v2_CharacterTrioWeapon" AS source
    WHERE REGEXP_REPLACE(source.patch_version, '\s+', '', 'g')
            ~ '^(10|11)([.]|$)'
      AND source.tier IN (
        'DIAMOND',
        'METEORITE',
        'MITHRIL',
        'IN1000'
      )
      AND source.character1 NOT IN (9998, 9999)
      AND source.character2 NOT IN (9998, 9999)
      AND source.character3 NOT IN (9998, 9999)
    GROUP BY 1
  ),
  target_totals AS (
    SELECT
      target.patch_major,
      SUM(target.total_games)::NUMERIC AS total_games,
      SUM(target.total_wins)::NUMERIC AS total_wins,
      SUM(target.total_rp)::NUMERIC AS total_rp,
      SUM(target.rank_sum)::NUMERIC AS rank_sum
    FROM public."v2_CharacterTrioWeaponSeason_next" AS target
    GROUP BY target.patch_major
  )
  SELECT COUNT(*)
  INTO mismatch_count
  FROM source_totals
  FULL OUTER JOIN target_totals USING (patch_major)
  WHERE source_totals.patch_major IS NULL
     OR target_totals.patch_major IS NULL
     OR ROW(
          source_totals.total_games,
          source_totals.total_wins,
          source_totals.total_rp,
          source_totals.rank_sum
        ) IS DISTINCT FROM ROW(
          target_totals.total_games,
          target_totals.total_wins,
          target_totals.total_rp,
          target_totals.rank_sum
        );

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'season aggregate verification failed for % season(s)',
      mismatch_count;
  END IF;

  IF (
    SELECT COUNT(DISTINCT patch_major)
    FROM public."v2_CharacterTrioWeaponSeason_next"
  ) <> 2 THEN
    RAISE EXCEPTION
      'expected both season 10 and season 11 in the target table';
  END IF;
END;
$$;


-- ============================================================
-- 5. Read indexes and permissions
-- ============================================================

CREATE INDEX idx_v2_trio_weapon_season_next_patch_games
ON public."v2_CharacterTrioWeaponSeason_next" (
  patch_major,
  total_games DESC
);

CREATE INDEX idx_v2_trio_weapon_season_next_ally1
ON public."v2_CharacterTrioWeaponSeason_next" (
  ally1_char,
  ally1_weapon,
  patch_major,
  total_games DESC
);

CREATE INDEX idx_v2_trio_weapon_season_next_ally2
ON public."v2_CharacterTrioWeaponSeason_next" (
  ally2_char,
  ally2_weapon,
  patch_major,
  total_games DESC
);

CREATE INDEX idx_v2_trio_weapon_season_next_third
ON public."v2_CharacterTrioWeaponSeason_next" (
  third_char,
  third_weapon,
  patch_major,
  total_games DESC
);

ALTER TABLE public."v2_CharacterTrioWeaponSeason_next"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read trio weapon season next"
ON public."v2_CharacterTrioWeaponSeason_next"
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public."v2_CharacterTrioWeaponSeason_next"
FROM anon, authenticated;

GRANT SELECT
ON public."v2_CharacterTrioWeaponSeason_next"
TO anon, authenticated, service_role;

ANALYZE public."v2_CharacterTrioWeaponSeason_next";

COMMIT;


-- ============================================================
-- 6. Result summary
-- ============================================================

SELECT
  patch_major,
  COUNT(*) AS row_count,
  SUM(total_games) AS total_games,
  SUM(total_wins) AS total_wins,
  SUM(total_rp) AS total_rp,
  SUM(rank_sum) AS rank_sum,
  MIN(last_updated) AS created_at
FROM public."v2_CharacterTrioWeaponSeason_next"
GROUP BY patch_major
ORDER BY patch_major;
