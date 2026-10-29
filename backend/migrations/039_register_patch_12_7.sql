-- Run after the 12.7 maintenance ends on 2026-10-29 15:00 KST (06:00 UTC).
-- Match collection still uses BSER versionSeason.versionMajor.
-- https://playeternalreturn.com/posts/news/3924?hl=ko-KR
BEGIN;

UPDATE "PatchVersion"
SET "endDate" = TIMESTAMP '2026-10-29 06:00:00'
WHERE version = '12.6' AND "endDate" IS NULL;

INSERT INTO "PatchVersion" (id, version, "startDate", "endDate", "isActive")
SELECT 'patch-12.7-2026-10-29', '12.7', TIMESTAMP '2026-10-29 06:00:00', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM "PatchVersion" WHERE version = '12.7');

COMMIT;
