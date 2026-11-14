import { Module } from '@nestjs/common';
import { AIChatController } from './ai-chat.controller';
import { AIChatService } from './ai-chat.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { MetaModule } from '../meta/meta.module';
import { CharacterModule } from '../character/character.module';
import { SupabaseModule } from '../../common/database/supabase.module';
import { RedisModule } from '../../common/redis/redis.module';
import { MemoryService } from './services/memory.service';
import { ContextBuilderService } from './services/context-builder.service';

@Module({
  imports: [MetaModule, CharacterModule, SupabaseModule, RedisModule],
  controllers: [AIChatController],
  providers: [AIChatService, GeminiProvider, OpenAIProvider, MemoryService, ContextBuilderService],
  exports: [AIChatService, MemoryService, ContextBuilderService],
})
export class AIChatModule {}
