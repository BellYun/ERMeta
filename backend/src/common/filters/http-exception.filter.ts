import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { error: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.' };

    const body =
      typeof message === 'string'
        ? { status, error: message, path: request.url }
        : { status, ...(message as object), path: request.url };

    if (status >= 500) {
      console.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error ? exception.message : exception,
      );
    }

    response.status(status).json(body);
  }
}
