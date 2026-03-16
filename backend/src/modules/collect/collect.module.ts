import { Module } from '@nestjs/common';
import { CharacterModule } from '../character/character.module';
import { StatsModule } from '../stats/stats.module';
import { MetaModule } from '../meta/meta.module';
import { CollectService } from './collect.service';
import { BserApiService } from './bser-api.service';
import { ParserService } from './parser.service';
import { CacheWarmingService } from './cache-warming.service';

@Module({
  imports: [CharacterModule, StatsModule, MetaModule],
  providers: [CollectService, BserApiService, ParserService, CacheWarmingService],
})
export class CollectModule {}
