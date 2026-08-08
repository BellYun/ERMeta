-- ============================================================
-- v2_CharacterTrioWeaponSearch_all lookup tables
--
-- 목적:
--   - slot별 ally1/ally2/third 위치를 3개 쿼리로 탐색하던 조합 조회를
--     canonical key 기반 단일 indexed lookup 으로 전환한다.
--   - pair / pair+weapon / single-character 조회를 각각 equality lookup 으로 처리한다.
--
-- 백필:
--   - 대용량 적재는 SQL Editor timeout을 피하기 위해
--     backend/manual_sql/backfill_trio_weapon_lookup_tables_stepwise.sql 에서
--     id range 단위로 분리 실행한다.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CharacterTrioWeaponPairLookup" (
  id                    BIGSERIAL PRIMARY KEY,
  source_search_id      BIGINT NOT NULL,

  pair_key              TEXT NOT NULL,
  pair_key_hash         TEXT GENERATED ALWAYS AS (md5(pair_key)) STORED,
  pair_weapon_key       TEXT NOT NULL,
  pair_weapon_key_hash  TEXT GENERATED ALWAYS AS (md5(pair_weapon_key)) STORED,

  ally1_char            INTEGER NOT NULL,
  ally1_weapon          INTEGER NOT NULL,
  ally1_core            INTEGER DEFAULT 0,
  ally2_char            INTEGER NOT NULL,
  ally2_weapon          INTEGER NOT NULL,
  ally2_core            INTEGER DEFAULT 0,
  third_char            INTEGER NOT NULL,
  third_weapon          INTEGER NOT NULL,
  third_core            INTEGER DEFAULT 0,
  total_games           INTEGER DEFAULT 0,
  total_wins            INTEGER DEFAULT 0,
  total_rp              NUMERIC DEFAULT 0,
  rank_sum              NUMERIC DEFAULT 0,
  last_updated          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (source_search_id, pair_key, pair_weapon_key)
);

CREATE TABLE IF NOT EXISTS "v2_CharacterTrioWeaponMemberLookup" (
  id                      BIGSERIAL PRIMARY KEY,
  source_search_id        BIGINT NOT NULL,

  member_key              TEXT NOT NULL,
  member_key_hash         TEXT GENERATED ALWAYS AS (md5(member_key)) STORED,
  member_weapon_key       TEXT NOT NULL,
  member_weapon_key_hash  TEXT GENERATED ALWAYS AS (md5(member_weapon_key)) STORED,

  ally1_char              INTEGER NOT NULL,
  ally1_weapon            INTEGER NOT NULL,
  ally1_core              INTEGER DEFAULT 0,
  ally2_char              INTEGER NOT NULL,
  ally2_weapon            INTEGER NOT NULL,
  ally2_core              INTEGER DEFAULT 0,
  third_char              INTEGER NOT NULL,
  third_weapon            INTEGER NOT NULL,
  third_core              INTEGER DEFAULT 0,
  total_games             INTEGER DEFAULT 0,
  total_wins              INTEGER DEFAULT 0,
  total_rp                NUMERIC DEFAULT 0,
  rank_sum                NUMERIC DEFAULT 0,
  last_updated            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (source_search_id, member_key, member_weapon_key)
);

ALTER TABLE "v2_CharacterTrioWeaponPairLookup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "v2_CharacterTrioWeaponMemberLookup" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read trio weapon pair lookup"
ON "v2_CharacterTrioWeaponPairLookup";

CREATE POLICY "Allow public read trio weapon pair lookup"
ON "v2_CharacterTrioWeaponPairLookup"
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public read trio weapon member lookup"
ON "v2_CharacterTrioWeaponMemberLookup";

CREATE POLICY "Allow public read trio weapon member lookup"
ON "v2_CharacterTrioWeaponMemberLookup"
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON "v2_CharacterTrioWeaponPairLookup"
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON "v2_CharacterTrioWeaponMemberLookup"
FROM anon, authenticated;

GRANT SELECT
ON "v2_CharacterTrioWeaponPairLookup"
TO anon, authenticated;

GRANT SELECT
ON "v2_CharacterTrioWeaponMemberLookup"
TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_pair_lookup_pair_hash_games
ON "v2_CharacterTrioWeaponPairLookup" (
  pair_key_hash,
  pair_key,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_pair_lookup_pair_weapon_hash_games
ON "v2_CharacterTrioWeaponPairLookup" (
  pair_weapon_key_hash,
  pair_weapon_key,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_member_lookup_member_hash_games
ON "v2_CharacterTrioWeaponMemberLookup" (
  member_key_hash,
  member_key,
  total_games DESC
);

CREATE INDEX IF NOT EXISTS idx_v2_trio_weapon_member_lookup_member_weapon_hash_games
ON "v2_CharacterTrioWeaponMemberLookup" (
  member_weapon_key_hash,
  member_weapon_key,
  total_games DESC
);

COMMIT;
