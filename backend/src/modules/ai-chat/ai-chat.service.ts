import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ORIGINAL_PERSONA_ERI, PersonaDefinition } from './persona.config';
import { GEMINI_MODEL, GeminiProvider } from './providers/gemini.provider';
import { OPENAI_MODEL, OpenAIProvider } from './providers/openai.provider';
import { LLMProvider } from './providers/llm-provider.interface';
import { MemoryService } from './services/memory.service';
import { ContextBuilderService } from './services/context-builder.service';
import { GuardrailService } from './guards/guardrail.service';
import { MetricsService } from './services/metrics.service';
import { QuotaService } from './services/quota.service';
import { LLMModerationException } from './providers/llm-moderation.exception';

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly openai: OpenAIProvider,
    private readonly memory: MemoryService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly guardrail: GuardrailService,
    private readonly metrics: MetricsService,
    private readonly quota: QuotaService,
  ) {}

  async *stream(
    message: string,
    sessionId?: string,
    userId?: string,
    nickname?: string,
    signal?: AbortSignal,
    persona: PersonaDefinition = ORIGINAL_PERSONA_ERI,
    clientIp?: string,
  ): AsyncGenerator<string> {
    signal?.throwIfAborted();
    const startedAt = performance.now();
    const providerName = process.env.LLM_PROVIDER ?? 'gemini';
    let provider: LLMProvider;
    switch (providerName) {
      case 'gemini': provider = this.gemini; break;
      case 'openai': provider = this.openai; break;
      default: throw new ServiceUnavailableException('지원하지 않는 LLM_PROVIDER입니다.');
    }

    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 30_000);
    timeout.unref();
    let recordMetrics = false;
    let flaggedModeration = false;
    let ttftMs: number | null = null;
    let promptTokens = 0;
    let answer = '';
    try {
      // 세션/닉네임을 바꿔도 우회할 수 없도록 서버가 확인한 IP를 사용합니다.
      await this.quota.consume(`ip:${clientIp ?? 'unknown'}`);
      controller.signal.throwIfAborted();
      recordMetrics = true;
      const validation = await this.guardrail.validateInput(message);
      flaggedModeration = validation.flagged ?? false;
      controller.signal.throwIfAborted();
      if (!validation.allowed) throw new BadRequestException(validation.reason);

      const [history, context] = await Promise.all([
        sessionId ? this.memory.getHistory(sessionId) : [],
        this.contextBuilder.buildContext(userId, nickname),
      ]);
      controller.signal.throwIfAborted();
      const systemPrompt = [persona.systemPrompt, context].filter(Boolean).join('\n\n');
      const messages = [...history, { role: 'user' as const, content: message }];
      promptTokens = this.metrics.estimateTokens([systemPrompt, ...messages.map((entry) => entry.content)].join('\n'));
      for await (const token of provider.stream({
        systemPrompt,
        messages,
        temperature: persona.temperature,
        maxOutputTokens: persona.maxOutputTokens,
        signal: controller.signal,
      })) {
        controller.signal.throwIfAborted();
        if (!token) continue;
        ttftMs ??= Math.round(performance.now() - startedAt);
        answer += token;
        yield token;
      }
      controller.signal.throwIfAborted();
      if (sessionId && answer) {
        void this.memory.appendMessages(sessionId, [
          { role: 'user', content: message },
          { role: 'assistant', content: answer },
        ]).catch(() => this.logger.warn('AI 대화 기록 저장 실패'));
      }
    } catch (error) {
      if (error instanceof LLMModerationException) flaggedModeration = true;
      if (signal?.aborted) throw error;
      if (controller.signal.aborted) throw new GatewayTimeoutException('AI 응답 시간이 초과되었습니다.');
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('AI 응답을 받을 수 없습니다.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      controller.abort();
      if (recordMetrics) {
        this.metrics.record({
          sessionId, nickname, provider: providerName,
          model: providerName === 'openai' ? OPENAI_MODEL : GEMINI_MODEL,
          promptTokens, completionTokens: this.metrics.estimateTokens(answer), ttftMs,
          totalDurationMs: Math.round(performance.now() - startedAt), flaggedModeration,
        });
      }
    }
  }
}
