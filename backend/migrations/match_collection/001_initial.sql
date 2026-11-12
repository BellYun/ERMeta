BEGIN;

SELECT pg_advisory_xact_lock(372001);

CREATE SCHEMA IF NOT EXISTS match_collection;

CREATE TABLE IF NOT EXISTS match_collection.raw_matches (
  game_id BIGINT PRIMARY KEY CHECK (game_id > 0),
  matching_mode INTEGER NOT NULL CHECK (matching_mode = 3),
  season_id INTEGER,
  patch_version TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  payload_gzip BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS match_collection.cursor (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  next_game_id BIGINT NOT NULL CHECK (next_game_id > 0)
);

CREATE TABLE IF NOT EXISTS match_collection.pending_games (
  game_id BIGINT PRIMARY KEY CHECK (game_id > 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  retry_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS match_collection_pending_retry_idx
  ON match_collection.pending_games (retry_at, game_id);

COMMIT;
