import { Module } from '@nestjs/common';
import { PlayerHistoryDatabaseModule } from '../../common/database/player-history-database.module';
import { BserApiService } from './bser-api.service';
import { PlayerNicknameAbsencesRepository } from './player-nickname-absences.repository';

@Module({
  imports: [PlayerHistoryDatabaseModule],
  providers: [BserApiService, PlayerNicknameAbsencesRepository],
  exports: [BserApiService],
})
export class BserApiModule {}
