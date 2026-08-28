-- ============================================================
-- 032: 전술 스킬 통계 적재 파이프라인 연결
--
-- collect payload의 participant.ts 값을 기존
-- v2_CharacterTacticalStats 집계 테이블에 누적한다.
-- 메인 process_game_v2와 분리해 기존 집계 RPC의 동작 및 캐시 정책은 변경하지 않는다.
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

CREATE OR REPLACE FUNCTION process_character_tactical_batch(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_patch TEXT := p_data->>'patch_version';
  v_participant JSONB;
  v_tier TEXT;
  v_tiers TEXT[];
  v_character_num INT;
  v_best_weapon INT;
  v_game_rank INT;
  v_tactical_skill_group INT;
  v_mmr_before INT;
  v_mmr_after INT;
  v_ok INT := 0;
  v_skipped INT := 0;
  v_fail INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR v_participant IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_data->'participants', '[]'::JSONB))
  LOOP
    BEGIN
      v_character_num := COALESCE((v_participant->>'cn')::INT, 0);
      v_best_weapon := COALESCE((v_participant->>'bw')::INT, 0);
      v_game_rank := COALESCE((v_participant->>'gr')::INT, 99);
      v_tactical_skill_group := COALESCE((v_participant->>'ts')::INT, 0);
      v_mmr_before := COALESCE((v_participant->>'mb')::INT, 0);
      v_mmr_after := COALESCE((v_participant->>'ma')::INT, 0);

      IF v_character_num <= 0 OR v_best_weapon <= 0 OR v_tactical_skill_group <= 0 THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      SELECT array_agg(value::TEXT)
      INTO v_tiers
      FROM jsonb_array_elements_text(COALESCE(v_participant->'tiers', '[]'::JSONB)) value;

      IF v_tiers IS NULL OR array_length(v_tiers, 1) IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      FOREACH v_tier IN ARRAY v_tiers
      LOOP
        INSERT INTO "v2_CharacterTacticalStats" (
          character_num,
          best_weapon,
          tier,
          patch_version,
          tactical_skill_group,
          total_games,
          total_wins,
          total_rank_sum,
          total_rp,
          last_updated
        ) VALUES (
          v_character_num,
          v_best_weapon,
          v_tier,
          v_patch,
          v_tactical_skill_group,
          1,
          CASE WHEN v_game_rank = 1 THEN 1 ELSE 0 END,
          v_game_rank,
          v_mmr_after - v_mmr_before,
          NOW()
        )
        ON CONFLICT (
          character_num,
          best_weapon,
          tier,
          patch_version,
          tactical_skill_group
        )
        DO UPDATE SET
          total_games = "v2_CharacterTacticalStats".total_games + 1,
          total_wins = "v2_CharacterTacticalStats".total_wins
            + CASE WHEN v_game_rank = 1 THEN 1 ELSE 0 END,
          total_rank_sum = "v2_CharacterTacticalStats".total_rank_sum + v_game_rank,
          total_rp = "v2_CharacterTacticalStats".total_rp + (v_mmr_after - v_mmr_before),
          last_updated = NOW();
      END LOOP;

      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      v_errors := array_append(
        v_errors,
        format('participant cn=%s: %s', v_character_num, SQLERRM)
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_ok,
    'skipped', v_skipped,
    'fail', v_fail,
    'errors', to_jsonb(v_errors)
  );
END;
$$ LANGUAGE plpgsql;

GRANT SELECT ON "v2_CharacterTacticalStats" TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_character_tactical_batch(JSONB) TO service_role;

COMMIT;
