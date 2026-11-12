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

COMMIT;
