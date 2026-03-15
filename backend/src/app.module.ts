import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './common/database/supabase.module';
import { RedisModule } from './common/redis/redis.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './modules/health/health.controller';
import { PatchesModule } from './modules/patches/patches.module';
import { CharacterModule } from './modules/character/character.module';
import { BuildsModule } from './modules/builds/builds.module';
import { MetaModule } from './modules/meta/meta.module';
import { StatsModule } from './modules/stats/stats.module';
import { ItemsModule } from './modules/items/items.module';
import { FeedbackModule } from './modules/feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../frontend/.env'],
    }),
    SupabaseModule,
    RedisModule,
    PatchesModule,
    CharacterModule,
    BuildsModule,
    MetaModule,
    StatsModule,
    ItemsModule,
    FeedbackModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
