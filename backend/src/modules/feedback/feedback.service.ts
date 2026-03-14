import {
  Injectable, BadRequestException, HttpException, HttpStatus,
  OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

@Injectable()
export class FeedbackService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(ip);
      }
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  async submit(
    body: { category?: string; message?: string; contact?: string },
    ip: string, userAgent: string,
  ) {
    if (!checkRateLimit(ip)) {
      throw new HttpException(
        { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { category, message, contact } = body;
    if (!message || message.trim() === '') {
      throw new BadRequestException({ error: '메시지를 입력해주세요.' });
    }

    const webhookUrl = this.configService.get<string>('GOOGLE_SHEETS_WEBHOOK_URL');
    if (webhookUrl) {
      const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(' ', 'T') + '+09:00';
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: category ?? '', message: message.trim(),
            contact: contact ?? '', timestamp, userAgent,
          }),
        });
        if (!res.ok) console.error(`[feedback] Webhook responded with status ${res.status}`);
      } catch (err) {
        console.error('[feedback] Failed to send to webhook:', err);
      }
    }

    return { success: true };
  }
}
