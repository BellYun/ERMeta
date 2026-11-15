import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LLMProvider, LLMStreamOptions } from './llm-provider.interface';
import { readSseData } from './sse-stream';

interface OpenAIChunk {
  error?: unknown;
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
}

@Injectable()
export class OpenAIProvider implements LLMProvider {
  async *stream(options: LLMStreamOptions): AsyncGenerator<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('OPENAI_API_KEY가 설정되지 않았습니다.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: options.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [{ role: 'system', content: options.systemPrompt }, ...options.messages],
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
      }),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw new BadGatewayException('OpenAI 응답을 받을 수 없습니다.');
    }

    for await (const data of readSseData(response.body)) {
      if (data === '[DONE]') return;
      const chunk = JSON.parse(data) as OpenAIChunk;
      const choice = chunk.choices?.[0];
      if (chunk.error || (choice?.finish_reason && !['stop', 'length'].includes(choice.finish_reason))) {
        throw new BadGatewayException('OpenAI 응답이 중단되었습니다.');
      }
      if (choice?.delta?.content) yield choice.delta.content;
    }
    throw new BadGatewayException('OpenAI 스트림이 불완전하게 종료되었습니다.');
  }
}
