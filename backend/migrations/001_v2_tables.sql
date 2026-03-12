-- ============================================================
-- ER&GG v2.0 마이그레이션 - Phase 0-1: v2_ 테이블 생성
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. v2_CharacterStats (기존 재설계)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterStats" (
  "characterNum"  INTEGER NOT NULL,
  "bestWeapon"    INTEGER NOT NULL,
  "totalGames"    INTEGER DEFAULT 0,
  "totalWins"     INTEGER DEFAULT 0,
  "totalRP"       NUMERIC DEFAULT 0,
  "totalTop3"     INTEGER DEFAULT 0,
  "averageRank"   NUMERIC DEFAULT 0,
  "tier"          TEXT NOT NULL,
  "patchVersion"  TEXT NOT NULL,

  UNIQUE ("characterNum", "bestWeapon", "tier", "patchVersion")
);

CREATE INDEX IF NOT EXISTS idx_v2_cs_patch_tier
ON "v2_CharacterStats" ("patchVersion", "tier");

CREATE INDEX IF NOT EXISTS idx_v2_cs_char
ON "v2_CharacterStats" ("characterNum", "patchVersion", "tier");


-- ────────────────────────────────────────────────────────────
-- 2. v2_CharacterTrio (patchVersion 추가)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterTrio" (
  "character1"    INTEGER NOT NULL,
  "character2"    INTEGER NOT NULL,
  "character3"    INTEGER NOT NULL,
  "winRate"       NUMERIC DEFAULT 0,
  "averageRP"     NUMERIC DEFAULT 0,
  "totalGames"    INTEGER DEFAULT 0,
  "averageRank"   NUMERIC DEFAULT 0,
  "tier"          TEXT NOT NULL,
  "patchVersion"  TEXT NOT NULL,
  "lastUpdated"   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE ("character1", "character2", "character3", "tier", "patchVersion")
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_patch_tier
ON "v2_CharacterTrio" ("patchVersion", "tier");


-- ────────────────────────────────────────────────────────────
-- 3. v2_CharacterEquipmentBuildStats (기존 재설계)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterEquipmentBuildStats" (
  "characterNum"  INTEGER NOT NULL,
  "mainCore"      INTEGER,
  "weapon"        INTEGER,
  "chest"         INTEGER,
  "head"          INTEGER,
  "arm"           INTEGER,
  "leg"           INTEGER,
  "totalGames"    INTEGER DEFAULT 0,
  "totalWins"     INTEGER DEFAULT 0,
  "rankSum"       NUMERIC DEFAULT 0,
  "totalRP"       NUMERIC DEFAULT 0,
  "tier"          TEXT NOT NULL,
  "patchVersion"  TEXT NOT NULL,

  UNIQUE ("characterNum", "mainCore", "weapon", "chest", "head", "arm", "leg", "tier", "patchVersion")
);

CREATE INDEX IF NOT EXISTS idx_v2_equip_lookup
ON "v2_CharacterEquipmentBuildStats" ("characterNum", "tier", "patchVersion");


-- ────────────────────────────────────────────────────────────
-- 4. v2_CharacterTraitBuildStats (기존 재설계)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterTraitBuildStats" (
  "characterNum"    INTEGER NOT NULL,
  "mainCore"        INTEGER,
  "sub1"            INTEGER,
  "sub2"            INTEGER,
  "sub3"            INTEGER,
  "sub4"            INTEGER,
  "optionTrait1"    INTEGER,
  "optionTrait2"    INTEGER,
  "optionTrait3"    INTEGER,
  "optionTrait4"    INTEGER,
  "totalGames"      INTEGER DEFAULT 0,
  "totalWins"       INTEGER DEFAULT 0,
  "bestWeapon"      INTEGER,
  "tier"            TEXT NOT NULL,
  "patchVersion"    TEXT NOT NULL,

  UNIQUE ("characterNum", "mainCore", "sub1", "sub2", "sub3", "sub4",
          "optionTrait1", "optionTrait2", "optionTrait3", "optionTrait4",
          "bestWeapon", "tier", "patchVersion")
);

CREATE INDEX IF NOT EXISTS idx_v2_trait_lookup
ON "v2_CharacterTraitBuildStats" ("characterNum", "patchVersion", "tier");


-- ────────────────────────────────────────────────────────────
-- 5. v2_PlayerGameRecord (신규 — 플레이어 단위 원본, 14일 보관)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_PlayerGameRecord" (
  id              BIGSERIAL PRIMARY KEY,
  game_id         BIGINT NOT NULL,
  team_number     INTEGER NOT NULL,
  character_num   INTEGER NOT NULL,
  best_weapon     INTEGER NOT NULL,
  game_rank       INTEGER NOT NULL,
  player_kill     INTEGER DEFAULT 0,
  player_assistant INTEGER DEFAULT 0,
  character_level INTEGER,

  -- 장비
  equipment_0     INTEGER,
  equipment_1     INTEGER,
  equipment_2     INTEGER,
  equipment_3     INTEGER,
  equipment_4     INTEGER,
  equipment_grade JSONB,
  craft_legend    INTEGER DEFAULT 0,

  -- 특성
  trait_first_core  INTEGER,
  trait_first_sub   INTEGER[],
  trait_second_sub  INTEGER[],

  -- 스킬
  skill_order       JSONB,
  skill_level_info  JSONB,

  -- 루트
  route_id_of_start INTEGER,
  place_of_start    TEXT,

  -- 성과
  mmr_before      INTEGER,
  mmr_after       INTEGER,
  rank_point      INTEGER,
  victory         INTEGER DEFAULT 0,
  duration        INTEGER,

  -- 메타
  patch_version   TEXT NOT NULL,
  match_tier      TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (game_id, character_num)
);

CREATE INDEX IF NOT EXISTS idx_v2_pgr_patch_tier
ON "v2_PlayerGameRecord" (patch_version, match_tier);

CREATE INDEX IF NOT EXISTS idx_v2_pgr_character
ON "v2_PlayerGameRecord" (character_num, patch_version);

CREATE INDEX IF NOT EXISTS idx_v2_pgr_team
ON "v2_PlayerGameRecord" (game_id, team_number);

CREATE INDEX IF NOT EXISTS idx_v2_pgr_created
ON "v2_PlayerGameRecord" (created_at);


-- ────────────────────────────────────────────────────────────
-- 6. v2_CharacterTrioWeapon (신규 — 무기군 포함 3인 조합)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterTrioWeapon" (
  id             BIGSERIAL PRIMARY KEY,
  character1     INTEGER NOT NULL,
  weapon_type1   INTEGER NOT NULL,
  character2     INTEGER NOT NULL,
  weapon_type2   INTEGER NOT NULL,
  character3     INTEGER NOT NULL,
  weapon_type3   INTEGER NOT NULL,
  main_core1     INTEGER,
  main_core2     INTEGER,
  main_core3     INTEGER,
  total_games    INTEGER DEFAULT 0,
  total_wins     INTEGER DEFAULT 0,
  total_rp       NUMERIC DEFAULT 0,
  rank_sum       NUMERIC DEFAULT 0,
  tier           TEXT NOT NULL,
  patch_version  TEXT NOT NULL,
  last_updated   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (character1, weapon_type1, character2, weapon_type2,
          character3, weapon_type3, main_core1, main_core2, main_core3,
          tier, patch_version)
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_lookup
ON "v2_CharacterTrioWeapon" (patch_version, tier, character1);


-- ────────────────────────────────────────────────────────────
-- 7. v2_CharacterSkillOrder (신규 — 스킬 찍는 순서)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterSkillOrder" (
  id              BIGSERIAL PRIMARY KEY,
  character_num   INTEGER NOT NULL,
  best_weapon     INTEGER NOT NULL,
  main_core       INTEGER,
  skill_order     INTEGER[] NOT NULL,
  total_games     INTEGER DEFAULT 0,
  total_wins      INTEGER DEFAULT 0,
  tier            TEXT NOT NULL,
  patch_version   TEXT NOT NULL,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (character_num, best_weapon, main_core, skill_order, tier, patch_version)
);

CREATE INDEX IF NOT EXISTS idx_v2_skill_order_lookup
ON "v2_CharacterSkillOrder" (character_num, best_weapon, patch_version, tier);


-- ────────────────────────────────────────────────────────────
-- 8. v2_CharacterStartRoute (신규 — 시작 루트별 승률)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterStartRoute" (
  id              BIGSERIAL PRIMARY KEY,
  character_num   INTEGER NOT NULL,
  best_weapon     INTEGER NOT NULL,
  route_id        INTEGER NOT NULL,
  place_of_start  TEXT NOT NULL,
  total_games     INTEGER DEFAULT 0,
  total_wins      INTEGER DEFAULT 0,
  rank_sum        NUMERIC DEFAULT 0,
  tier            TEXT NOT NULL,
  patch_version   TEXT NOT NULL,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (character_num, best_weapon, route_id, tier, patch_version)
);

CREATE INDEX IF NOT EXISTS idx_v2_start_route_lookup
ON "v2_CharacterStartRoute" (character_num, best_weapon, patch_version, tier);


-- ────────────────────────────────────────────────────────────
-- 9. v2_CharacterItemPriority (신규 — 아이템 중요도, 루트 연계)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CharacterItemPriority" (
  id              BIGSERIAL PRIMARY KEY,
  character_num   INTEGER NOT NULL,
  best_weapon     INTEGER NOT NULL,
  route_id        INTEGER,              -- NULL = 전체 통합
  craft_legend    INTEGER NOT NULL,     -- 전설 제작 수 (1~5)
  slot            INTEGER NOT NULL,     -- 장비 슬롯 (0~4)
  item_code       INTEGER NOT NULL,
  occurrences     INTEGER DEFAULT 0,
  tier            TEXT NOT NULL,
  patch_version   TEXT NOT NULL,

  UNIQUE (character_num, best_weapon, route_id, craft_legend, slot, item_code, tier, patch_version)
);

CREATE INDEX IF NOT EXISTS idx_v2_item_priority_lookup
ON "v2_CharacterItemPriority" (character_num, best_weapon, patch_version, tier);

CREATE INDEX IF NOT EXISTS idx_v2_item_priority_route
ON "v2_CharacterItemPriority" (character_num, best_weapon, route_id, patch_version, tier);


-- ────────────────────────────────────────────────────────────
-- 10. v2_CollectionStatus (수집 진행 상태 — 듀얼 워커)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "v2_CollectionStatus" (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  worker_type           TEXT NOT NULL UNIQUE,  -- 'forward' (신규) | 'backfill' (과거 백필)
  last_game_number      BIGINT,                -- 마지막 처리한 게임 번호
  last_game_id          TEXT,                   -- 마지막 처리한 게임 ID
  current_patch_version TEXT,                   -- 현재 패치 버전
  batch_size            INTEGER DEFAULT 150,    -- 배치 크기
  consecutive_failures  INTEGER DEFAULT 0,      -- 연속 실패 횟수
  total_collected       BIGINT DEFAULT 0,       -- 누적 수집 건수
  total_skipped         BIGINT DEFAULT 0,       -- 누적 건너뜀 건수
  status                TEXT DEFAULT 'active',  -- 'active' | 'paused' | 'completed'
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- forward: 최신 gameId부터 앞으로 (신규 게임 → old + v2_)
-- backfill: 분기점 gameId부터 뒤로 (과거 게임 → v2_ only)


-- ────────────────────────────────────────────────────────────
-- 11. RankThreshold (IN1000 MMR 기준값)
-- ※ ermangho Prisma가 이미 생성한 테이블. camelCase 컬럼명 유지.
-- ※ 테이블이 없는 경우에만 생성 (ERMeta 단독 배포 시)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RankThreshold" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "seasonId"          INTEGER NOT NULL,
  "matchingTeamMode"  INTEGER NOT NULL,
  "rank1000MMR"       INTEGER NOT NULL,
  "lastUpdated"       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE ("seasonId", "matchingTeamMode")
);

CREATE INDEX IF NOT EXISTS idx_rank_threshold_season
ON "RankThreshold" ("seasonId", "matchingTeamMode");


COMMIT;


-- ============================================================
-- Phase 0-3: pg_cron 자동 정리 (14일 초과 PlayerGameRecord 삭제)
--
-- ⚠️ 별도 실행 필요:
-- 1. Supabase Dashboard → Database → Extensions → pg_cron 활성화
-- 2. 활성화 후 아래 SQL을 별도로 실행
-- ============================================================

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'cleanup-v2-player-records',
--   '0 4 * * *',
--   $$DELETE FROM "v2_PlayerGameRecord" WHERE created_at < NOW() - INTERVAL '14 days'$$
-- );
