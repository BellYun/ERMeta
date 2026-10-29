-- 12.7 통계 수집 활성화. 공식 점검 종료(2026-10-29 15:00 KST) 이후 실행.
-- https://playeternalreturn.com/posts/news/3924?hl=ko-KR
-- PatchVersion 날짜는 기존 행과 같은 UTC timestamp without time zone.
-- 실행 후 v2_CharacterStats에 12.7 행이 실제로 쌓이는지 확인한다.
BEGIN;

UPDATE "PatchVersion"
SET "endDate" = TIMESTAMP '2026-10-29 06:00:00'
WHERE version = '12.6' AND "endDate" IS NULL;

INSERT INTO "PatchVersion" (id, version, "startDate", "endDate", "isActive")
SELECT 'patch-12.7-2026-10-29', '12.7', TIMESTAMP '2026-10-29 06:00:00', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "PatchVersion" WHERE version = '12.7');

COMMIT;

SELECT version, "startDate", "endDate", "isActive"
FROM "PatchVersion"
WHERE version IN ('12.6', '12.7')
ORDER BY "startDate" DESC;

SELECT tier, COUNT(*) AS rows, SUM("totalGames") AS character_games
FROM "v2_CharacterStats"
WHERE "patchVersion" = '12.7'
GROUP BY tier
ORDER BY tier;
