-- 12.4+ 랭크 경기의 API 원본 RP 구성요소를 집계와 별도로 보관한다.
-- 기존 v2 집계와 v2_CollectedGame 행은 수정하지 않는다.
BEGIN;

CREATE TABLE IF NOT EXISTS "v2_CollectedGameRP" (
  game_number BIGINT NOT NULL REFERENCES "v2_CollectedGame" (game_number),
  patch_version TEXT NOT NULL,
  team_number INTEGER NOT NULL,
  character_num INTEGER NOT NULL,
  mmr_before INTEGER NOT NULL,
  mmr_after INTEGER NOT NULL,
  mmr_gain_in_game INTEGER NOT NULL,
  mmr_loss_entry_cost INTEGER NOT NULL CHECK (mmr_loss_entry_cost <= 0),
  mmr_gain INTEGER NOT NULL,
  mmr_gain_gambit INTEGER NOT NULL,
  gambit BOOLEAN NOT NULL,
  kings_gambit BOOLEAN NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_number, team_number, character_num)
);

CREATE INDEX IF NOT EXISTS idx_v2_collected_game_rp_patch
  ON "v2_CollectedGameRP" (patch_version, game_number);

CREATE INDEX IF NOT EXISTS idx_v2_collected_game_patch_number
  ON "v2_CollectedGame" (patch_version, game_number);

ALTER TABLE "v2_CollectedGameRP" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "v2_CollectedGameRP" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "v2_CollectedGameRP" TO service_role;

CREATE TABLE IF NOT EXISTS "v2_RPBackfillStatus" (
  patch_version TEXT PRIMARY KEY,
  last_game_number BIGINT NOT NULL DEFAULT 0,
  processed_games BIGINT NOT NULL DEFAULT 0,
  processed_players BIGINT NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "v2_RPBackfillStatus" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "v2_RPBackfillStatus" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "v2_RPBackfillStatus" TO service_role;

INSERT INTO "v2_RPBackfillStatus" (patch_version)
VALUES ('12.4')
ON CONFLICT (patch_version) DO NOTHING;

COMMIT;
