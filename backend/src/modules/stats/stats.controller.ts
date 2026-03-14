import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { IsString, IsOptional, IsNumberString } from 'class-validator';
import { StatsService } from './stats.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

export class TriosQueryDto {
  @IsString() @IsOptional() sortBy?: string = 'recommended';
  @IsNumberString() @IsOptional() limit?: string;
  @IsNumberString() @IsOptional() character1?: string;
  @IsNumberString() @IsOptional() character2?: string;
}

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('trios')
  @UseInterceptors(CacheControlInterceptor('frequent'))
  async getTrios(@Query() query: TriosQueryDto) {
    return this.statsService.getTrios(
      (query.sortBy ?? 'recommended') as 'averageRP' | 'winRate' | 'totalGames' | 'recommended',
      query.limit ? parseInt(query.limit, 10) : 100,
      query.character1 ? parseInt(query.character1, 10) : null,
      query.character2 ? parseInt(query.character2, 10) : null,
    );
  }
}
