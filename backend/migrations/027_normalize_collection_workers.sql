-- ============================================================
-- v2_CollectionStatus backfill worker 제거
--
-- 목적:
--   - 현재 수집 로직을 forward-only로 운용하므로 backfill 계열 worker 상태를 제거한다.
--
-- 적용:
--   - forward2 row가 있으면 기존 forward row를 제거하고 forward2를 forward로 승격한다.
--   - forward2 row가 없으면 기존 forward row는 건드리지 않는다.
--   - backfill / gap_backfill row는 제거한다.
-- ============================================================

BEGIN;

DELETE FROM "v2_CollectionStatus"
WHERE worker_type IN ('backfill', 'gap_backfill');

DELETE FROM "v2_CollectionStatus"
WHERE worker_type = 'forward'
  AND EXISTS (
    SELECT 1
    FROM "v2_CollectionStatus"
    WHERE worker_type = 'forward2'
  );

UPDATE "v2_CollectionStatus"
SET worker_type = 'forward'
WHERE worker_type = 'forward2';

COMMIT;
