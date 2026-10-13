import { Controller, Get, Param, Query } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { PlayerMatchesResponse, PlayerMatchesService } from './player-matches.service';

@Controller('v1/players')
export class PlayerMatchesController {
  constructor(private readonly service: PlayerMatchesService) {}

  @Get(':nickname/matches')
  @RateLimit(30, 60)
  getMatches(
    @Param('nickname') nickname: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<PlayerMatchesResponse> {
    return this.service.getMatches(nickname, limit, cursor);
  }
}
