// ============================================================
// 3인 조합 → 캐릭별 동료 시너지 추출 템플릿 생성기
// 출력 (캐릭당 2개 파일):
//   backend/manual_sql/trio_pair_synergy/{padded}.sql   ← Supabase SQL Editor 에서 실행
//   backend/manual_sql/trio_pair_synergy/{padded}.json  ← 실행 결과 paste 받음
//
// 사용:
//   1) node backend/scripts/generate-trio-pair-templates.mjs
//   2) {padded}.sql 열어서 Supabase SQL Editor 에 붙여넣고 Run
//      - QUERY 1 결과 → {padded}.json 의 "pairs" 배열에 paste
//      - QUERY 2 결과 → {padded}.json 의 "soloBaseline" 배열에 paste
//   3) 87개 캐릭 모두 채워지면 lift 계산 빌드 스크립트 실행
// ============================================================

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "manual_sql", "trio_pair_synergy");

const CHARACTER_NAMES = {
  1: "재키", 2: "아야", 3: "피오라", 4: "매그너스", 5: "자히르",
  6: "나딘", 7: "현우", 8: "하트", 9: "아이솔", 10: "리 다이린",
  11: "유키", 12: "혜진", 13: "쇼우", 14: "키아라", 15: "시셀라",
  16: "실비아", 17: "아드리아나", 18: "쇼이치", 19: "엠마", 20: "레녹스",
  21: "로지", 22: "루크", 23: "캐시", 24: "아델라", 25: "버니스",
  26: "바바라", 27: "알렉스", 28: "수아", 29: "레온", 30: "일레븐",
  31: "리오", 32: "윌리엄", 33: "니키", 34: "나타폰", 35: "얀",
  36: "이바", 37: "다니엘", 38: "제니", 39: "카밀로", 40: "클로에",
  41: "요한", 42: "비앙카", 43: "셀린", 44: "에키온", 45: "마이",
  46: "에이든", 47: "라우라", 48: "띠아", 49: "펠릭스", 50: "엘레나",
  51: "프리야", 52: "아디나", 53: "마커스", 54: "칼라", 55: "에스텔",
  56: "피올로", 57: "마르티나", 58: "헤이즈", 59: "아이작", 60: "타지아",
  61: "이렘", 62: "테오도르", 63: "이안", 64: "바냐", 65: "데비&마를렌",
  66: "아르다", 67: "아비게일", 68: "알론소", 69: "레니", 70: "츠바메",
  71: "케네스", 72: "카티야", 73: "샬럿", 74: "다르코", 75: "르노어",
  76: "가넷", 77: "유민", 78: "히스이", 79: "유스티나", 80: "이슈트반",
  81: "니아", 82: "슈린", 83: "헨리", 84: "블레어", 85: "미르카",
  86: "펜리르", 87: "코렐라인",
};

const MIN_SAMPLE_GAMES = 40;

const buildSqlFile = (code, name) => `-- ============================================================
-- character ${code} (${name}) - 페어 통계 + 솔로 baseline
-- patch 10.x, diamond+
--
-- 사용법:
--   1) 아래 두 쿼리를 Supabase SQL Editor 에 한 번에 붙여넣고 Run
--   2) 첫 번째 결과 (pairs) → ${String(code).padStart(3, "0")}.json 의 "pairs" 배열에 paste
--   3) 두 번째 결과 (solo) → ${String(code).padStart(3, "0")}.json 의 "soloBaseline" 배열에 paste
-- ============================================================


-- ─── [QUERY 1] 페어 통계 (모든 무기 + 모든 동료) ─────────────
WITH focus_partners AS (
  SELECT ally1_char AS focus_char, ally1_weapon AS focus_weapon,
         ally2_char AS partner_char, ally2_weapon AS partner_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally1_char = ${code} AND ally2_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally1_char, ally1_weapon, third_char, third_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally1_char = ${code} AND third_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally2_char, ally2_weapon, ally1_char, ally1_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally2_char = ${code} AND ally1_char NOT IN (9998, 9999)
  UNION ALL
  SELECT ally2_char, ally2_weapon, third_char, third_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE ally2_char = ${code} AND third_char NOT IN (9998, 9999)
  UNION ALL
  SELECT third_char, third_weapon, ally1_char, ally1_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE third_char = ${code} AND ally1_char NOT IN (9998, 9999)
  UNION ALL
  SELECT third_char, third_weapon, ally2_char, ally2_weapon,
         total_games, total_wins, total_rp, rank_sum
    FROM "v2_CharacterTrioWeaponSearch_p10"
   WHERE third_char = ${code} AND ally2_char NOT IN (9998, 9999)
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
HAVING SUM(total_games) >= ${MIN_SAMPLE_GAMES}
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
WHERE "characterNum" = ${code}
  AND "patchVersion" LIKE '10.%'
  AND "tier" IN ('DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000')
GROUP BY "bestWeapon"
ORDER BY weapon;
`;

await mkdir(OUT_DIR, { recursive: true });

const entries = Object.entries(CHARACTER_NAMES);
for (const [codeStr, name] of entries) {
  const code = Number(codeStr);
  const padded = String(code).padStart(3, "0");

  // .sql 파일
  await writeFile(join(OUT_DIR, `${padded}.sql`), buildSqlFile(code, name));

  // .json 파일 (결과 paste 받는 슬롯)
  const jsonPayload = {
    characterCode: code,
    characterName: name,
    patchScope: "10.x",
    tierScope: "DIAMOND+",
    minSampleGames: MIN_SAMPLE_GAMES,
    extractedAt: null,
    soloBaseline: [],
    pairs: [],
  };
  await writeFile(
    join(OUT_DIR, `${padded}.json`),
    JSON.stringify(jsonPayload, null, 2) + "\n"
  );
}

console.log(`✓ Generated ${entries.length} .sql + ${entries.length} .json files in ${OUT_DIR}`);
