import { Module } from '@nestjs/common';
import { SynergyPairsController } from './synergy-pairs.controller';
import { SynergyPairsService } from './synergy-pairs.service';

@Module({
  controllers: [SynergyPairsController],
  providers: [SynergyPairsService],
})
export class SynergyPairsModule {}
