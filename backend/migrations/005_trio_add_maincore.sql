-- ============================================================
-- v2_CharacterTrio에 main_core 컬럼 추가
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

BEGIN;

-- 1. 컬럼 추가
ALTER TABLE "v2_CharacterTrio"
  ADD COLUMN IF NOT EXISTS "mainCore1" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mainCore2" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mainCore3" INTEGER DEFAULT 0;

-- 2. 기존 UNIQUE 제약 찾아서 제거 (이름 모를 수 있으니 전부 시도)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = '"v2_CharacterTrio"'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE "v2_CharacterTrio" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 3. mainCore 포함 새 UNIQUE 제약 생성
ALTER TABLE "v2_CharacterTrio"
  ADD CONSTRAINT "v2_CharacterTrio_unique"
  UNIQUE ("character1", "character2", "character3", "mainCore1", "mainCore2", "mainCore3", "tier", "patchVersion");

-- 4. RPC 함수 업데이트
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
  INSERT INTO "v2_CharacterTrio" (
    "character1", "character2", "character3",
    "mainCore1", "mainCore2", "mainCore3",
    "tier", "patchVersion",
    "totalGames", "winRate", "averageRP", "averageRank", "lastUpdated"
  ) VALUES (
    p_char1, p_char2, p_char3,
    p_core1, p_core2, p_core3,
    p_tier, p_patch_version,
    p_games,
    CASE WHEN p_games > 0 THEN p_wins::NUMERIC / p_games ELSE 0 END,
    p_rp,
    p_rank,
    NOW()
  )
  ON CONFLICT ("character1", "character2", "character3", "mainCore1", "mainCore2", "mainCore3", "tier", "patchVersion")
  DO UPDATE SET
    "totalGames" = "v2_CharacterTrio"."totalGames" + p_games,
    "winRate" = ("v2_CharacterTrio"."winRate" * "v2_CharacterTrio"."totalGames" + p_wins)::NUMERIC
                / ("v2_CharacterTrio"."totalGames" + p_games),
    "averageRP" = ("v2_CharacterTrio"."averageRP" * "v2_CharacterTrio"."totalGames" + p_rp)
                  / ("v2_CharacterTrio"."totalGames" + p_games),
    "averageRank" = ("v2_CharacterTrio"."averageRank" * "v2_CharacterTrio"."totalGames" + p_rank)
                    / ("v2_CharacterTrio"."totalGames" + p_games),
    "lastUpdated" = NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
