import { Module } from '@nestjs/common';
import { PlayerHistoryDatabaseModule } from '../../common/database/player-history-database.module';
import { BserApiModule } from '../collect/bser-api.module';
import { PlayerMatchesController } from './player-matches.controller';
import { PlayerMatchesRepository } from './player-matches.repository';
import { PlayerMatchesService } from './player-matches.service';

@Module({
  imports: [PlayerHistoryDatabaseModule, BserApiModule],
  controllers: [PlayerMatchesController],
  providers: [PlayerMatchesRepository, PlayerMatchesService],
})
export class PlayerMatchesModule {}
