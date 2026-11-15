import { Injectable, Logger } from '@nestjs/common';

export const GUARDRAIL_REFUSAL = '부적절하거나 허용되지 않은 명령이 감지되어 분석을 진행할 수 없어. 전술에 관한 질문으로 다시 이야기해 줘.';
const MODERATION_TIMEOUT_MS = 1500;
const BLOCKED_PATTERNS = [
  /\bignore\b.{0,40}\b(?:previous|prior|above|all|system)\b.{0,40}\b(?:instructions?|prompts?|rules?)\b/i,
  /\b(?:disregard|forget|override|bypass)\b.{0,40}\b(?:instructions?|prompts?|rules?|safety|restrictions?)\b/i,
  /\b(?:dan|developer|jailbreak)\s*(?:mode\b|모드)/i,
  /\bdo\s+anything\s+now\b/i,
  /\b(?:reveal|print|show|repeat|output|expose)\b.{0,60}\b(?:system|developer|hidden|initial)\b.{0,30}\b(?:prompts?|instructions?|messages?|rules?)\b/i,
  /(?:시스템|개발자|이전|기존|위의|모든)\s*(?:의\s*)?(?:지침|명령|규칙|프롬프트|메시지).{0,40}(?:무시|잊어|삭제|해제|출력|공개|보여|알려|말해|반복)/,
  /(?:무시|출력|공개|보여).{0,40}(?:시스템|개발자|이전|기존)\s*(?:지침|명령|규칙|프롬프트)/,
  /(?:탈옥|개발자\s*모드|안전\s*(?:장치|필터|정책).{0,20}(?:해제|우회|무시))/,
  /(?:씨[\s.*_-]*발|시[\s.*_-]*발|ㅅ[\s.*_-]*ㅂ|병[\s.*_-]*신|ㅂ[\s.*_-]*ㅅ|개[\s.*_-]*새[\s.*_-]*끼|지[\s.*_-]*랄|좆)/,
  /\b(?:fuck\w*|shit|bullshit|bitch(?:es)?|asshole|motherfucker)\b/i,
];

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  async validateInput(message: string): Promise<{ allowed: boolean; reason?: string; flagged?: boolean }> {
    if (!message.trim() || message.length > 500) {
      return { allowed: false, reason: '분석할 질문을 1자 이상 500자 이내로 보내 줘.' };
    }
    const sanitized = message.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
    // NFKC가 호환 자모(ㅅㅂ 등)를 변환하므로 정규화 전후를 모두 검사합니다.
    const normalized = sanitized.normalize('NFKC');
    if (BLOCKED_PATTERNS.some((pattern) => pattern.test(sanitized) || pattern.test(normalized))) {
      return { allowed: false, reason: GUARDRAIL_REFUSAL, flagged: true };
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (process.env.LLM_PROVIDER !== 'openai' || !apiKey) return { allowed: true };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
    timeout.unref();
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'omni-moderation-latest', input: normalized }),
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Moderation HTTP error');
      }
      const body = await response.json() as { results?: Array<{ flagged?: boolean }> };
      if (!Array.isArray(body.results) || !body.results.length ||
        body.results.some((result) => typeof result?.flagged !== 'boolean')) {
        throw new Error('Invalid moderation response');
      }
      if (body.results.some((result) => result.flagged)) {
        return { allowed: false, reason: GUARDRAIL_REFUSAL, flagged: true };
      }
      return { allowed: true, flagged: false };
    } catch {
      // 외부 검사 장애 시에도 로컬 필터와 제공자 자체 안전장치는 유지합니다. 재시도하지 않습니다.
      this.logger.warn('OpenAI moderation 검사 실패 — 로컬 필터로 폴백');
      return { allowed: true };
    } finally {
      clearTimeout(timeout);
    }
  }
}
