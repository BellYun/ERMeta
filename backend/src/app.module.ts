import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SupabaseModule } from './common/database/supabase.module';
import { RedisModule } from './common/redis/redis.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './modules/health/health.controller';
import { PatchesModule } from './modules/patches/patches.module';
import { CharacterModule } from './modules/character/character.module';
import { BuildsModule } from './modules/builds/builds.module';
import { MetaModule } from './modules/meta/meta.module';
import { StatsModule } from './modules/stats/stats.module';
import { ItemsModule } from './modules/items/items.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { CollectModule } from './modules/collect/collect.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../frontend/.env'],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    SupabaseModule,
    RedisModule,
    PatchesModule,
    CharacterModule,
    BuildsModule,
    MetaModule,
    StatsModule,
    ItemsModule,
    FeedbackModule,
    CollectModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
