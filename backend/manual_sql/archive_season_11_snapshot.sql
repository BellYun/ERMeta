-- ============================================================
-- Season 11 immutable archive snapshot
--
-- 목적:
--   - 시즌 10+11 서비스용 사전집계를 다시 만들기 전에 시즌 11 데이터를
--     패치/티어/코어 축을 유지한 원본 집계 형태로 보존한다.
--   - 이후 SkillOrder / StartRoute / ItemPriority 정리 전에 시즌 11 행을 보존한다.
--
-- 안전장치:
--   - 모든 source SELECT는 하나의 REPEATABLE READ snapshot을 사용한다.
--   - 같은 이름의 archive table이 하나라도 있으면 덮어쓰지 않고 중단한다.
--   - 핵심 source가 비어 있으면 전체 transaction을 rollback한다.
--   - archive schema는 anon/authenticated에 공개하지 않는다.
--
-- 실행 위치:
--   Supabase Dashboard -> SQL Editor
-- ============================================================

BEGIN ISOLATION LEVEL REPEATABLE READ;

SET LOCAL statement_timeout = 0;
SET LOCAL lock_timeout = '10s';

CREATE SCHEMA IF NOT EXISTS archive;

REVOKE ALL ON SCHEMA archive FROM PUBLIC;
REVOKE ALL ON SCHEMA archive FROM anon, authenticated;

COMMENT ON SCHEMA archive
IS 'Private immutable seasonal snapshots. Not exposed to anon or authenticated clients.';

-- 기존 snapshot을 실수로 덮어쓰지 않는다.
DO $$
DECLARE
  v_existing_tables TEXT;
BEGIN
  SELECT STRING_AGG(object_name, ', ' ORDER BY object_name)
  INTO v_existing_tables
  FROM (
    VALUES
      ('season11_patch_version'),
      ('season11_character_stats'),
      ('season11_trio_weapon'),
      ('season11_equipment_build_stats'),
      ('season11_trait_build_stats'),
      ('season11_skill_order'),
      ('season11_start_route'),
      ('season11_item_priority'),
      ('season11_snapshot_manifest')
  ) AS objects(object_name)
  WHERE TO_REGCLASS('archive.' || object_name) IS NOT NULL;

  IF v_existing_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'Season 11 archive already exists (%). Refusing to overwrite immutable snapshot.',
      v_existing_tables;
  END IF;
END;
$$;

-- 패치 메타데이터
CREATE TABLE archive.season11_patch_version AS
SELECT *
FROM public."PatchVersion"
WHERE version ~ '^11\.';

-- 핵심 통계: 패치/티어/코어 축을 그대로 보존한다.
CREATE TABLE archive.season11_character_stats AS
SELECT *
FROM public."v2_CharacterStats"
WHERE "patchVersion" ~ '^11\.';

CREATE TABLE archive.season11_trio_weapon AS
SELECT *
FROM public."v2_CharacterTrioWeapon"
WHERE patch_version ~ '^11\.';

CREATE TABLE archive.season11_equipment_build_stats AS
SELECT *
FROM public."v2_CharacterEquipmentBuildStats"
WHERE "patchVersion" ~ '^11\.';

CREATE TABLE archive.season11_trait_build_stats AS
SELECT *
FROM public."v2_CharacterTraitBuildStats"
WHERE "patchVersion" ~ '^11\.';

-- 이후 retention 정리 대상도 시즌 11 행은 먼저 보존한다.
CREATE TABLE archive.season11_skill_order AS
SELECT *
FROM public."v2_CharacterSkillOrder"
WHERE patch_version ~ '^11\.';

CREATE TABLE archive.season11_start_route AS
SELECT *
FROM public."v2_CharacterStartRoute"
WHERE patch_version ~ '^11\.';

CREATE TABLE archive.season11_item_priority AS
SELECT *
FROM public."v2_CharacterItemPriority"
WHERE patch_version ~ '^11\.';

-- 핵심 데이터가 비어 있으면 잘못된 프로젝트/필터로 간주하고 전부 rollback한다.
DO $$
DECLARE
  v_empty_tables TEXT;
BEGIN
  SELECT STRING_AGG(table_name, ', ' ORDER BY table_name)
  INTO v_empty_tables
  FROM (
    SELECT 'season11_patch_version' AS table_name
    WHERE NOT EXISTS (SELECT 1 FROM archive.season11_patch_version)

    UNION ALL

    SELECT 'season11_character_stats'
    WHERE NOT EXISTS (SELECT 1 FROM archive.season11_character_stats)

    UNION ALL

    SELECT 'season11_trio_weapon'
    WHERE NOT EXISTS (SELECT 1 FROM archive.season11_trio_weapon)

    UNION ALL

    SELECT 'season11_equipment_build_stats'
    WHERE NOT EXISTS (SELECT 1 FROM archive.season11_equipment_build_stats)

    UNION ALL

    SELECT 'season11_trait_build_stats'
    WHERE NOT EXISTS (SELECT 1 FROM archive.season11_trait_build_stats)
  ) AS empty_sources;

  IF v_empty_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'Season 11 core archive is empty (%). Rolling back snapshot.',
      v_empty_tables;
  END IF;
END;
$$;

-- 스냅샷 검증용 manifest. 모든 합계는 같은 transaction snapshot 기준이다.
CREATE TABLE archive.season11_snapshot_manifest AS
SELECT
  'PatchVersion'::TEXT AS source_table,
  COUNT(*)::BIGINT AS row_count,
  COUNT(DISTINCT version)::BIGINT AS patch_count,
  MIN(version)::TEXT AS min_patch,
  MAX(version)::TEXT AS max_patch,
  NULL::NUMERIC AS total_games,
  NULL::NUMERIC AS total_wins,
  NULL::NUMERIC AS total_rp,
  STATEMENT_TIMESTAMP() AS archived_at
FROM archive.season11_patch_version

UNION ALL

SELECT
  'v2_CharacterStats',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT "patchVersion")::BIGINT,
  MIN("patchVersion")::TEXT,
  MAX("patchVersion")::TEXT,
  COALESCE(SUM("totalGames"), 0)::NUMERIC,
  COALESCE(SUM("totalWins"), 0)::NUMERIC,
  COALESCE(SUM("totalRP"), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_character_stats

UNION ALL

SELECT
  'v2_CharacterTrioWeapon',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT patch_version)::BIGINT,
  MIN(patch_version)::TEXT,
  MAX(patch_version)::TEXT,
  COALESCE(SUM(total_games), 0)::NUMERIC,
  COALESCE(SUM(total_wins), 0)::NUMERIC,
  COALESCE(SUM(total_rp), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_trio_weapon

UNION ALL

SELECT
  'v2_CharacterEquipmentBuildStats',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT "patchVersion")::BIGINT,
  MIN("patchVersion")::TEXT,
  MAX("patchVersion")::TEXT,
  COALESCE(SUM("totalGames"), 0)::NUMERIC,
  COALESCE(SUM("totalWins"), 0)::NUMERIC,
  COALESCE(SUM("totalRP"), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_equipment_build_stats

UNION ALL

SELECT
  'v2_CharacterTraitBuildStats',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT "patchVersion")::BIGINT,
  MIN("patchVersion")::TEXT,
  MAX("patchVersion")::TEXT,
  COALESCE(SUM("totalGames"), 0)::NUMERIC,
  COALESCE(SUM("totalWins"), 0)::NUMERIC,
  COALESCE(SUM("totalRP"), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_trait_build_stats

UNION ALL

SELECT
  'v2_CharacterSkillOrder',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT patch_version)::BIGINT,
  MIN(patch_version)::TEXT,
  MAX(patch_version)::TEXT,
  COALESCE(SUM(total_games), 0)::NUMERIC,
  COALESCE(SUM(total_wins), 0)::NUMERIC,
  COALESCE(SUM(total_rp), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_skill_order

UNION ALL

SELECT
  'v2_CharacterStartRoute',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT patch_version)::BIGINT,
  MIN(patch_version)::TEXT,
  MAX(patch_version)::TEXT,
  COALESCE(SUM(total_games), 0)::NUMERIC,
  COALESCE(SUM(total_wins), 0)::NUMERIC,
  COALESCE(SUM(total_rp), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_start_route

UNION ALL

SELECT
  'v2_CharacterItemPriority',
  COUNT(*)::BIGINT,
  COUNT(DISTINCT patch_version)::BIGINT,
  MIN(patch_version)::TEXT,
  MAX(patch_version)::TEXT,
  COALESCE(SUM(total_games), 0)::NUMERIC,
  NULL::NUMERIC,
  COALESCE(SUM(total_rp), 0)::NUMERIC,
  STATEMENT_TIMESTAMP()
FROM archive.season11_item_priority;

COMMENT ON TABLE archive.season11_snapshot_manifest
IS 'Row counts and additive totals captured with the immutable Season 11 archive snapshot.';

-- archive는 SQL Editor/postgres owner만 접근하도록 유지한다.
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM anon, authenticated;

ANALYZE archive.season11_patch_version;
ANALYZE archive.season11_character_stats;
ANALYZE archive.season11_trio_weapon;
ANALYZE archive.season11_equipment_build_stats;
ANALYZE archive.season11_trait_build_stats;
ANALYZE archive.season11_skill_order;
ANALYZE archive.season11_start_route;
ANALYZE archive.season11_item_priority;
ANALYZE archive.season11_snapshot_manifest;

COMMIT;

-- 실행 후 이 결과를 별도로 저장한다.
SELECT *
FROM archive.season11_snapshot_manifest
ORDER BY source_table;
