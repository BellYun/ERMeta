import { Controller, Get, Param, Query } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { PlayerSeasonStatsResponse, PlayerSeasonStatsService } from './player-season-stats.service';

@Controller('v1/players')
export class PlayerSeasonStatsController {
  constructor(private readonly service: PlayerSeasonStatsService) {}

  @Get(':nickname/stats')
  @RateLimit(30, 60)
  getStats(
    @Param('nickname') nickname: string,
    @Query('seasonId') seasonId?: string,
    @Query('matchingMode') matchingMode?: string,
  ): Promise<PlayerSeasonStatsResponse> {
    return this.service.getStats(nickname, seasonId, matchingMode);
  }
}
