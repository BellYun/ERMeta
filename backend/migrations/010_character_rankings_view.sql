-- ============================================================
-- Step 3-1: character_rankings View
-- JS-side pickRate/winRate/rank 계산을 DB 윈도우 함수로 이관
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

CREATE OR REPLACE VIEW character_rankings AS
SELECT
  "characterNum",
  "bestWeapon",
  "tier",
  "patchVersion",
  "totalGames",
  "totalWins",
  "totalRP",
  "totalTop3",
  "averageRank",

  -- pickRate: 해당 패치+티어 내에서 이 캐릭터의 게임 비율 (%)
  ROUND(
    ("totalGames"::NUMERIC / NULLIF(
      SUM("totalGames") OVER (PARTITION BY "patchVersion", "tier"), 0
    )) * 100, 4
  ) AS "pickRate",

  -- winRate (%)
  ROUND(
    ("totalWins"::NUMERIC / NULLIF("totalGames", 0)) * 100, 4
  ) AS "winRate",

  -- averageRP per game
  ROUND(
    "totalRP"::NUMERIC / NULLIF("totalGames", 0), 2
  ) AS "averageRPPerGame",

  -- top3Rate (%)
  ROUND(
    ("totalTop3"::NUMERIC / NULLIF("totalGames", 0)) * 100, 4
  ) AS "top3Rate",

  -- rank: averageRP 내림차순 (패치+티어 내)
  RANK() OVER (
    PARTITION BY "patchVersion", "tier"
    ORDER BY "totalRP"::NUMERIC / NULLIF("totalGames", 0) DESC
  )::INTEGER AS "rank"

FROM "CharacterStats"
WHERE "totalGames" > 0;

COMMENT ON VIEW character_rankings IS
'캐릭터 랭킹 View — pickRate, winRate, rank를 DB 윈도우 함수로 계산. 3분마다 갱신되는 데이터에 대해 매 조회시 재계산.';
