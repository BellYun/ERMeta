import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LLMProvider, LLMStreamOptions } from './llm-provider.interface';
import { readSseData } from './sse-stream';

interface GeminiChunk {
  error?: unknown;
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

@Injectable()
export class GeminiProvider implements LLMProvider {
  async *stream(options: LLMStreamOptions): AsyncGenerator<string> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('GEMINI_API_KEY가 설정되지 않았습니다.');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: options.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.systemPrompt }] },
          contents: options.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
            candidateCount: 1,
          },
          safetySettings: [
            'HARM_CATEGORY_HARASSMENT',
            'HARM_CATEGORY_HATE_SPEECH',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            'HARM_CATEGORY_DANGEROUS_CONTENT',
          ].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' })),
        }),
      },
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw new BadGatewayException('Gemini 응답을 받을 수 없습니다.');
    }

    let finished = false;
    for await (const data of readSseData(response.body)) {
      const chunk = JSON.parse(data) as GeminiChunk;
      const candidate = chunk.candidates?.[0];
      if (chunk.error || chunk.promptFeedback?.blockReason ||
        (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason))) {
        throw new BadGatewayException('Gemini 응답이 중단되었습니다.');
      }
      for (const part of candidate?.content?.parts ?? []) {
        if (part.text) yield part.text;
      }
      if (candidate?.finishReason) finished = true;
    }
    if (!finished) throw new BadGatewayException('Gemini 스트림이 불완전하게 종료되었습니다.');
  }
}
