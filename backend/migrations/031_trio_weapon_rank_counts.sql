-- ============================================================
-- v2_CharacterTrioWeapon 등수별 카운트 추가
--
-- 목적:
--   - 무기 포함 3인 조합마다 1등부터 8등까지의 분포를 보존한다.
--   - 기존 total_games / rank_sum 집계와 같은 단일 게임 upsert에서 누적한다.
--
-- 주의:
--   - 기존 집계 행은 등수별 원본 분포를 rank_sum만으로 복원할 수 없으므로
--     rank_1_count ~ rank_8_count가 0에서 시작한다.
--   - 이 마이그레이션 적용 이후 수집되는 게임부터 등수별 카운트가 쌓인다.
-- ============================================================

BEGIN;

ALTER TABLE "v2_CharacterTrioWeapon"
  ADD COLUMN IF NOT EXISTS rank_1_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_2_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_3_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_4_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_5_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_6_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_7_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_8_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION upsert_v2_character_trio_weapon(
  p_char1 INTEGER, p_weapon1 INTEGER, p_core1 INTEGER,
  p_char2 INTEGER, p_weapon2 INTEGER, p_core2 INTEGER,
  p_char3 INTEGER, p_weapon3 INTEGER, p_core3 INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp NUMERIC,
  p_rank NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "v2_CharacterTrioWeapon" (
    character1, weapon_type1, main_core1,
    character2, weapon_type2, main_core2,
    character3, weapon_type3, main_core3,
    tier, patch_version,
    total_games, total_wins, total_rp, rank_sum,
    rank_1_count, rank_2_count, rank_3_count, rank_4_count,
    rank_5_count, rank_6_count, rank_7_count, rank_8_count,
    last_updated
  ) VALUES (
    p_char1, p_weapon1, p_core1,
    p_char2, p_weapon2, p_core2,
    p_char3, p_weapon3, p_core3,
    p_tier, p_patch_version,
    p_games, p_wins, p_rp, p_rank,
    CASE WHEN p_rank = 1 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 2 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 3 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 4 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 5 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 6 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 7 THEN p_games ELSE 0 END,
    CASE WHEN p_rank = 8 THEN p_games ELSE 0 END,
    NOW()
  )
  ON CONFLICT (character1, weapon_type1, character2, weapon_type2,
               character3, weapon_type3, main_core1, main_core2, main_core3,
               tier, patch_version)
  DO UPDATE SET
    total_games = "v2_CharacterTrioWeapon".total_games + p_games,
    total_wins = "v2_CharacterTrioWeapon".total_wins + p_wins,
    total_rp = "v2_CharacterTrioWeapon".total_rp + p_rp,
    rank_sum = "v2_CharacterTrioWeapon".rank_sum + p_rank,
    rank_1_count = "v2_CharacterTrioWeapon".rank_1_count
      + CASE WHEN p_rank = 1 THEN p_games ELSE 0 END,
    rank_2_count = "v2_CharacterTrioWeapon".rank_2_count
      + CASE WHEN p_rank = 2 THEN p_games ELSE 0 END,
    rank_3_count = "v2_CharacterTrioWeapon".rank_3_count
      + CASE WHEN p_rank = 3 THEN p_games ELSE 0 END,
    rank_4_count = "v2_CharacterTrioWeapon".rank_4_count
      + CASE WHEN p_rank = 4 THEN p_games ELSE 0 END,
    rank_5_count = "v2_CharacterTrioWeapon".rank_5_count
      + CASE WHEN p_rank = 5 THEN p_games ELSE 0 END,
    rank_6_count = "v2_CharacterTrioWeapon".rank_6_count
      + CASE WHEN p_rank = 6 THEN p_games ELSE 0 END,
    rank_7_count = "v2_CharacterTrioWeapon".rank_7_count
      + CASE WHEN p_rank = 7 THEN p_games ELSE 0 END,
    rank_8_count = "v2_CharacterTrioWeapon".rank_8_count
      + CASE WHEN p_rank = 8 THEN p_games ELSE 0 END,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
