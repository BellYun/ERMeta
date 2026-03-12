-- ============================================================
-- v2 테이블에 누락된 totalRP / total_rp 컬럼 추가
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

BEGIN;

-- 1. v2_CharacterTrio: totalRP 추가
ALTER TABLE "v2_CharacterTrio"
  ADD COLUMN IF NOT EXISTS "totalRP" NUMERIC DEFAULT 0;

-- 2. v2_CharacterTraitBuildStats: totalRP 추가
ALTER TABLE "v2_CharacterTraitBuildStats"
  ADD COLUMN IF NOT EXISTS "totalRP" NUMERIC DEFAULT 0;

-- 3. v2_CharacterSkillOrder: total_rp 추가
ALTER TABLE "v2_CharacterSkillOrder"
  ADD COLUMN IF NOT EXISTS total_rp NUMERIC DEFAULT 0;

-- 4. v2_CharacterStartRoute: total_rp 추가
ALTER TABLE "v2_CharacterStartRoute"
  ADD COLUMN IF NOT EXISTS total_rp NUMERIC DEFAULT 0;

-- 5. v2_CharacterItemPriority: total_games, total_rp 추가
ALTER TABLE "v2_CharacterItemPriority"
  ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rp NUMERIC DEFAULT 0;


-- ────────────────────────────────────────────────────────────
-- RPC 함수 업데이트 (RP 저장 추가)
-- ────────────────────────────────────────────────────────────

-- 2. v2_CharacterTraitBuildStats: totalRP 저장
CREATE OR REPLACE FUNCTION upsert_v2_character_trait_build(
  p_character_num INTEGER,
  p_main_core INTEGER,
  p_sub1 INTEGER,
  p_sub2 INTEGER,
  p_sub3 INTEGER,
  p_sub4 INTEGER,
  p_option1 INTEGER,
  p_option2 INTEGER,
  p_option3 INTEGER,
  p_option4 INTEGER,
  p_best_weapon INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "v2_CharacterTraitBuildStats" (
    "characterNum", "mainCore", sub1, sub2, sub3, sub4,
    "optionTrait1", "optionTrait2", "optionTrait3", "optionTrait4",
    "bestWeapon", "tier", "patchVersion",
    "totalGames", "totalWins", "totalRP"
  ) VALUES (
    p_character_num, p_main_core, p_sub1, p_sub2, p_sub3, p_sub4,
    p_option1, p_option2, p_option3, p_option4,
    p_best_weapon, p_tier, p_patch_version,
    p_games, p_wins, p_rp
  )
  ON CONFLICT ("characterNum", "mainCore", sub1, sub2, sub3, sub4,
               "optionTrait1", "optionTrait2", "optionTrait3", "optionTrait4",
               "bestWeapon", "tier", "patchVersion")
  DO UPDATE SET
    "totalGames" = "v2_CharacterTraitBuildStats"."totalGames" + p_games,
    "totalWins" = "v2_CharacterTraitBuildStats"."totalWins" + p_wins,
    "totalRP" = "v2_CharacterTraitBuildStats"."totalRP" + p_rp;
END;
$$ LANGUAGE plpgsql;

-- 3. v2_CharacterSkillOrder: total_rp 저장
CREATE OR REPLACE FUNCTION upsert_v2_character_skill_order(
  p_character_num INTEGER,
  p_best_weapon INTEGER,
  p_main_core INTEGER,
  p_skill_order INTEGER[],
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "v2_CharacterSkillOrder" (
    character_num, best_weapon, main_core, skill_order,
    tier, patch_version, total_games, total_wins, total_rp, last_updated
  ) VALUES (
    p_character_num, p_best_weapon, p_main_core, p_skill_order,
    p_tier, p_patch_version, p_games, p_wins, p_rp, NOW()
  )
  ON CONFLICT (character_num, best_weapon, main_core, skill_order, tier, patch_version)
  DO UPDATE SET
    total_games = "v2_CharacterSkillOrder".total_games + p_games,
    total_wins = "v2_CharacterSkillOrder".total_wins + p_wins,
    total_rp = "v2_CharacterSkillOrder".total_rp + p_rp,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. v2_CharacterStartRoute: total_rp 저장
CREATE OR REPLACE FUNCTION upsert_v2_character_start_route(
  p_character_num INTEGER,
  p_best_weapon INTEGER,
  p_route_id INTEGER,
  p_place_of_start TEXT,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rank NUMERIC,
  p_rp NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "v2_CharacterStartRoute" (
    character_num, best_weapon, route_id, place_of_start,
    tier, patch_version, total_games, total_wins, rank_sum, total_rp, last_updated
  ) VALUES (
    p_character_num, p_best_weapon, p_route_id, p_place_of_start,
    p_tier, p_patch_version, p_games, p_wins, p_rank, p_rp, NOW()
  )
  ON CONFLICT (character_num, best_weapon, route_id, tier, patch_version)
  DO UPDATE SET
    total_games = "v2_CharacterStartRoute".total_games + p_games,
    total_wins = "v2_CharacterStartRoute".total_wins + p_wins,
    rank_sum = "v2_CharacterStartRoute".rank_sum + p_rank,
    total_rp = "v2_CharacterStartRoute".total_rp + p_rp,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. v2_CharacterItemPriority: total_games, total_rp 저장
CREATE OR REPLACE FUNCTION upsert_v2_character_item_priority(
  p_character_num INTEGER,
  p_best_weapon INTEGER,
  p_route_id INTEGER,
  p_craft_legend INTEGER,
  p_slot INTEGER,
  p_item_code INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER DEFAULT 1,
  p_rp NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "v2_CharacterItemPriority" (
    character_num, best_weapon, route_id, craft_legend, slot, item_code,
    occurrences, total_games, total_rp, tier, patch_version
  ) VALUES (
    p_character_num, p_best_weapon, p_route_id, p_craft_legend, p_slot, p_item_code,
    1, p_games, p_rp, p_tier, p_patch_version
  )
  ON CONFLICT (character_num, best_weapon, route_id, craft_legend, slot, item_code, tier, patch_version)
  DO UPDATE SET
    occurrences = "v2_CharacterItemPriority".occurrences + 1,
    total_games = "v2_CharacterItemPriority".total_games + p_games,
    total_rp = "v2_CharacterItemPriority".total_rp + p_rp;
END;
$$ LANGUAGE plpgsql;

COMMIT;
