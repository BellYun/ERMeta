import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ORIGINAL_PERSONA_ERI, PersonaDefinition } from './persona.config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMProvider } from './providers/llm-provider.interface';

@Injectable()
export class AIChatService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly openai: OpenAIProvider,
  ) {}

  async *stream(
    message: string,
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
      yield* provider.stream({
        systemPrompt: persona.systemPrompt,
        messages: [{ role: 'user', content: message }],
        temperature: persona.temperature,
        maxOutputTokens: persona.maxOutputTokens,
        signal: controller.signal,
      });
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
