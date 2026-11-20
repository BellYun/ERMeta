import { Controller, Get, Param, Query } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import {
  PlayerMatchDetailResponse,
  PlayerMatchesResponse,
  PlayerMatchStatsResponse,
  PlayerMatchesService,
} from './player-matches.service';

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

  @Get(':nickname/matches/:gameId')
  @RateLimit(30, 60)
  getMatchDetail(
    @Param('nickname') nickname: string,
    @Param('gameId') gameId: string,
  ): Promise<PlayerMatchDetailResponse> {
    return this.service.getMatchDetail(nickname, gameId);
  }

  @Get(':nickname/match-stats')
  @RateLimit(30, 60)
  getMatchStats(
    @Param('nickname') nickname: string,
    @Query('seasonId') seasonId?: string,
    @Query('matchingMode') matchingMode?: string,
  ): Promise<PlayerMatchStatsResponse> {
    return this.service.getMatchStats(nickname, seasonId, matchingMode);
  }
}
