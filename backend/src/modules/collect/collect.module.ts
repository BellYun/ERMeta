import { Module } from '@nestjs/common';
import { CharacterModule } from '../character/character.module';
import { StatsModule } from '../stats/stats.module';
import { MetaModule } from '../meta/meta.module';
import { CollectService } from './collect.service';
import { BserApiModule } from './bser-api.module';
import { ParserService } from './parser.service';
import { CacheWarmingService } from './cache-warming.service';

@Module({
  imports: [CharacterModule, StatsModule, MetaModule, BserApiModule],
  providers: [CollectService, ParserService, CacheWarmingService],
  exports: [BserApiModule],
})
export class CollectModule {}
