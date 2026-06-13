import { Module } from '@nestjs/common';
import { CollectModule } from '../collect/collect.module';
import { MultiSearchController } from './multi-search.controller';
import { MultiSearchService } from './multi-search.service';

@Module({
  imports: [CollectModule],
  controllers: [MultiSearchController],
  providers: [MultiSearchService],
})
export class MultiSearchModule {}
