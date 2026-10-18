import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PlayerHistoryDatabaseModule } from '../common/database/player-history-database.module';
import { PlayerCompareModule } from '../modules/player-compare/player-compare.module';
import { PlayerMatchesModule } from '../modules/player-matches/player-matches.module';
import { PlayerRefreshModule } from '../modules/player-refresh/player-refresh.module';
import { PlayerSeasonStatsModule } from '../modules/player-season-stats/player-season-stats.module';
import { PlayerApiHealthController } from './player-api-health.controller';
import { PlayerRateLimitGuard } from './player-rate-limit.guard';
import { PlayerRetryAfterInterceptor } from './player-retry-after.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    PlayerHistoryDatabaseModule,
    PlayerMatchesModule,
    PlayerSeasonStatsModule,
    PlayerCompareModule,
    PlayerRefreshModule,
  ],
  controllers: [PlayerApiHealthController],
  providers: [
    { provide: APP_GUARD, useClass: PlayerRateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: PlayerRetryAfterInterceptor },
  ],
})
export class PlayerApiModule {}
