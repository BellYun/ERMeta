import { Module } from '@nestjs/common';
import { AIChatController } from './ai-chat.controller';
import { AIChatService } from './ai-chat.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  controllers: [AIChatController],
  providers: [AIChatService, GeminiProvider, OpenAIProvider],
  exports: [AIChatService],
})
export class AIChatModule {}
