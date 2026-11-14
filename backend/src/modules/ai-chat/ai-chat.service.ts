import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ORIGINAL_PERSONA_ERI, PersonaDefinition } from './persona.config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMProvider } from './providers/llm-provider.interface';
import { MemoryService } from './services/memory.service';
import { ContextBuilderService } from './services/context-builder.service';

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly openai: OpenAIProvider,
    private readonly memory: MemoryService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  async *stream(
    message: string,
    sessionId?: string,
    userId?: string,
    signal?: AbortSignal,
    persona: PersonaDefinition = ORIGINAL_PERSONA_ERI,
  ): AsyncGenerator<string> {
    signal?.throwIfAborted();
    let provider: LLMProvider;
    switch (process.env.LLM_PROVIDER ?? 'gemini') {
      case 'gemini': provider = this.gemini; break;
      case 'openai': provider = this.openai; break;
      default: throw new ServiceUnavailableException('지원하지 않는 LLM_PROVIDER입니다.');
    }

    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 30_000);
    timeout.unref();
    try {
      const [history, context] = await Promise.all([
        sessionId ? this.memory.getHistory(sessionId) : [],
        this.contextBuilder.buildContext(userId),
      ]);
      controller.signal.throwIfAborted();
      let answer = '';
      for await (const token of provider.stream({
        systemPrompt: [persona.systemPrompt, context].filter(Boolean).join('\n\n'),
        messages: [...history, { role: 'user', content: message }],
        temperature: persona.temperature,
        maxOutputTokens: persona.maxOutputTokens,
        signal: controller.signal,
      })) {
        controller.signal.throwIfAborted();
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
      if (signal?.aborted) throw error;
      if (controller.signal.aborted) throw new GatewayTimeoutException('AI 응답 시간이 초과되었습니다.');
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('AI 응답을 받을 수 없습니다.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }
}
