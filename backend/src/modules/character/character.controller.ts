import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CharacterService } from './character.service';
import { RankingQueryDto, CharacterStatsQueryDto, CharacterInsightQueryDto } from './dto/ranking-query.dto';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get('ranking')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getRanking(@Query() query: RankingQueryDto) {
    return this.characterService.fetchRankingData(
      query.patchVersion ?? '',
      query.tier ?? 'DIAMOND',
    );
  }

  @Get('stats/:characterCode')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getStats(
    @Param('characterCode') characterCode: string,
    @Query() query: CharacterStatsQueryDto,
  ) {
    return this.characterService.getCharacterStats(
      parseInt(characterCode, 10),
      query.patchVersion ?? '',
      query.tier ?? 'DIAMOND_PLUS',
    );
  }

  @Get('insights/:characterCode')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getInsights(
    @Param('characterCode') characterCode: string,
    @Query() query: CharacterInsightQueryDto,
  ): Promise<unknown> {
    return this.characterService.getCharacterInsight(
      parseInt(characterCode, 10),
      query.patchVersion ?? '',
      query.tier ?? 'DIAMOND_PLUS',
      query.locale ?? 'ko',
    );
  }
}
