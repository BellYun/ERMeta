-- ============================================================
-- ER&GG v2.0 - old 테이블 RPC 함수 (Forward 워커에서 호출)
-- 기존 서비스 유지를 위해 old 테이블에도 동시 upsert
-- ⚠️ old 테이블의 tier 컬럼은 Prisma enum "TierGroup" 타입
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. CharacterStats upsert (old)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_old_character_stats(
  p_character_num INTEGER,
  p_best_weapon INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_top3 INTEGER,
  p_rp INTEGER,
  p_rank INTEGER,
  p_damage INTEGER DEFAULT 0,
  p_tk INTEGER DEFAULT 0,
  p_player_kill INTEGER DEFAULT 0,
  p_player_assist INTEGER DEFAULT 0,
  p_monster_kill INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "CharacterStats" (
    "id", "characterNum", "bestWeapon", "tier", "patchVersion",
    "totalGames", "totalWins", "totalTop3", "totalTop3Games",
    "totalRP", "totalDamage", "totalTK",
    "totalPlayerKill", "totalPlayerAssist", "totalMonsterKill",
    "totalDamageFromPlayer", "totalDamageToMonster", "totalDamageFromMonster",
    "rankSum", "top3RankSum",
    "averageRank", "averageRP", "averageDamage", "averageTK",
    "averagePlayerKill", "averagePlayerAssist", "averageMonsterKill",
    "averageDamageFromPlayer", "averageDamageToMonster", "averageDamageFromMonster",
    "averageTop3Rank",
    "winRate", "pickRate", "top3Rate"
  ) VALUES (
    gen_random_uuid()::TEXT, p_character_num, p_best_weapon, p_tier::"TierGroup", p_patch_version,
    p_games, p_wins, p_top3, CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END,
    p_rp, p_damage, p_tk,
    p_player_kill, p_player_assist, p_monster_kill,
    0, 0, 0,
    p_rank, CASE WHEN p_rank <= 3 THEN p_rank ELSE 0 END,
    p_rank, p_rp, p_damage, p_tk,
    p_player_kill, p_player_assist, p_monster_kill,
    0, 0, 0,
    CASE WHEN p_rank <= 3 THEN p_rank ELSE 0 END,
    CASE WHEN p_games > 0 THEN (p_wins::NUMERIC / p_games) * 100 ELSE 0 END,
    0, -- pickRate는 별도 계산
    CASE WHEN p_games > 0 THEN (p_top3::NUMERIC / p_games) * 100 ELSE 0 END
  )
  ON CONFLICT ("characterNum", "tier", "patchVersion", "bestWeapon")
  DO UPDATE SET
    "totalGames" = "CharacterStats"."totalGames" + p_games,
    "totalWins" = "CharacterStats"."totalWins" + p_wins,
    "totalTop3" = "CharacterStats"."totalTop3" + p_top3,
    "totalTop3Games" = "CharacterStats"."totalTop3Games" + CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END,
    "totalRP" = "CharacterStats"."totalRP" + p_rp,
    "totalDamage" = "CharacterStats"."totalDamage" + p_damage,
    "totalTK" = "CharacterStats"."totalTK" + p_tk,
    "totalPlayerKill" = "CharacterStats"."totalPlayerKill" + p_player_kill,
    "totalPlayerAssist" = "CharacterStats"."totalPlayerAssist" + p_player_assist,
    "totalMonsterKill" = "CharacterStats"."totalMonsterKill" + p_monster_kill,
    "rankSum" = "CharacterStats"."rankSum" + p_rank,
    "top3RankSum" = "CharacterStats"."top3RankSum" + CASE WHEN p_rank <= 3 THEN p_rank ELSE 0 END,
    "averageRank" = ("CharacterStats"."rankSum" + p_rank)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averageRP" = ("CharacterStats"."totalRP" + p_rp)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averageDamage" = ("CharacterStats"."totalDamage" + p_damage)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averageTK" = ("CharacterStats"."totalTK" + p_tk)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averagePlayerKill" = ("CharacterStats"."totalPlayerKill" + p_player_kill)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averagePlayerAssist" = ("CharacterStats"."totalPlayerAssist" + p_player_assist)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "averageMonsterKill" = ("CharacterStats"."totalMonsterKill" + p_monster_kill)::NUMERIC / ("CharacterStats"."totalGames" + p_games),
    "winRate" = (("CharacterStats"."totalWins" + p_wins)::NUMERIC / ("CharacterStats"."totalGames" + p_games)) * 100,
    "top3Rate" = (("CharacterStats"."totalTop3" + p_top3)::NUMERIC / ("CharacterStats"."totalGames" + p_games)) * 100;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 2. CharacterTrio upsert (old, patchVersion 없음)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_old_character_trio(
  p_char1 INTEGER,
  p_char2 INTEGER,
  p_char3 INTEGER,
  p_tier TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp INTEGER,
  p_rank INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "CharacterTrio" (
    "id", "character1", "character2", "character3", "tier",
    "totalGames", "totalWins", "totalTop3", "totalRP",
    "totalDamage", "totalTK", "totalPlayerKill", "totalPlayerAssist", "totalMonsterKill",
    "rankSum",
    "averageRank", "averageRP", "averageDamage", "averageTK",
    "averagePlayerKill", "averagePlayerAssist", "averageMonsterKill",
    "winRate", "lastUpdated"
  ) VALUES (
    gen_random_uuid()::TEXT, p_char1, p_char2, p_char3, p_tier::"TierGroup",
    p_games, p_wins, CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END, p_rp,
    0, 0, 0, 0, 0,
    p_rank,
    p_rank, p_rp, 0, 0,
    0, 0, 0,
    CASE WHEN p_games > 0 THEN (p_wins::NUMERIC / p_games) * 100 ELSE 0 END,
    NOW()
  )
  ON CONFLICT ("character1", "character2", "character3", "tier")
  DO UPDATE SET
    "totalGames" = "CharacterTrio"."totalGames" + p_games,
    "totalWins" = "CharacterTrio"."totalWins" + p_wins,
    "totalTop3" = "CharacterTrio"."totalTop3" + CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END,
    "totalRP" = "CharacterTrio"."totalRP" + p_rp,
    "rankSum" = "CharacterTrio"."rankSum" + p_rank,
    "averageRank" = ("CharacterTrio"."rankSum" + p_rank)::NUMERIC / ("CharacterTrio"."totalGames" + p_games),
    "averageRP" = ("CharacterTrio"."totalRP" + p_rp)::NUMERIC / ("CharacterTrio"."totalGames" + p_games),
    "winRate" = (("CharacterTrio"."totalWins" + p_wins)::NUMERIC / ("CharacterTrio"."totalGames" + p_games)) * 100,
    "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 3. CharacterTrioByWeapon upsert (old)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_old_character_trio_by_weapon(
  p_char1 INTEGER, p_weapon1 INTEGER,
  p_char2 INTEGER, p_weapon2 INTEGER,
  p_char3 INTEGER, p_weapon3 INTEGER,
  p_tier TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp INTEGER,
  p_rank INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "CharacterTrioByWeapon" (
    "id", "character1", "weapon1", "character2", "weapon2", "character3", "weapon3",
    "tier",
    "totalGames", "totalWins", "totalTop3", "totalRP",
    "totalDamage", "totalTK", "totalPlayerKill", "totalPlayerAssist", "totalMonsterKill",
    "rankSum",
    "averageRank", "averageRP", "averageDamage", "averageTK",
    "averagePlayerKill", "averagePlayerAssist", "averageMonsterKill",
    "lastUpdated"
  ) VALUES (
    gen_random_uuid()::TEXT, p_char1, p_weapon1, p_char2, p_weapon2, p_char3, p_weapon3,
    p_tier::"TierGroup",
    p_games, p_wins, CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END, p_rp,
    0, 0, 0, 0, 0,
    p_rank,
    p_rank, p_rp, 0, 0,
    0, 0, 0,
    NOW()
  )
  ON CONFLICT ("character1", "weapon1", "character2", "weapon2", "character3", "weapon3", "tier")
  DO UPDATE SET
    "totalGames" = "CharacterTrioByWeapon"."totalGames" + p_games,
    "totalWins" = "CharacterTrioByWeapon"."totalWins" + p_wins,
    "totalTop3" = "CharacterTrioByWeapon"."totalTop3" + CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END,
    "totalRP" = "CharacterTrioByWeapon"."totalRP" + p_rp,
    "rankSum" = "CharacterTrioByWeapon"."rankSum" + p_rank,
    "averageRank" = ("CharacterTrioByWeapon"."rankSum" + p_rank)::NUMERIC / ("CharacterTrioByWeapon"."totalGames" + p_games),
    "averageRP" = ("CharacterTrioByWeapon"."totalRP" + p_rp)::NUMERIC / ("CharacterTrioByWeapon"."totalGames" + p_games),
    "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 4. CharacterTraitBuildStats upsert (old)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_old_character_trait_build(
  p_character_num INTEGER,
  p_main_core INTEGER,
  p_sub1 INTEGER,
  p_sub2 INTEGER,
  p_sub3 INTEGER,
  p_sub4 INTEGER,
  p_best_weapon INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_top3 INTEGER,
  p_rp INTEGER,
  p_rank INTEGER,
  p_positive_rp INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "CharacterTraitBuildStats" (
    "id", "characterNum", "mainCore", "sub1", "sub2", "sub3", "sub4",
    "bestWeapon", "tier", "patchVersion",
    "totalGames", "totalWins", "totalTop3", "totalRP", "positiveRPGames", "rankSum",
    "averageRank", "winRate", "top3Rate", "averageRP", "rpGainRate",
    "lastUpdated"
  ) VALUES (
    gen_random_uuid()::TEXT, p_character_num, p_main_core, p_sub1, p_sub2, p_sub3, p_sub4,
    p_best_weapon, p_tier::"TierGroup", p_patch_version,
    p_games, p_wins, p_top3, p_rp, p_positive_rp, p_rank,
    p_rank,
    CASE WHEN p_games > 0 THEN (p_wins::NUMERIC / p_games) * 100 ELSE 0 END,
    CASE WHEN p_games > 0 THEN (p_top3::NUMERIC / p_games) * 100 ELSE 0 END,
    p_rp,
    CASE WHEN p_games > 0 THEN (p_positive_rp::NUMERIC / p_games) * 100 ELSE 0 END,
    NOW()
  )
  ON CONFLICT ("characterNum", "tier", "patchVersion", "bestWeapon", "mainCore", "sub1", "sub2", "sub3", "sub4")
  DO UPDATE SET
    "totalGames" = "CharacterTraitBuildStats"."totalGames" + p_games,
    "totalWins" = "CharacterTraitBuildStats"."totalWins" + p_wins,
    "totalTop3" = "CharacterTraitBuildStats"."totalTop3" + p_top3,
    "totalRP" = "CharacterTraitBuildStats"."totalRP" + p_rp,
    "positiveRPGames" = "CharacterTraitBuildStats"."positiveRPGames" + p_positive_rp,
    "rankSum" = "CharacterTraitBuildStats"."rankSum" + p_rank,
    "averageRank" = ("CharacterTraitBuildStats"."rankSum" + p_rank)::NUMERIC / ("CharacterTraitBuildStats"."totalGames" + p_games),
    "winRate" = (("CharacterTraitBuildStats"."totalWins" + p_wins)::NUMERIC / ("CharacterTraitBuildStats"."totalGames" + p_games)) * 100,
    "top3Rate" = (("CharacterTraitBuildStats"."totalTop3" + p_top3)::NUMERIC / ("CharacterTraitBuildStats"."totalGames" + p_games)) * 100,
    "averageRP" = ("CharacterTraitBuildStats"."totalRP" + p_rp)::NUMERIC / ("CharacterTraitBuildStats"."totalGames" + p_games),
    "rpGainRate" = (("CharacterTraitBuildStats"."positiveRPGames" + p_positive_rp)::NUMERIC / ("CharacterTraitBuildStats"."totalGames" + p_games)) * 100,
    "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 5. CharacterEquipmentBuildStats upsert (old)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_old_character_equipment_build(
  p_character_num INTEGER,
  p_main_core INTEGER,
  p_weapon INTEGER,
  p_chest INTEGER,
  p_head INTEGER,
  p_arm INTEGER,
  p_leg INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_top3 INTEGER,
  p_rp INTEGER,
  p_rank INTEGER,
  p_positive_rp INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "CharacterEquipmentBuildStats" (
    "id", "characterNum", "mainCore", "weapon", "chest", "head", "arm", "leg",
    "tier", "patchVersion",
    "totalGames", "totalWins", "totalTop3", "totalRP", "positiveRPGames", "rankSum",
    "averageRank", "winRate", "top3Rate", "averageRP", "rpGainRate",
    "lastUpdated"
  ) VALUES (
    gen_random_uuid()::TEXT, p_character_num, p_main_core, p_weapon, p_chest, p_head, p_arm, p_leg,
    p_tier::"TierGroup", p_patch_version,
    p_games, p_wins, p_top3, p_rp, p_positive_rp, p_rank,
    p_rank,
    CASE WHEN p_games > 0 THEN (p_wins::NUMERIC / p_games) * 100 ELSE 0 END,
    CASE WHEN p_games > 0 THEN (p_top3::NUMERIC / p_games) * 100 ELSE 0 END,
    p_rp,
    CASE WHEN p_games > 0 THEN (p_positive_rp::NUMERIC / p_games) * 100 ELSE 0 END,
    NOW()
  )
  ON CONFLICT ("characterNum", "tier", "patchVersion", "mainCore", "weapon", "chest", "head", "arm", "leg")
  DO UPDATE SET
    "totalGames" = "CharacterEquipmentBuildStats"."totalGames" + p_games,
    "totalWins" = "CharacterEquipmentBuildStats"."totalWins" + p_wins,
    "totalTop3" = "CharacterEquipmentBuildStats"."totalTop3" + p_top3,
    "totalRP" = "CharacterEquipmentBuildStats"."totalRP" + p_rp,
    "positiveRPGames" = "CharacterEquipmentBuildStats"."positiveRPGames" + p_positive_rp,
    "rankSum" = "CharacterEquipmentBuildStats"."rankSum" + p_rank,
    "averageRank" = ("CharacterEquipmentBuildStats"."rankSum" + p_rank)::NUMERIC / ("CharacterEquipmentBuildStats"."totalGames" + p_games),
    "winRate" = (("CharacterEquipmentBuildStats"."totalWins" + p_wins)::NUMERIC / ("CharacterEquipmentBuildStats"."totalGames" + p_games)) * 100,
    "top3Rate" = (("CharacterEquipmentBuildStats"."totalTop3" + p_top3)::NUMERIC / ("CharacterEquipmentBuildStats"."totalGames" + p_games)) * 100,
    "averageRP" = ("CharacterEquipmentBuildStats"."totalRP" + p_rp)::NUMERIC / ("CharacterEquipmentBuildStats"."totalGames" + p_games),
    "rpGainRate" = (("CharacterEquipmentBuildStats"."positiveRPGames" + p_positive_rp)::NUMERIC / ("CharacterEquipmentBuildStats"."totalGames" + p_games)) * 100,
    "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;


COMMIT;
