-- ============================================================
-- 014: v2_PlayerGameRecord 제거
-- 목적:
--   - process_game_v2의 PlayerGameRecord insert 제거
--   - cleanup-v2-player-records cron 해제
--   - v2_PlayerGameRecord 테이블 삭제
-- ============================================================

BEGIN;

-- ── 1. cleanup cron 해제 (pg_cron 미설치/미등록 환경에서도 안전) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'cron'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'cleanup-v2-player-records'
    ) THEN
      PERFORM cron.unschedule('cleanup-v2-player-records');
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table OR invalid_schema_name OR undefined_function THEN
    NULL;
END;
$$;

-- ── 2. process_game_v2 재정의 (v2_PlayerGameRecord insert 제거) ──
CREATE OR REPLACE FUNCTION process_game_v2(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_patch TEXT := p_data->>'patch_version';
  v_p JSONB;
  v_t JSONB;
  v_ls JSONB;
  v_tier TEXT;
  v_tiers TEXT[];
  v_cn INT; v_bw INT; v_gr INT; v_pk INT; v_pa INT; v_cl INT;
  v_eq0 INT; v_eq1 INT; v_eq2 INT; v_eq3 INT; v_eq4 INT;
  v_cfl INT; v_tfc INT; v_rid INT; v_mb INT; v_ma INT;
  v_pos TEXT; v_rp NUMERIC;
  v_fs1 INT; v_fs2 INT;
  v_ss1 INT; v_ss2 INT;
  v_skill_order INT[];
  v_ok INT := 0;
  v_fail INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR v_p IN SELECT * FROM jsonb_array_elements(p_data->'participants')
  LOOP
    IF v_p->>'cn' IS NULL OR v_p->>'bw' IS NULL OR v_p->>'gr' IS NULL THEN
      v_fail := v_fail + 1;
      v_errors := array_append(v_errors, format('participant cn=%s: missing required fields', v_p->>'cn'));
      CONTINUE;
    END IF;

    v_cn  := (v_p->>'cn')::INT;
    v_bw  := (v_p->>'bw')::INT;
    v_gr  := (v_p->>'gr')::INT;
    v_pk  := COALESCE((v_p->>'pk')::INT, 0);
    v_pa  := COALESCE((v_p->>'pa')::INT, 0);
    v_cl  := COALESCE((v_p->>'cl')::INT, 0);
    v_eq0 := COALESCE((v_p->>'eq0')::INT, 0);
    v_eq1 := COALESCE((v_p->>'eq1')::INT, 0);
    v_eq2 := COALESCE((v_p->>'eq2')::INT, 0);
    v_eq3 := COALESCE((v_p->>'eq3')::INT, 0);
    v_eq4 := COALESCE((v_p->>'eq4')::INT, 0);
    v_cfl := COALESCE((v_p->>'cfl')::INT, 0);
    v_tfc := COALESCE((v_p->>'tfc')::INT, 0);
    v_rid := (v_p->>'rid')::INT;
    v_pos := v_p->>'pos';
    v_mb  := COALESCE((v_p->>'mb')::INT, 0);
    v_ma  := COALESCE((v_p->>'ma')::INT, 0);
    v_rp  := (v_ma - v_mb)::NUMERIC;

    v_fs1 := (v_p->'fs'->0)::INT; v_fs2 := (v_p->'fs'->1)::INT;
    v_ss1 := (v_p->'ss'->0)::INT; v_ss2 := (v_p->'ss'->1)::INT;

    SELECT COALESCE(array_agg(e::INT), ARRAY[]::INT[])
    INTO v_skill_order
    FROM jsonb_array_elements_text(v_p->'so') e;

    SELECT array_agg(e::TEXT)
    INTO v_tiers
    FROM jsonb_array_elements_text(v_p->'tiers') e;

    IF v_tiers IS NULL OR array_length(v_tiers, 1) IS NULL THEN
      CONTINUE;
    END IF;

    FOREACH v_tier IN ARRAY v_tiers
    LOOP
      PERFORM upsert_v2_character_stats(
        v_cn, v_bw, v_tier, v_patch, 1,
        CASE WHEN v_gr = 1 THEN 1 ELSE 0 END,
        CASE WHEN v_gr <= 3 THEN 1 ELSE 0 END,
        v_rp, v_gr
      );

      IF v_tfc > 0 THEN
        PERFORM upsert_v2_character_equipment_build(
          v_cn, v_tfc,
          NULLIF(v_eq0, 0), NULLIF(v_eq1, 0), NULLIF(v_eq2, 0), NULLIF(v_eq3, 0), NULLIF(v_eq4, 0),
          v_tier, v_patch, 1,
          CASE WHEN v_gr = 1 THEN 1 ELSE 0 END,
          v_rp, v_gr
        );

        PERFORM upsert_v2_character_trait_build(
          v_cn, v_tfc,
          v_fs1, v_fs2,
          v_ss1, v_ss2,
          v_bw, v_tier, v_patch, 1,
          CASE WHEN v_gr = 1 THEN 1 ELSE 0 END,
          v_rp
        );
      END IF;

      IF array_length(v_skill_order, 1) > 0 THEN
        PERFORM upsert_v2_character_skill_order(
          v_cn, v_bw, NULLIF(v_tfc, 0), v_skill_order,
          v_tier, v_patch, 1,
          CASE WHEN v_gr = 1 THEN 1 ELSE 0 END,
          v_rp
        );
      END IF;

      IF v_rid IS NOT NULL AND v_pos IS NOT NULL AND v_pos != '' THEN
        PERFORM upsert_v2_character_start_route(
          v_cn, v_bw, v_rid, v_pos,
          v_tier, v_patch, 1,
          CASE WHEN v_gr = 1 THEN 1 ELSE 0 END,
          v_gr, v_rp
        );
      END IF;

      IF v_cfl > 0 AND v_p->'ls' IS NOT NULL AND jsonb_array_length(v_p->'ls') > 0 THEN
        FOR v_ls IN SELECT * FROM jsonb_array_elements(v_p->'ls')
        LOOP
          PERFORM upsert_v2_character_item_priority(
            v_cn, v_bw, NULL, v_cfl,
            (v_ls->>'s')::INT, (v_ls->>'c')::INT,
            v_tier, v_patch, 1, v_rp
          );
          IF v_rid IS NOT NULL THEN
            PERFORM upsert_v2_character_item_priority(
              v_cn, v_bw, v_rid, v_cfl,
              (v_ls->>'s')::INT, (v_ls->>'c')::INT,
              v_tier, v_patch, 1, v_rp
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;

    v_ok := v_ok + 1;
  END LOOP;

  FOR v_t IN SELECT * FROM jsonb_array_elements(p_data->'trios')
  LOOP
    IF v_t->>'c1' IS NULL OR v_t->>'c2' IS NULL OR v_t->>'c3' IS NULL THEN
      v_fail := v_fail + 1;
      v_errors := array_append(v_errors, format('trio: missing character fields'));
      CONTINUE;
    END IF;

    SELECT array_agg(e::TEXT) INTO v_tiers
    FROM jsonb_array_elements_text(v_t->'tiers') e;

    IF v_tiers IS NULL THEN CONTINUE; END IF;

    FOREACH v_tier IN ARRAY v_tiers
    LOOP
      PERFORM upsert_v2_character_trio(
        (v_t->>'c1')::INT, (v_t->>'c2')::INT, (v_t->>'c3')::INT,
        COALESCE((v_t->>'k1')::INT, 0), COALESCE((v_t->>'k2')::INT, 0), COALESCE((v_t->>'k3')::INT, 0),
        v_tier, v_patch, 1,
        CASE WHEN (v_t->>'gr')::INT = 1 THEN 1 ELSE 0 END,
        (v_t->>'rp')::NUMERIC,
        (v_t->>'gr')::INT
      );

      IF (v_t->>'hw')::BOOLEAN THEN
        PERFORM upsert_v2_character_trio_weapon(
          (v_t->>'c1')::INT, (v_t->>'w1')::INT, COALESCE((v_t->>'k1')::INT, 0),
          (v_t->>'c2')::INT, (v_t->>'w2')::INT, COALESCE((v_t->>'k2')::INT, 0),
          (v_t->>'c3')::INT, (v_t->>'w3')::INT, COALESCE((v_t->>'k3')::INT, 0),
          v_tier, v_patch, 1,
          CASE WHEN (v_t->>'gr')::INT = 1 THEN 1 ELSE 0 END,
          (v_t->>'rp')::NUMERIC,
          (v_t->>'gr')::INT
        );
      END IF;
    END LOOP;

    v_ok := v_ok + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'fail', v_fail, 'errors', to_jsonb(v_errors));
END;
$$ LANGUAGE plpgsql;

-- ── 3. 테이블 제거 ──
DROP TABLE IF EXISTS "v2_PlayerGameRecord";

COMMIT;
