import { Module } from '@nestjs/common';
import { PatchesController } from './patches.controller';
import { PatchesService } from './patches.service';

@Module({
  controllers: [PatchesController],
  providers: [PatchesService],
  exports: [PatchesService],
})
export class PatchesModule {}
