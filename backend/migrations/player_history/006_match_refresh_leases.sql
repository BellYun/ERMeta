CREATE TABLE player_history.match_refresh_leases (
  nickname_key TEXT PRIMARY KEY,
  lease_token UUID NOT NULL,
  lease_until TIMESTAMPTZ NOT NULL
);
