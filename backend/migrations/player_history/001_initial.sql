CREATE SCHEMA IF NOT EXISTS player_history;

CREATE TABLE player_history.player_lookups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nickname TEXT NOT NULL,
  nickname_key TEXT NOT NULL UNIQUE,
  provider_uid TEXT NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL,
  matches_synced_at TIMESTAMPTZ
);

CREATE TABLE player_history.matches (
  game_id BIGINT PRIMARY KEY,
  season_id INTEGER NOT NULL,
  matching_mode INTEGER NOT NULL,
  matching_team_mode INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX matches_started_at_game_id_idx
  ON player_history.matches (started_at DESC, game_id DESC);

CREATE TABLE player_history.player_match_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_lookup_id BIGINT NOT NULL REFERENCES player_history.player_lookups(id),
  game_id BIGINT NOT NULL REFERENCES player_history.matches(game_id),
  character_code INTEGER NOT NULL,
  weapon_code INTEGER NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  kills INTEGER NOT NULL CHECK (kills >= 0),
  assists INTEGER NOT NULL CHECK (assists >= 0),
  CONSTRAINT player_match_records_player_game_key UNIQUE (player_lookup_id, game_id)
);

CREATE INDEX player_match_records_player_idx
  ON player_history.player_match_records (player_lookup_id);
