-- ============================================================
-- upsert_v2_character_trio NO-OP 처리 (mainCore 시그니처 — 005 이후)
--
-- v2_CharacterTrio 테이블 제거됨 → INSERT 시 "relation does not exist" 에러.
-- caller (015 process_game_v2)는 그대로 두고 함수 본체만 NO-OP으로 변경.
-- v2_CharacterTrioWeapon 누적은 별도 함수라 영향 없음.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION upsert_v2_character_trio(
  p_char1 INTEGER,
  p_char2 INTEGER,
  p_char3 INTEGER,
  p_core1 INTEGER,
  p_core2 INTEGER,
  p_core3 INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp NUMERIC,
  p_rank INTEGER
) RETURNS VOID AS $$
BEGIN
  -- v2_CharacterTrio 테이블 제거됨 (2026-05). NO-OP.
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 9-param (002) 버전도 함께 NO-OP — 안전하게
CREATE OR REPLACE FUNCTION upsert_v2_character_trio(
  p_char1 INTEGER,
  p_char2 INTEGER,
  p_char3 INTEGER,
  p_tier TEXT,
  p_patch_version TEXT,
  p_games INTEGER,
  p_wins INTEGER,
  p_rp NUMERIC,
  p_rank INTEGER
) RETURNS VOID AS $$
BEGIN
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMIT;
