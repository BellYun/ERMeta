-- Read-only recovery feasibility sample, not an estimate of all missing teams.
-- Uses the patch/game-number ledger index and at most 100 RP rows per game.
-- RP source rows preserve MMR and team identity, but not weapon/core/rank.
-- Full trio restoration still needs the original match payload.
WITH sample_games AS MATERIALIZED (
  SELECT p.patch, g.game_number
  FROM (VALUES ('12.5'), ('12.6'), ('12.7')) AS p(patch)
  CROSS JOIN LATERAL (
    SELECT game_number FROM public."v2_CollectedGame"
    WHERE patch_version = p.patch
    ORDER BY game_number DESC LIMIT 100
  ) g
), team_sources AS (
  SELECT g.patch, g.game_number, r.team_number,
    COUNT(*) AS members, COUNT(DISTINCT r.character_num) AS characters,
    MIN(r.mmr_before) AS low_mmr, MAX(r.mmr_before) AS high_mmr
  FROM sample_games g
  CROSS JOIN LATERAL (
    SELECT team_number, character_num, mmr_before
    FROM public."v2_CollectedGameRP"
    WHERE game_number = g.game_number LIMIT 100
  ) r
  GROUP BY g.patch, g.game_number, r.team_number
), classified AS (
  SELECT *, members = 3 AND characters = 3 AND low_mmr >= 5000 AS eligible,
    (CASE WHEN low_mmr < 6400 THEN 1 WHEN low_mmr < 7600 THEN 2 ELSE 3 END)
      <> (CASE WHEN high_mmr < 6400 THEN 1 WHEN high_mmr < 7600 THEN 2 ELSE 3 END) AS mixed
  FROM team_sources
)
SELECT patch,
  (SELECT COUNT(*) FROM sample_games s WHERE s.patch = c.patch) AS sampled_games,
  COUNT(DISTINCT game_number) AS games_with_rp,
  COUNT(*) FILTER (WHERE eligible) AS eligible_teams,
  COUNT(*) FILTER (WHERE eligible AND mixed) AS omitted_mixed_teams,
  MIN(game_number) FILTER (WHERE eligible AND mixed) AS example_game
FROM classified c GROUP BY patch ORDER BY patch;
