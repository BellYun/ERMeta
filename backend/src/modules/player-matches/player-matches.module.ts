import { Module } from '@nestjs/common';
import { PlayerHistoryDatabaseModule } from '../../common/database/player-history-database.module';
import { CollectModule } from '../collect/collect.module';
import { PlayerMatchesController } from './player-matches.controller';
import { PlayerMatchesRepository } from './player-matches.repository';
import { PlayerMatchesService } from './player-matches.service';

@Module({
  imports: [PlayerHistoryDatabaseModule, CollectModule],
  controllers: [PlayerMatchesController],
  providers: [PlayerMatchesRepository, PlayerMatchesService],
})
export class PlayerMatchesModule {}
