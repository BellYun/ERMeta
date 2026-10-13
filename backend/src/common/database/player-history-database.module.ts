import { Module } from '@nestjs/common';
import { PlayerHistoryDatabaseService } from './player-history-database.service';

@Module({
  providers: [PlayerHistoryDatabaseService],
  exports: [PlayerHistoryDatabaseService],
})
export class PlayerHistoryDatabaseModule {}
