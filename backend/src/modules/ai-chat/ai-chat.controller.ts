import { Body, Controller, Post, Res, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { once } from 'node:events';
import { Response } from 'express';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { AIChatService } from './ai-chat.service';

export class AIChatStreamDto {
  // Preserve the input type even when the global pipe enables implicit conversion.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const message = obj.message;
    return typeof message === 'string' ? message.trim() : message;
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}

@Controller('api/ai-chat')
export class AIChatController {
  constructor(private readonly service: AIChatService) {}

  @Post('stream')
  @RateLimit(5, 60)
  async stream(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: AIChatStreamDto,
    @Res() response: Response,
  ): Promise<void> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    response.once('close', abort);
    const iterator = this.service.stream(body.message, controller.signal);

    const write = async (event: string, data: unknown): Promise<void> => {
      controller.signal.throwIfAborted();
      if (!response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) {
        await once(response, 'drain', { signal: controller.signal });
      }
    };

    try {
      // Keep validation, configuration, and initial upstream failures as HTTP errors.
      let result = await iterator.next();
      controller.signal.throwIfAborted();
      response.status(200);
      response.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      response.flushHeaders();
      while (!result.done) {
        await write('token', { text: result.value });
        result = await iterator.next();
      }
      await write('done', {});
    } catch (error) {
      if (!controller.signal.aborted) {
        if (!response.headersSent) throw error;
        await write('error', { message: 'AI 응답이 중단되었습니다. 잠시 후 다시 시도해 주세요.' })
          .catch(() => undefined);
      }
    } finally {
      controller.abort();
      await iterator.return(undefined);
      response.off('close', abort);
      if (response.headersSent && !response.destroyed && !response.writableEnded) response.end();
    }
  }
}
