-- Run after the 12.6 maintenance ends on 2026-10-15 15:00 KST (06:00 UTC).
-- Match collection still uses BSER versionSeason.versionMajor.
-- https://playeternalreturn.com/posts/news/3898?hl=ko-KR
BEGIN;

UPDATE "PatchVersion"
SET "endDate" = TIMESTAMP '2026-10-15 06:00:00'
WHERE version = '12.5' AND "endDate" IS NULL;

INSERT INTO "PatchVersion" (id, version, "startDate", "endDate", "isActive")
SELECT 'patch-12.6-2026-10-15', '12.6', TIMESTAMP '2026-10-15 06:00:00', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "PatchVersion" WHERE version = '12.6');

COMMIT;
