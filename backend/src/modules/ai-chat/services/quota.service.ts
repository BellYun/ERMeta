import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';

export const DAILY_TURN_LIMIT = 30;

@Injectable()
export class QuotaService {
  constructor(private readonly redis: RedisService) {}

  /** UTC 자정에 초기화합니다. 가드레일 차단/생성 실패를 포함한 요청 시도를 차감합니다. */
  async consume(identifier: string): Promise<void> {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const resetAt = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const retryAfter = Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000));
    const allowed = await this.redis.consumeQuota(`ai_chat:quota:${identifier}:${date}`, DAILY_TURN_LIMIT, retryAfter);
    if (allowed === null) {
      // 유료 LLM 경로는 쿼터를 확인할 수 없을 때 허용하지 않습니다.
      throw new ServiceUnavailableException('지금은 대화 한도를 확인할 수 없어. 잠시 후 다시 찾아와 줘.');
    }
    if (!allowed) {
      throw new HttpException({
        code: 'AI_CHAT_DAILY_QUOTA_EXCEEDED',
        message: `오늘은 ${DAILY_TURN_LIMIT}턴을 모두 사용했어. UTC 자정 이후에 다시 전술을 분석해 보자.`,
        retryAfter,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
