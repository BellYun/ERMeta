-- ============================================================
-- character 15 (시셀라) - 페어 통계 + 솔로 baseline
-- patch 10.x, diamond+
--
-- 사용법:
--   1) 아래 두 쿼리를 Supabase SQL Editor 에 한 번에 붙여넣고 Run
--   2) 첫 번째 결과 (pairs) → 015.json 의 "pairs" 배열에 paste
--   3) 두 번째 결과 (solo) → 015.json 의 "soloBaseline" 배열에 paste
-- ============================================================


-- ─── [QUERY 1] 페어 통계 (모든 무기 + 모든 동료) ─────────────
WITH focus_partners AS (
  SELECT ally1_char AS focus_char, ally1_weapon AS focus_weapon,
         ally2_char AS partner_char, ally2_weapon AS partner_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally1_char = 15 AND ally2_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally1_char, ally1_weapon, third_char, third_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally1_char = 15 AND third_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally2_char, ally2_weapon, ally1_char, ally1_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally2_char = 15 AND ally1_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally2_char, ally2_weapon, third_char, third_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally2_char = 15 AND third_char NOT IN (9998, 9999)
  UNION ALL
  SELECT third_char, third_weapon, ally1_char, ally1_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE third_char = 15 AND ally1_char NOT IN (9998, 9999)
  UNION ALL
  SELECT third_char, third_weapon, ally2_char, ally2_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE third_char = 15 AND ally2_char NOT IN (9998, 9999)
)
SELECT
  focus_weapon,
  partner_char,
  partner_weapon,
  SUM(total_games) AS games,
  SUM(total_wins)  AS wins,
  ROUND(SUM(total_wins)::numeric / NULLIF(SUM(total_games), 0) * 100, 2) AS win_rate,
  ROUND(SUM(total_rp)            / NULLIF(SUM(total_games), 0) / 3, 2)   AS avg_rp,
  ROUND(SUM(rank_sum)::numeric   / NULLIF(SUM(total_games), 0), 2)       AS avg_rank
FROM focus_partners
GROUP BY focus_weapon, partner_char, partner_weapon
HAVING SUM(total_games) >= 40
ORDER BY focus_weapon, games DESC;


-- ─── [QUERY 2] 솔로 baseline (무기별, lift 분모) ────────────
SELECT
  "bestWeapon" AS weapon,
  SUM("totalGames") AS games,
  SUM("totalWins")  AS wins,
  ROUND(SUM("totalWins")::numeric / NULLIF(SUM("totalGames"), 0) * 100, 2) AS win_rate,
  ROUND(SUM("totalRP")            / NULLIF(SUM("totalGames"), 0), 2)        AS avg_rp,
  ROUND(SUM("averageRank" * "totalGames") / NULLIF(SUM("totalGames"), 0), 2) AS avg_rank
FROM "v2_CharacterStats"
WHERE "characterNum" = 15
  AND "patchVersion" LIKE '10.%'
  AND "tier" IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
GROUP BY "bestWeapon"
ORDER BY weapon;
