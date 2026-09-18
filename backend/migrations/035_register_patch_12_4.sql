-- 12.4 점검 종료: 2026-09-17 15:00 KST (PatchVersion의 UTC 기준 시각 06:00).
-- 경기의 실제 패치 버전은 BSER API versionSeason.versionMajor를 우선 사용한다.
INSERT INTO "PatchVersion" (id, version, "startDate", "isActive")
SELECT 'patch-12.4-2026-09-17', '12.4', TIMESTAMP '2026-09-17 06:00:00', true
WHERE NOT EXISTS (SELECT 1 FROM "PatchVersion" WHERE version = '12.4');
