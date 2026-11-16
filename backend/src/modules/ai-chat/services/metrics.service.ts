import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../common/database/supabase.service';

export interface ChatMetrics {
  sessionId?: string;
  nickname?: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  ttftMs: number | null;
  totalDurationMs: number;
  flaggedModeration: boolean;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** 추가 토크나이저/API 호출 없이 UTF-8 바이트 수로 추정합니다. 과금 확정값은 아닙니다. */
  estimateTokens(text: string): number {
    return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
  }

  record(metrics: ChatMetrics): void {
    void this.persist(metrics).catch(() => this.logger.warn('AI 채팅 메트릭 저장 실패'));
  }

  private async persist(metrics: ChatMetrics): Promise<void> {
    const client = this.supabase.getClient();
    const signal = AbortSignal.timeout(2000);
    if (metrics.sessionId) {
      // 대화 본문은 Redis에만 저장합니다. FK용 세션은 조회 없이 최초 1회 생성합니다.
      const { error } = await client.from('ai_chat_sessions').upsert({
        id: metrics.sessionId,
      }, { onConflict: 'id', ignoreDuplicates: true }).abortSignal(signal);
      if (error) throw error;
    }
    const { error } = await client.from('ai_chat_metrics').insert({
      session_id: metrics.sessionId ?? null,
      nickname: metrics.nickname || null,
      provider: metrics.provider,
      model: metrics.model,
      prompt_tokens: metrics.promptTokens,
      completion_tokens: metrics.completionTokens,
      ttft_ms: metrics.ttftMs,
      total_duration_ms: metrics.totalDurationMs,
      flagged_moderation: metrics.flaggedModeration,
    }).abortSignal(signal);
    if (error) throw error;
  }
}
