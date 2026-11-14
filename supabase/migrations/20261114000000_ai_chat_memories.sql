BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64),
  persona_id VARCHAR(32) NOT NULL DEFAULT 'eri-tactical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_user_memories (
  user_id VARCHAR(64) PRIMARY KEY,
  favorite_characters JSONB DEFAULT '[]'::jsonb,
  playstyle_summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 개인 대화/프로필은 백엔드의 service_role로만 접근합니다.
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_memories ENABLE ROW LEVEL SECURITY;

COMMIT;
