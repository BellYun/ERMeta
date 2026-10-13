import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { MultiSearchPlayersDto } from './dto/multi-search-players.dto';
import { RecentMatchesQueryDto } from './dto/recent-matches-query.dto';
import {
  MultiSearchPlayersResponse,
  MultiSearchService,
  RecentMatchesResponse,
} from './multi-search.service';

@Controller('multi-search')
export class MultiSearchController {
  constructor(private readonly multiSearchService: MultiSearchService) {}

  @Get('recent-matches')
  @RateLimit(20, 60)
  getRecentMatches(
    @Query() query: RecentMatchesQueryDto,
  ): Promise<RecentMatchesResponse> {
    return this.multiSearchService.searchRecentMatches(
      query.nickname,
      query.limit,
    );
  }

  @Post('players')
  @HttpCode(200)
  @RateLimit(30, 60)
  searchPlayers(
    @Body() body: MultiSearchPlayersDto,
  ): Promise<MultiSearchPlayersResponse> {
    return this.multiSearchService.searchPlayers(
      body.nicknames,
      body.seasonId,
      body.matchingMode,
    );
  }
}
