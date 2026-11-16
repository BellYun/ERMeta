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
import { PlayerSeasonStatsModule } from '../player-season-stats/player-season-stats.module';
import { GuardrailService } from './guards/guardrail.service';
import { MetricsService } from './services/metrics.service';
import { QuotaService } from './services/quota.service';

@Module({
  imports: [MetaModule, CharacterModule, SupabaseModule, RedisModule, PlayerSeasonStatsModule],
  controllers: [AIChatController],
  providers: [AIChatService, GeminiProvider, OpenAIProvider, MemoryService, ContextBuilderService,
    GuardrailService, MetricsService, QuotaService],
  exports: [AIChatService, MemoryService, ContextBuilderService],
})
export class AIChatModule {}
