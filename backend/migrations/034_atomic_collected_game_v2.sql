-- 경기별 집계를 하나의 트랜잭션으로 묶고 재시도 시 중복 적재를 막는다.
BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CollectedGame" (
  game_number BIGINT PRIMARY KEY,
  patch_version TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON "v2_CollectedGame" FROM anon, authenticated;
GRANT SELECT, INSERT ON "v2_CollectedGame" TO service_role;

CREATE OR REPLACE FUNCTION process_collected_game_v2(p_game_number BIGINT, p_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_inserted INT;
  v_main JSONB;
  v_tactical JSONB;
BEGIN
  IF p_game_number IS NULL OR p_game_number <= 0 OR p_data->>'patch_version' IS NULL THEN
    RAISE EXCEPTION 'game number and patch version are required';
  END IF;

  INSERT INTO "v2_CollectedGame" (game_number, patch_version)
  VALUES (p_game_number, p_data->>'patch_version')
  ON CONFLICT (game_number) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('duplicate', true);
  END IF;

  v_main := process_game_v2(p_data);
  IF COALESCE((v_main->>'fail')::INT, 0) > 0 THEN
    RAISE EXCEPTION 'game % main aggregation failed: %', p_game_number, v_main->'errors';
  END IF;

  v_tactical := process_character_tactical_batch(p_data);
  IF COALESCE((v_tactical->>'fail')::INT, 0) > 0 THEN
    RAISE EXCEPTION 'game % tactical aggregation failed: %', p_game_number, v_tactical->'errors';
  END IF;

  RETURN jsonb_build_object('duplicate', false, 'main', v_main, 'tactical', v_tactical);
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION process_collected_game_v2(BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_collected_game_v2(BIGINT, JSONB) TO service_role;

COMMIT;
