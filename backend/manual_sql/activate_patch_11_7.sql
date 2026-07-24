-- 11.7 통계 수집 활성화
-- 공식 점검: 2026-07-23 11:00~15:00 KST
-- PatchVersion은 기존 행과 동일하게 UTC 기준의 timestamp without time zone 값을 사용한다.

BEGIN;

UPDATE "PatchVersion"
SET "endDate" = '2026-07-23T02:00:00'
WHERE "version" = '11.6'
  AND "endDate" IS NULL;

INSERT INTO "PatchVersion" (
  "id",
  "version",
  "startDate",
  "endDate",
  "isActive"
)
VALUES (
  'patch-11-7-20260723',
  '11.7',
  '2026-07-23T06:00:00',
  NULL,
  TRUE
)
ON CONFLICT ("version") DO UPDATE
SET
  "startDate" = EXCLUDED."startDate",
  "endDate" = EXCLUDED."endDate",
  "isActive" = EXCLUDED."isActive";

COMMIT;

SELECT
  "version",
  "startDate",
  "endDate",
  "isActive"
FROM "PatchVersion"
WHERE "version" IN ('11.6', '11.7')
ORDER BY "startDate" DESC;
