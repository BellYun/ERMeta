-- ============================================================
-- pair synergy RPC 를 신규 all 사전집계 테이블로 전환
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_trio_pair_synergy(p_focus_char INT)
RETURNS TABLE (
  focus_weapon   INT,
  partner_char   INT,
  partner_weapon INT,
  games          BIGINT,
  wins           BIGINT,
  win_rate       NUMERIC,
  avg_rp         NUMERIC,
  avg_rank       NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH focus_partners AS (
    SELECT ally1_char AS focus_char, ally1_weapon AS focus_weapon,
           ally2_char AS partner_char, ally2_weapon AS partner_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE ally1_char = p_focus_char AND ally2_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally1_char, ally1_weapon, third_char, third_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE ally1_char = p_focus_char AND third_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally2_char, ally2_weapon, ally1_char, ally1_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE ally2_char = p_focus_char AND ally1_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally2_char, ally2_weapon, third_char, third_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE ally2_char = p_focus_char AND third_char NOT IN (9998, 9999)
    UNION ALL
    SELECT third_char, third_weapon, ally1_char, ally1_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE third_char = p_focus_char AND ally1_char NOT IN (9998, 9999)
    UNION ALL
    SELECT third_char, third_weapon, ally2_char, ally2_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_all"
     WHERE third_char = p_focus_char AND ally2_char NOT IN (9998, 9999)
  )
  SELECT
    fp.focus_weapon,
    fp.partner_char,
    fp.partner_weapon,
    SUM(fp.total_games)::BIGINT AS games,
    SUM(fp.total_wins)::BIGINT  AS wins,
    ROUND(SUM(fp.total_wins)::numeric / NULLIF(SUM(fp.total_games), 0) * 100, 2) AS win_rate,
    ROUND(SUM(fp.total_rp)            / NULLIF(SUM(fp.total_games), 0) / 3, 2)   AS avg_rp,
    ROUND(SUM(fp.rank_sum)::numeric   / NULLIF(SUM(fp.total_games), 0), 2)       AS avg_rank
  FROM focus_partners fp
  GROUP BY fp.focus_weapon, fp.partner_char, fp.partner_weapon
  HAVING SUM(fp.total_games) >= 40
  ORDER BY fp.focus_weapon, games DESC;
$$;

GRANT EXECUTE ON FUNCTION get_trio_pair_synergy(INT) TO anon, authenticated;

COMMIT;

