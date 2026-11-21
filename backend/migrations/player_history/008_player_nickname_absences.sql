CREATE TABLE player_history.player_nickname_absences (
  nickname_hash BYTEA PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX player_nickname_absences_expires_idx
  ON player_history.player_nickname_absences (expires_at);
