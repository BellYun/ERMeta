CREATE TABLE player_history.player_season_stats_absences (
  player_lookup_id BIGINT NOT NULL REFERENCES player_history.player_lookups(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL CHECK (season_id > 0),
  matching_mode INTEGER NOT NULL CHECK (matching_mode IN (2, 3)),
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (player_lookup_id, season_id, matching_mode)
);
