import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { MetaService } from './meta.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

export class HoneyPicksQueryDto {
  @IsString() @IsOptional() patchVersion?: string;
  @IsString() @IsOptional() tier?: string = 'DIAMOND';
}

export class HomeStatsQueryDto {
  @IsString() @IsOptional() patchVersion?: string;
}

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('honey-picks')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getHoneyPicks(@Query() query: HoneyPicksQueryDto): Promise<unknown> {
    return this.metaService.getHoneyPicks(
      query.patchVersion,
      query.tier ?? 'DIAMOND',
    );
  }

  @Get('home-stats')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getHomeStats(@Query() query: HomeStatsQueryDto): Promise<unknown> {
    return this.metaService.getHomeStats(query.patchVersion);
  }
}
