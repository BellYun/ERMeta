import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';

export class FeedbackDto {
  @IsString() @IsOptional() category?: string;
  @IsString() message: string;
  @IsString() @IsOptional() contact?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(201)
  async submit(@Body() body: FeedbackDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? 'unknown';
    const userAgent = (req.headers['user-agent'] as string) ?? '';
    return this.feedbackService.submit(body, ip, userAgent);
  }
}
