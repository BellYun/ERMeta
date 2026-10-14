import { Module } from '@nestjs/common';
import { PlayerSeasonStatsModule } from '../player-season-stats/player-season-stats.module';
import { PlayerCompareController } from './player-compare.controller';
import { PlayerCompareService } from './player-compare.service';

@Module({
  imports: [PlayerSeasonStatsModule],
  controllers: [PlayerCompareController],
  providers: [PlayerCompareService],
})
export class PlayerCompareModule {}
