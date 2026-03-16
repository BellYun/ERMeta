import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { RateLimit } from '../../common/guards/rate-limit.guard';

export class FeedbackDto {
  @IsString() @IsOptional() @MaxLength(100) category?: string;
  @IsString() @MaxLength(2000) message: string;
  @IsString() @IsOptional() @MaxLength(200) contact?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(201)
  @RateLimit(5, 60) // IP당 1분에 5회
  async submit(@Body() body: FeedbackDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? 'unknown';
    const userAgent = (req.headers['user-agent'] as string) ?? '';
    return this.feedbackService.submit(body, ip, userAgent);
  }
}
