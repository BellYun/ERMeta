BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_chat_metrics (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  nickname VARCHAR(64),
  provider VARCHAR(32) NOT NULL,
  model VARCHAR(64) NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  ttft_ms INT DEFAULT 0,
  total_duration_ms INT DEFAULT 0,
  flagged_moderation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_session_id ON public.ai_chat_metrics(session_id);

-- 닉네임/사용량은 백엔드 service_role로만 접근합니다.
ALTER TABLE public.ai_chat_metrics ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.ai_chat_metrics.ttft_ms IS '첫 토큰까지의 지연시간(ms). 토큰 미발행 시 NULL.';
COMMENT ON COLUMN public.ai_chat_metrics.prompt_tokens IS '시스템/이력/질문을 포함한 UTF-8 바이트 기반 입력 토큰 추정치';
COMMENT ON COLUMN public.ai_chat_metrics.completion_tokens IS '실제 발행된 응답의 UTF-8 바이트 기반 출력 토큰 추정치';

COMMIT;
