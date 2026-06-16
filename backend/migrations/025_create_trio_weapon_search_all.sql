-- ============================================================
-- v2_CharacterTrioWeaponSearch_all 신규 사전집계 테이블
--
-- 목적:
--   - 기존 v2_CharacterTrioWeaponSearch_p10 의 작업 지점을 신뢰하기 어려워
--     현재 수집된 v2_CharacterTrioWeapon 전체 데이터에서 새 테이블로 재생성한다.
--   - 프론트엔드는 이 테이블로 먼저 마이그레이션하고, 기존 p10 테이블은
--     배포 확인 후 별도 수동 SQL로 제거한다.
--   - 대용량 적재는 SQL Editor timeout을 피하기 위해
--     backend/manual_sql/backfill_trio_weapon_search_all_stepwise.sql 에서
--     patch_version/tier 단위로 분리 실행한다.
--
-- 집계 기준:
--   - tier IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
--   - 제외 캐릭터 9998, 9999 제외
--   - 정렬된 trio 조합 1개당 search row 1개 생성
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CharacterTrioWeaponSearch_all" (
  id            BIGSERIAL PRIMARY KEY,
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

ALTER TABLE "v2_CharacterTrioWeaponSearch_all" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read trio weapon search all"
ON "v2_CharacterTrioWeaponSearch_all";

CREATE POLICY "Allow public read trio weapon search all"
ON "v2_CharacterTrioWeaponSearch_all"
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON "v2_CharacterTrioWeaponSearch_all"
FROM anon, authenticated;

GRANT SELECT
ON "v2_CharacterTrioWeaponSearch_all"
TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair
ON "v2_CharacterTrioWeaponSearch_all" (
  ally1_char,
  ally1_weapon,
  ally2_char,
  ally2_weapon,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair_13_weapon
ON "v2_CharacterTrioWeaponSearch_all" (
  ally1_char,
  ally1_weapon,
  third_char,
  third_weapon,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair_23_weapon
ON "v2_CharacterTrioWeaponSearch_all" (
  ally2_char,
  ally2_weapon,
  third_char,
  third_weapon,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair_chars
ON "v2_CharacterTrioWeaponSearch_all" (
  ally1_char,
  ally2_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair_13
ON "v2_CharacterTrioWeaponSearch_all" (
  ally1_char,
  third_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_pair_23
ON "v2_CharacterTrioWeaponSearch_all" (
  ally2_char,
  third_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_ally1_games
ON "v2_CharacterTrioWeaponSearch_all" (
  ally1_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_ally2_games
ON "v2_CharacterTrioWeaponSearch_all" (
  ally2_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_third_games
ON "v2_CharacterTrioWeaponSearch_all" (
  third_char,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_search_all_total_games
ON "v2_CharacterTrioWeaponSearch_all" (total_games DESC);

COMMIT;
