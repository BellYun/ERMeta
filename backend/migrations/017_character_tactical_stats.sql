-- ============================================================
-- 전술스킬 통계 테이블
--
-- 캐릭터+무기+티어+패치+전술스킬 단위 통계 누적
-- collect Edge Function의 process_game_v2 RPC가 INSERT/UPSERT
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CharacterTacticalStats" (
  character_num         INT              NOT NULL,
  best_weapon           INT              NOT NULL,
  tier                  TEXT             NOT NULL,
  patch_version         TEXT             NOT NULL,
  tactical_skill_group  INT              NOT NULL,
  total_games           INT              NOT NULL DEFAULT 0,
  total_wins            INT              NOT NULL DEFAULT 0,
  total_rank_sum        INT              NOT NULL DEFAULT 0,
  total_rp              DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_updated          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_num, best_weapon, tier, patch_version, tactical_skill_group)
);

CREATE INDEX IF NOT EXISTS idx_tactical_patch_tier
  ON "v2_CharacterTacticalStats"(patch_version, tier);

CREATE INDEX IF NOT EXISTS idx_tactical_char_patch_tier
  ON "v2_CharacterTacticalStats"(character_num, patch_version, tier);

GRANT SELECT ON "v2_CharacterTacticalStats" TO anon, authenticated;

COMMIT;
