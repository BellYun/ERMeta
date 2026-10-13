CREATE TABLE player_history.player_season_stats (
  player_lookup_id BIGINT NOT NULL REFERENCES player_history.player_lookups(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL CHECK (season_id > 0),
  matching_mode INTEGER NOT NULL CHECK (matching_mode IN (2, 3)),
  matching_team_mode INTEGER NOT NULL CHECK (matching_team_mode > 0),
  total_games INTEGER NOT NULL CHECK (total_games >= 0),
  wins INTEGER NOT NULL CHECK (wins >= 0 AND wins <= total_games),
  average_rank DOUBLE PRECISION NOT NULL CHECK (average_rank >= 0),
  stats_payload JSONB NOT NULL CHECK (jsonb_typeof(stats_payload) = 'object'),
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (player_lookup_id, season_id, matching_mode, matching_team_mode)
);
