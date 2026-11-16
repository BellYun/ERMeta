import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';
import { LLMStreamOptions } from '../providers/llm-provider.interface';

export type ChatMessage = LLMStreamOptions['messages'][number];
const HISTORY_LIMIT = 10;
const SESSION_TTL_SECONDS = 7200;

@Injectable()
export class MemoryService {
  constructor(private readonly redis: RedisService) {}

  private key(sessionId: string): string {
    return `ai_chat:session:${sessionId}:messages`;
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const entries = await this.redis.getList(this.key(sessionId), -HISTORY_LIMIT, -1);
    return entries.flatMap((entry) => {
      try {
        const message: unknown = JSON.parse(entry);
        if (message && typeof message === 'object' && 'role' in message && 'content' in message &&
          (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string') {
          return [{ role: message.role, content: message.content }];
        }
      } catch { /* 손상된 캐시 항목은 프롬프트에서 제외합니다. */ }
      return [];
    });
  }

  async appendMessage(sessionId: string, role: ChatMessage['role'], content: string): Promise<void> {
    await this.appendMessages(sessionId, [{ role, content }]);
  }

  /** 완성된 질문·답변 쌍은 원자적으로 저장하여 동시 요청 간 섞임을 방지합니다. */
  async appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    await this.redis.appendToList(
      this.key(sessionId), messages.map((message) => JSON.stringify(message)),
      HISTORY_LIMIT, SESSION_TTL_SECONDS,
    );
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}
