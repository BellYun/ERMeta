import { Module } from '@nestjs/common';
import { PlayerHistoryDatabaseModule } from '../../common/database/player-history-database.module';
import { BserApiModule } from '../collect/bser-api.module';
import { PlayerSeasonStatsController } from './player-season-stats.controller';
import { PlayerSeasonStatsRepository } from './player-season-stats.repository';
import { PlayerSeasonStatsService } from './player-season-stats.service';

@Module({
  imports: [PlayerHistoryDatabaseModule, BserApiModule],
  controllers: [PlayerSeasonStatsController],
  providers: [PlayerSeasonStatsRepository, PlayerSeasonStatsService],
  exports: [PlayerSeasonStatsService],
})
export class PlayerSeasonStatsModule {}
