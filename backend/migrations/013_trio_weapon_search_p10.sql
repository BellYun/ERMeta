-- ============================================================
-- 검색용 v2_CharacterTrioWeaponSearch_p10 테이블 생성
-- 목적:
--   - patch 10.x + diamond+ 전체를 검색 전용 pair index 형태로 재구성
--   - synergy-detail 2인(+무기) 조건 검색에서 JS 후처리/limit 누락을 줄인다
--   - 저장 시 tier는 통합하고, 필요한 경우 백필만 patch/tier slice로 나눠 수행한다.
-- 주의:
--   - 대용량 backfill은 SQL editor timeout을 피하기 위해
--     backend/manual_sql/backfill_trio_weapon_search_p10_stepwise.sql 에서
--     패치별 순차 적재로 분리한다.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CharacterTrioWeaponSearch_p10" (
  id            BIGSERIAL PRIMARY KEY,
  patch_major   TEXT NOT NULL DEFAULT '10',
  ally1_char    INTEGER NOT NULL,
  ally1_weapon  INTEGER NOT NULL,
  ally1_core    INTEGER DEFAULT 0,
  ally2_char    INTEGER NOT NULL,
  ally2_weapon  INTEGER NOT NULL,
  ally2_core    INTEGER DEFAULT 0,
  third_char    INTEGER NOT NULL,
  third_weapon  INTEGER NOT NULL,
  third_core    INTEGER DEFAULT 0,
  total_games   INTEGER DEFAULT 0,
  total_wins    INTEGER DEFAULT 0,
  total_rp      NUMERIC DEFAULT 0,
  rank_sum      NUMERIC DEFAULT 0,
  last_updated  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (
    patch_major,
    ally1_char,
    ally1_weapon,
    ally1_core,
    ally2_char,
    ally2_weapon,
    ally2_core,
    third_char,
    third_weapon,
    third_core
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_p10_pair
ON "v2_CharacterTrioWeaponSearch_p10" (
  ally1_char,
  ally1_weapon,
  ally2_char,
  ally2_weapon,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_p10_pair_chars
ON "v2_CharacterTrioWeaponSearch_p10" (
  ally1_char,
  ally2_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_p10_third
ON "v2_CharacterTrioWeaponSearch_p10" (
  third_char,
  third_weapon
);

COMMIT;
