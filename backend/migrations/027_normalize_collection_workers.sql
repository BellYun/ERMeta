-- ============================================================
-- v2_CollectionStatus backfill worker 제거
--
-- 목적:
--   - 현재 수집 로직을 forward-only로 운용하므로 backfill 계열 worker 상태를 제거한다.
--
-- 적용:
--   - forward row는 건드리지 않는다.
--   - backfill / gap_backfill row만 제거한다.
-- ============================================================

BEGIN;

DELETE FROM "v2_CollectionStatus"
WHERE worker_type IN ('backfill', 'gap_backfill');

COMMIT;
