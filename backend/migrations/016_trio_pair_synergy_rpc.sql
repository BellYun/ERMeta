-- ============================================================
-- 캐릭별 페어 시너지 + 솔로 baseline RPC
--
-- 목적:
--   - 87 캐릭 × 무기 × partner 페어 통계를 PostgREST .rpc() 로 한 호출당 1 캐릭씩 추출
--   - frontend / 빌드 스크립트가 anon key 로 호출 가능하도록 GRANT
--
-- 등록 후 호출 예:
--   POST /rest/v1/rpc/get_trio_pair_synergy   body: {"p_focus_char": 5}
--   POST /rest/v1/rpc/get_solo_baseline       body: {"p_char": 5}
-- ============================================================

BEGIN;

-- ─── 1. 페어 통계 (focus_weapon × partner_char × partner_weapon) ───
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
      FROM "v2_CharacterTrioWeaponSearch_p10"
     WHERE ally1_char = p_focus_char AND ally2_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally1_char, ally1_weapon, third_char, third_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_p10"
     WHERE ally1_char = p_focus_char AND third_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally2_char, ally2_weapon, ally1_char, ally1_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_p10"
     WHERE ally2_char = p_focus_char AND ally1_char NOT IN (9998, 9999)
    UNION ALL
    SELECT ally2_char, ally2_weapon, third_char, third_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_p10"
     WHERE ally2_char = p_focus_char AND third_char NOT IN (9998, 9999)
    UNION ALL
    SELECT third_char, third_weapon, ally1_char, ally1_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_p10"
     WHERE third_char = p_focus_char AND ally1_char NOT IN (9998, 9999)
    UNION ALL
    SELECT third_char, third_weapon, ally2_char, ally2_weapon,
           total_games, total_wins, total_rp, rank_sum
      FROM "v2_CharacterTrioWeaponSearch_p10"
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

-- ─── 2. 솔로 baseline (lift 분모) ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_solo_baseline(p_char INT)
RETURNS TABLE (
  weapon   INT,
  games    BIGINT,
  wins     BIGINT,
  win_rate NUMERIC,
  avg_rp   NUMERIC,
  avg_rank NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    "bestWeapon" AS weapon,
    SUM("totalGames")::BIGINT AS games,
    SUM("totalWins")::BIGINT  AS wins,
    ROUND(SUM("totalWins")::numeric / NULLIF(SUM("totalGames"), 0) * 100, 2) AS win_rate,
    ROUND(SUM("totalRP")            / NULLIF(SUM("totalGames"), 0), 2)        AS avg_rp,
    ROUND(SUM("averageRank" * "totalGames") / NULLIF(SUM("totalGames"), 0), 2) AS avg_rank
  FROM "v2_CharacterStats"
  WHERE "characterNum" = p_char
    AND "patchVersion" LIKE '10.%'
    AND "tier" IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
  GROUP BY "bestWeapon"
  ORDER BY weapon;
$$;

-- ─── 3. PostgREST 가 호출할 수 있게 GRANT ─────────────────────────
GRANT EXECUTE ON FUNCTION get_trio_pair_synergy(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_solo_baseline(INT)     TO anon, authenticated;

COMMIT;

-- 검증 쿼리 (선택):
-- SELECT * FROM get_trio_pair_synergy(5) LIMIT 5;
-- SELECT * FROM get_solo_baseline(5);
