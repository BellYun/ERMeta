import { Module } from '@nestjs/common';
import { PlayerMatchesModule } from '../player-matches/player-matches.module';
import { PlayerSeasonStatsModule } from '../player-season-stats/player-season-stats.module';
import { PlayerRefreshController } from './player-refresh.controller';
import { PlayerRefreshRateLimitGuard } from './player-refresh-rate-limit.guard';
import { PlayerRefreshService } from './player-refresh.service';

@Module({
  imports: [PlayerMatchesModule, PlayerSeasonStatsModule],
  controllers: [PlayerRefreshController],
  providers: [PlayerRefreshService, PlayerRefreshRateLimitGuard],
})
export class PlayerRefreshModule {}
