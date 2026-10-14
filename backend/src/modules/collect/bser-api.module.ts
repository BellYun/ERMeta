import { Module } from '@nestjs/common';
import { BserApiService } from './bser-api.service';

@Module({
  providers: [BserApiService],
  exports: [BserApiService],
})
export class BserApiModule {}
