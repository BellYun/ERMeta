-- 12.5 maintenance ends 2026-10-01 15:00 KST (06:00 UTC).
-- Collected match records should still prefer the BSER API versionSeason.versionMajor.
INSERT INTO "PatchVersion" (id, version, "startDate", "isActive")
SELECT 'patch-12.5-2026-10-01', '12.5', TIMESTAMP '2026-10-01 06:00:00', true
WHERE NOT EXISTS (SELECT 1 FROM "PatchVersion" WHERE version = '12.5');
