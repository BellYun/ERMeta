CREATE TABLE player_history.season_stats_refresh_states (
  nickname_key TEXT NOT NULL,
  season_id INTEGER NOT NULL CHECK (season_id > 0),
  matching_mode INTEGER NOT NULL CHECK (matching_mode IN (2, 3)),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  failure_code TEXT CHECK (failure_code IN ('rate_limited', 'unavailable')),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  retry_at TIMESTAMPTZ,
  PRIMARY KEY (nickname_key, season_id, matching_mode),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK ((failure_code IS NULL) = (retry_at IS NULL))
);
