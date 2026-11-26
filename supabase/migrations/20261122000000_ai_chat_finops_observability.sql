BEGIN;

ALTER TABLE public.ai_chat_metrics
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'completed',
  ADD COLUMN defended_tokens INT NOT NULL DEFAULT 0;

CREATE INDEX idx_ai_chat_metrics_status_created_at
  ON public.ai_chat_metrics (status, created_at);

CREATE VIEW public.v_ai_chat_finops_daily
WITH (security_invoker = true) AS
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) AS total_queries,
  COUNT(*) FILTER (WHERE status = 'client_aborted') AS aborted_queries,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'client_aborted') / COUNT(*), 2) AS bounce_rate_pct,
  SUM(COALESCE(prompt_tokens, 0)::bigint + COALESCE(completion_tokens, 0)) AS actual_tokens_used,
  COALESCE(SUM(defended_tokens) FILTER (WHERE status = 'client_aborted'), 0) AS defended_orphan_tokens,
  -- https://developers.googleblog.com/en/gemini-2-family-expands/
  -- https://developers.openai.com/api/docs/models/gpt-4o-mini
  COALESCE(SUM(defended_tokens * CASE model
    WHEN 'gemini-2.0-flash' THEN 0.40
    WHEN 'gpt-4o-mini' THEN 0.60
    ELSE 0
  END) FILTER (WHERE status = 'client_aborted'), 0) / 1000000 AS saved_cost_usd
FROM public.ai_chat_metrics
GROUP BY 1;

REVOKE ALL ON public.v_ai_chat_finops_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_ai_chat_finops_daily TO service_role;

COMMENT ON VIEW public.v_ai_chat_finops_daily IS 'UTC 일자별 AI 코치 요청 및 토큰 절감 추정치';
COMMENT ON COLUMN public.v_ai_chat_finops_daily.actual_tokens_used IS 'UTF-8 바이트 기반 입력 및 생성 토큰 추정치 합계';
COMMENT ON COLUMN public.v_ai_chat_finops_daily.saved_cost_usd IS '방어 토큰에 모델별 유료 API 출력 단가(USD/100만 토큰)를 적용한 추정치. 미등록 모델의 비용은 0으로 집계.';

COMMIT;
