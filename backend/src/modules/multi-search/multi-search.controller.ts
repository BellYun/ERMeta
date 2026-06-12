import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { MultiSearchPlayersDto } from './dto/multi-search-players.dto';
import { MultiSearchService } from './multi-search.service';

@Controller('multi-search')
export class MultiSearchController {
  constructor(private readonly multiSearchService: MultiSearchService) {}

  @Post('players')
  @HttpCode(200)
  searchPlayers(@Body() body: MultiSearchPlayersDto): Promise<unknown> {
    return this.multiSearchService.searchPlayers(body.nicknames, body.seasonId, body.matchingMode);
  }
}
