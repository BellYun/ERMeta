-- ============================================================
-- Patch analysis composition comparison helper
--
-- 목적:
--   - v2_CharacterTrioWeapon 원본의 patch_version/tier 축을 유지한 채
--     패치 분석 페이지에서 필요한 캐릭터들의 조합 row만 빠르게 가져온다.
--   - 프론트엔드는 role mapping을 코드에서 관리하므로, RPC는 row fetch만 담당한다.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_patch_tier_char1_games
ON "v2_CharacterTrioWeapon" (patch_version, tier, character1, total_games DESC);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_patch_tier_char2_games
ON "v2_CharacterTrioWeapon" (patch_version, tier, character2, total_games DESC);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_patch_tier_char3_games
ON "v2_CharacterTrioWeapon" (patch_version, tier, character3, total_games DESC);

CREATE OR REPLACE FUNCTION get_patch_trio_weapon_rows_for_focus(
  p_current_patch TEXT,
  p_previous_patch TEXT,
  p_tiers TEXT[],
  p_focus_chars INT[],
  p_limit_per_position INT DEFAULT 12000
)
RETURNS TABLE (
  id BIGINT,
  character1 INT,
  weapon_type1 INT,
  character2 INT,
  weapon_type2 INT,
  character3 INT,
  weapon_type3 INT,
  total_games INT,
  total_rp NUMERIC,
  tier TEXT,
  patch_version TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH limited_rows AS (
    (
      SELECT
        src.id,
        src.character1,
        src.weapon_type1,
        src.character2,
        src.weapon_type2,
        src.character3,
        src.weapon_type3,
        src.total_games,
        src.total_rp,
        src.tier,
        src.patch_version
      FROM "v2_CharacterTrioWeapon" src
      WHERE src.patch_version IN (p_current_patch, p_previous_patch)
        AND src.tier = ANY(p_tiers)
        AND src.character1 = ANY(p_focus_chars)
      ORDER BY src.total_games DESC
      LIMIT p_limit_per_position
    )
    UNION
    (
      SELECT
        src.id,
        src.character1,
        src.weapon_type1,
        src.character2,
        src.weapon_type2,
        src.character3,
        src.weapon_type3,
        src.total_games,
        src.total_rp,
        src.tier,
        src.patch_version
      FROM "v2_CharacterTrioWeapon" src
      WHERE src.patch_version IN (p_current_patch, p_previous_patch)
        AND src.tier = ANY(p_tiers)
        AND src.character2 = ANY(p_focus_chars)
      ORDER BY src.total_games DESC
      LIMIT p_limit_per_position
    )
    UNION
    (
      SELECT
        src.id,
        src.character1,
        src.weapon_type1,
        src.character2,
        src.weapon_type2,
        src.character3,
        src.weapon_type3,
        src.total_games,
        src.total_rp,
        src.tier,
        src.patch_version
      FROM "v2_CharacterTrioWeapon" src
      WHERE src.patch_version IN (p_current_patch, p_previous_patch)
        AND src.tier = ANY(p_tiers)
        AND src.character3 = ANY(p_focus_chars)
      ORDER BY src.total_games DESC
      LIMIT p_limit_per_position
    )
  )
  SELECT DISTINCT ON (limited_rows.id)
    limited_rows.id,
    limited_rows.character1,
    limited_rows.weapon_type1,
    limited_rows.character2,
    limited_rows.weapon_type2,
    limited_rows.character3,
    limited_rows.weapon_type3,
    limited_rows.total_games,
    limited_rows.total_rp,
    limited_rows.tier,
    limited_rows.patch_version
  FROM limited_rows
  ORDER BY limited_rows.id, limited_rows.total_games DESC;
$$;

GRANT EXECUTE ON FUNCTION get_patch_trio_weapon_rows_for_focus(TEXT, TEXT, TEXT[], INT[], INT)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_patch_role_combo_stats_for_focus(
  p_current_patch TEXT,
  p_previous_patch TEXT,
  p_tiers TEXT[],
  p_focus_specs JSONB,
  p_role_map JSONB
)
RETURNS TABLE (
  focus_key TEXT,
  tier TEXT,
  patch_version TEXT,
  role_combo TEXT[],
  total_games BIGINT,
  total_rp NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH focus AS (
    SELECT
      spec->>'key' AS focus_key,
      (spec->>'character')::INT AS character_num,
      NULLIF(spec->>'weapon', '')::INT AS weapon_type
    FROM jsonb_array_elements(p_focus_specs) spec
  ),
  matched AS (
    SELECT
      f.focus_key,
      src.tier,
      src.patch_version,
      ARRAY(
        SELECT role_value
        FROM unnest(ARRAY[
          COALESCE(p_role_map ->> (src.character1::TEXT || ':' || src.weapon_type1::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character2::TEXT || ':' || src.weapon_type2::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character3::TEXT || ':' || src.weapon_type3::TEXT), '직업군 미분류')
        ]) AS role_value
        ORDER BY
          CASE role_value
            WHEN '탱커' THEN 1
            WHEN '전사' THEN 2
            WHEN '암살자' THEN 3
            WHEN '스킬딜러' THEN 4
            WHEN '원거리 딜러' THEN 5
            WHEN '지원가' THEN 6
            ELSE 99
          END,
          role_value
      ) AS role_combo,
      src.total_games,
      src.total_rp
    FROM focus f
    JOIN "v2_CharacterTrioWeapon" src
      ON src.character1 = f.character_num
     AND (f.weapon_type IS NULL OR src.weapon_type1 = f.weapon_type)
    WHERE src.patch_version IN (p_current_patch, p_previous_patch)
      AND src.tier = ANY(p_tiers)
      AND src.character1 NOT IN (9998, 9999)
      AND src.character2 NOT IN (9998, 9999)
      AND src.character3 NOT IN (9998, 9999)
      AND p_role_map ? (src.character1::TEXT || ':' || src.weapon_type1::TEXT)
      AND p_role_map ? (src.character2::TEXT || ':' || src.weapon_type2::TEXT)
      AND p_role_map ? (src.character3::TEXT || ':' || src.weapon_type3::TEXT)

    UNION ALL

    SELECT
      f.focus_key,
      src.tier,
      src.patch_version,
      ARRAY(
        SELECT role_value
        FROM unnest(ARRAY[
          COALESCE(p_role_map ->> (src.character1::TEXT || ':' || src.weapon_type1::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character2::TEXT || ':' || src.weapon_type2::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character3::TEXT || ':' || src.weapon_type3::TEXT), '직업군 미분류')
        ]) AS role_value
        ORDER BY
          CASE role_value
            WHEN '탱커' THEN 1
            WHEN '전사' THEN 2
            WHEN '암살자' THEN 3
            WHEN '스킬딜러' THEN 4
            WHEN '원거리 딜러' THEN 5
            WHEN '지원가' THEN 6
            ELSE 99
          END,
          role_value
      ) AS role_combo,
      src.total_games,
      src.total_rp
    FROM focus f
    JOIN "v2_CharacterTrioWeapon" src
      ON src.character2 = f.character_num
     AND (f.weapon_type IS NULL OR src.weapon_type2 = f.weapon_type)
    WHERE src.patch_version IN (p_current_patch, p_previous_patch)
      AND src.tier = ANY(p_tiers)
      AND src.character1 NOT IN (9998, 9999)
      AND src.character2 NOT IN (9998, 9999)
      AND src.character3 NOT IN (9998, 9999)
      AND p_role_map ? (src.character1::TEXT || ':' || src.weapon_type1::TEXT)
      AND p_role_map ? (src.character2::TEXT || ':' || src.weapon_type2::TEXT)
      AND p_role_map ? (src.character3::TEXT || ':' || src.weapon_type3::TEXT)

    UNION ALL

    SELECT
      f.focus_key,
      src.tier,
      src.patch_version,
      ARRAY(
        SELECT role_value
        FROM unnest(ARRAY[
          COALESCE(p_role_map ->> (src.character1::TEXT || ':' || src.weapon_type1::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character2::TEXT || ':' || src.weapon_type2::TEXT), '직업군 미분류'),
          COALESCE(p_role_map ->> (src.character3::TEXT || ':' || src.weapon_type3::TEXT), '직업군 미분류')
        ]) AS role_value
        ORDER BY
          CASE role_value
            WHEN '탱커' THEN 1
            WHEN '전사' THEN 2
            WHEN '암살자' THEN 3
            WHEN '스킬딜러' THEN 4
            WHEN '원거리 딜러' THEN 5
            WHEN '지원가' THEN 6
            ELSE 99
          END,
          role_value
      ) AS role_combo,
      src.total_games,
      src.total_rp
    FROM focus f
    JOIN "v2_CharacterTrioWeapon" src
      ON src.character3 = f.character_num
     AND (f.weapon_type IS NULL OR src.weapon_type3 = f.weapon_type)
    WHERE src.patch_version IN (p_current_patch, p_previous_patch)
      AND src.tier = ANY(p_tiers)
      AND src.character1 NOT IN (9998, 9999)
      AND src.character2 NOT IN (9998, 9999)
      AND src.character3 NOT IN (9998, 9999)
      AND p_role_map ? (src.character1::TEXT || ':' || src.weapon_type1::TEXT)
      AND p_role_map ? (src.character2::TEXT || ':' || src.weapon_type2::TEXT)
      AND p_role_map ? (src.character3::TEXT || ':' || src.weapon_type3::TEXT)
  )
  SELECT
    matched.focus_key,
    matched.tier,
    matched.patch_version,
    matched.role_combo,
    SUM(matched.total_games)::BIGINT AS total_games,
    SUM(matched.total_rp) AS total_rp
  FROM matched
  GROUP BY
    matched.focus_key,
    matched.tier,
    matched.patch_version,
    matched.role_combo
  ORDER BY
    matched.focus_key,
    matched.tier,
    matched.patch_version,
    SUM(matched.total_games) DESC;
$$;

GRANT EXECUTE ON FUNCTION get_patch_role_combo_stats_for_focus(TEXT, TEXT, TEXT[], JSONB, JSONB)
TO anon, authenticated;
