-- 12.5 통계 수집 활성화
-- 공식 점검: 2026-10-01 11:00~15:00 KST
-- https://playeternalreturn.com/posts/news/3867
-- PatchVersion은 기존 행과 동일하게 UTC 기준의 timestamp without time zone 값을 사용한다.

BEGIN;

UPDATE "PatchVersion"
SET "endDate" = '2026-10-01T06:00:00'
WHERE "version" = '12.4'
  AND "endDate" IS NULL;

INSERT INTO "PatchVersion" (
  "id",
  "version",
  "startDate",
  "endDate",
  "isActive"
)
VALUES (
  'patch-12-5-20261001',
  '12.5',
  '2026-10-01T06:00:00',
  NULL,
  TRUE
)
ON CONFLICT ("version") DO NOTHING;

COMMIT;

SELECT
  "version",
  "startDate",
  "endDate",
  "isActive"
FROM "PatchVersion"
WHERE "version" IN ('12.4', '12.5')
ORDER BY "startDate" DESC;
