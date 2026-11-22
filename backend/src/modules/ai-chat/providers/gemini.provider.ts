import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LLMProvider, LLMStreamOptions } from './llm-provider.interface';
import { readSseData } from './sse-stream';
import { LLMModerationException } from './llm-moderation.exception';

export const GEMINI_MODEL = 'gemini-2.0-flash';

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
    if (process.env.MOCK_AI === 'true') {
      const mockText = `안녕하세요, 실험체님! 이리 전술 코치입니다. 현재 시즌 13 루미아 섬 메타에서는 초반 빠른 합류 템포가 핵심입니다. 특히 2일차 밤 전장 오브젝트 싸움에서 팀원의 주요 궁극기 쿨다운을 먼저 체크하고 진입하는 운영이 높은 승률을 기록하고 있습니다. 추가로 궁금하신 3인 조합이나 특정 실험체 상대법이 있으신가요?`;
      for (const word of mockText.split(' ')) {
        options.signal?.throwIfAborted();
        await new Promise((resolve) => setTimeout(resolve, 70));
        yield word + ' ';
      }
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('GEMINI_API_KEY가 설정되지 않았습니다.');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
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
      if (chunk.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
        throw new LLMModerationException();
      }
      if (chunk.error ||
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
