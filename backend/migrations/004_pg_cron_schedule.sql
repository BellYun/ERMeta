-- ============================================================
-- ER&GG v2.0 - pg_cron 스케줄 등록
--
-- ⚠️ 사전 준비 (Supabase Dashboard에서):
--   1. Database → Extensions → pg_cron 검색 → Enable
--   2. Database → Extensions → pg_net 검색 → Enable (HTTP 호출용)
--   3. 위 2개 활성화 후 아래 SQL 실행
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. collect Edge Function 5분마다 호출
-- ────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'invoke-collect-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/collect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ────────────────────────────────────────────────────────────
-- 2. v2_PlayerGameRecord 14일 초과 자동 삭제 (매일 새벽 4시)
-- ────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-v2-player-records',
  '0 4 * * *',
  $$DELETE FROM "v2_PlayerGameRecord" WHERE created_at < NOW() - INTERVAL '14 days'$$
);


-- ============================================================
-- 확인 명령어 (등록 후 확인용):
-- SELECT * FROM cron.job;
-- ============================================================

-- ============================================================
-- 삭제 명령어 (필요시):
-- SELECT cron.unschedule('invoke-collect-every-5min');
-- SELECT cron.unschedule('cleanup-v2-player-records');
-- ============================================================
